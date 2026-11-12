import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { criarSupabaseFalso, type Resolvedor } from '@/lib/testes/supabase-falso';

const estado = vi.hoisted(() => ({ falso: null as unknown as ReturnType<typeof criarSupabaseFalso> }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/servidor', () => ({ clientePublico: () => estado.falso.cliente }));

const { GET } = await import('./route');

const SEMANAS = [
	{ semana_inicio: '2026-11-01', semana_fim: '2026-11-07' },
	{ semana_inicio: '2026-10-25', semana_fim: '2026-10-31' },
	{ semana_inicio: '2026-10-18', semana_fim: '2026-10-24' },
];

const preco = (semana_fim: string, produto: string, preco_medio: string, extra: Record<string, unknown> = {}) => ({
	semana_fim,
	produto,
	preco_medio,
	preco_min: '4.000',
	preco_max: '5.000',
	...extra,
});

const LINHAS_UF = [
	preco('2026-10-24', 'etanol', '4.300'),
	preco('2026-10-31', 'etanol', '4.350'),
	preco('2026-11-07', 'etanol', '4.400'),
	preco('2026-10-24', 'gasolina', '6.200'),
	preco('2026-10-31', 'gasolina', '6.250'),
	preco('2026-11-07', 'gasolina', '6.300', { preco_min: null, preco_max: null }),
];

const LINHAS_MUNICIPIO = [
	preco('2026-11-07', 'etanol', '4.190', { municipio_nome: 'SÃO PAULO' }),
	preco('2026-10-31', 'etanol', '4.210', { municipio_nome: 'SÃO PAULO' }),
];

const padrao: Resolvedor = c => {
	if (c.tabela === 'importacoes_precos') {
		const limite = c.usou('limit')?.args[0] as number;
		return { data: SEMANAS.slice(0, limite), error: null };
	}
	if (c.tabela === 'precos_uf') return { data: LINHAS_UF, error: null };
	return { data: LINHAS_MUNICIPIO, error: null };
};

const requisicao = (consulta: string) => new NextRequest(`http://localhost/api/v1/precos/historico?${consulta}`);

describe('GET /api/v1/precos/historico', () => {
	beforeEach(() => {
		estado.falso = criarSupabaseFalso(padrao);
	});

	it('monta as séries da UF em ordem cronológica', async () => {
		const resposta = await GET(requisicao('uf=sp'));
		expect(resposta.status).toBe(200);
		const corpo = await resposta.json();
		expect(corpo.uf).toBe('SP');
		expect(corpo.municipio).toBeNull();
		expect(corpo.series.etanol.map((p: { precoMedio: number }) => p.precoMedio)).toEqual([4.3, 4.35, 4.4]);
		expect(corpo.series.gasolina[2]).toEqual({
			semana: { inicio: '2026-11-01', fim: '2026-11-07' },
			precoMedio: 6.3,
			precoMin: null,
			precoMax: null,
			fonte: 'uf',
		});
		expect(estado.falso.consultas.some(c => c.tabela === 'precos_municipio')).toBe(false);
	});

	it('usa o município quando há dado e cai para a UF semana a semana quando não há', async () => {
		const resposta = await GET(requisicao('uf=SP&municipio=São Paulo'));
		const corpo = await resposta.json();
		expect(corpo.municipio).toEqual({ chave: 'SAO PAULO', nome: 'SÃO PAULO' });
		expect(corpo.series.etanol.map((p: { precoMedio: number; fonte: string }) => [p.precoMedio, p.fonte])).toEqual([
			[4.3, 'uf'],
			[4.21, 'municipio'],
			[4.19, 'municipio'],
		]);
		expect(corpo.series.gasolina.every((p: { fonte: string }) => p.fonte === 'uf')).toBe(true);
		const consulta = estado.falso.consultas.find(c => c.tabela === 'precos_municipio')!;
		expect(consulta.chamadas.filter(c => c.metodo === 'eq').map(c => c.args)).toEqual([
			['uf', 'SP'],
			['municipio_chave', 'SAO PAULO'],
		]);
	});

	it('consulta UF e município em paralelo', async () => {
		let municipioJaConsultado = false;
		estado.falso = criarSupabaseFalso(c => {
			if (c.tabela === 'precos_uf') municipioJaConsultado = estado.falso.consultas.some(x => x.tabela === 'precos_municipio');
			return padrao(c);
		});
		expect((await GET(requisicao('uf=SP&municipio=São Paulo'))).status).toBe(200);
		expect(municipioJaConsultado).toBe(true);
	});

	it.each(['precos_uf', 'precos_municipio'])('retorna 500 quando a consulta de %s falha', async tabela => {
		const espiao = vi.spyOn(console, 'error').mockImplementation(() => {});
		estado.falso = criarSupabaseFalso(c => (c.tabela === tabela ? { data: null, error: new Error('falha') } : padrao(c)));
		expect((await GET(requisicao('uf=SP&municipio=São Paulo'))).status).toBe(500);
		espiao.mockRestore();
	});

	it('limita pelo número de semanas pedido e consulta só essas semanas', async () => {
		const resposta = await GET(requisicao('uf=SP&semanas=1'));
		const corpo = await resposta.json();
		expect(estado.falso.consultas[0].usou('limit')?.args).toEqual([1]);
		expect(estado.falso.consultas.find(c => c.tabela === 'precos_uf')!.usou('in')?.args).toEqual(['semana_fim', ['2026-11-07']]);
		expect(corpo.series.etanol).toHaveLength(1);
		expect(corpo.series.etanol[0].precoMedio).toBe(4.4);
	});

	it('usa 12 semanas por padrão', async () => {
		await GET(requisicao('uf=SP'));
		expect(estado.falso.consultas[0].usou('limit')?.args).toEqual([12]);
	});

	it('omite a semana em que não há preço nem do município nem da UF', async () => {
		estado.falso = criarSupabaseFalso(c =>
			c.tabela === 'precos_uf' ? { data: LINHAS_UF.filter(l => l.semana_fim !== '2026-10-31'), error: null } : padrao(c)
		);
		const corpo = await (await GET(requisicao('uf=SP'))).json();
		expect(corpo.series.gasolina.map((p: { semana: { fim: string } }) => p.semana.fim)).toEqual(['2026-10-24', '2026-11-07']);
	});

	it.each(['0', '105', '2.5', 'abc'])('retorna 400 para semanas=%s', async semanas => {
		const resposta = await GET(requisicao(`uf=SP&semanas=${semanas}`));
		expect(resposta.status).toBe(400);
		expect((await resposta.json()).erro.codigo).toBe('semanas_invalidas');
	});

	it('retorna 400 para UF inválida', async () => {
		const resposta = await GET(requisicao('uf=XX'));
		expect(resposta.status).toBe(400);
		expect((await resposta.json()).erro.codigo).toBe('uf_invalida');
	});

	it('retorna 404 quando nenhuma semana foi importada', async () => {
		estado.falso = criarSupabaseFalso(() => ({ data: [], error: null }));
		const resposta = await GET(requisicao('uf=SP'));
		expect(resposta.status).toBe(404);
		expect((await resposta.json()).erro.codigo).toBe('sem_dados');
	});

	it('retorna 500 quando o banco falha', async () => {
		const espiao = vi.spyOn(console, 'error').mockImplementation(() => {});
		estado.falso = criarSupabaseFalso(() => ({ data: null, error: new Error('falha') }));
		expect((await GET(requisicao('uf=SP'))).status).toBe(500);
		espiao.mockRestore();
	});
});
