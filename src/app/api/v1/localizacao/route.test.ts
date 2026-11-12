import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Resultado = { data: unknown; error: unknown };

const banco = vi.hoisted(() => ({
	rpc: vi.fn(),
	tabelas: {} as Record<string, Resultado>,
	filtros: [] as [string, string, unknown][],
}));

function consulta(tabela: string) {
	const construtor = {
		select: () => construtor,
		order: () => construtor,
		limit: () => construtor,
		eq: (coluna: string, valor: unknown) => {
			banco.filtros.push([tabela, coluna, valor]);
			return construtor;
		},
		maybeSingle: async () => banco.tabelas[tabela] ?? { data: null, error: null },
	};
	return construtor;
}

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/servidor', () => ({
	clienteAdmin: () => ({ rpc: banco.rpc }),
	clientePublico: () => ({ from: consulta }),
}));

const { GET } = await import('./route');

const requisicao = (parametros: string) => new NextRequest(`http://localhost/api/v1/localizacao${parametros}`);
const semana = { semana_inicio: '2026-11-02', semana_fim: '2026-11-08' };

beforeEach(() => {
	banco.rpc.mockReset();
	banco.tabelas = {};
	banco.filtros = [];
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/v1/localizacao', () => {
	it('devolve município e chave da ANP quando a cidade tem preço na semana mais recente', async () => {
		banco.rpc.mockResolvedValue({ data: [{ codigo: 3509502, nome: 'Campinas', uf: 'SP' }], error: null });
		banco.tabelas = { importacoes_precos: { data: semana, error: null }, precos_municipio: { data: { municipio_chave: 'CAMPINAS' }, error: null } };

		const resposta = await GET(requisicao('?lat=-22.9056&lng=-47.0608'));

		expect(resposta.status).toBe(200);
		expect(resposta.headers.get('cache-control')).toBe('private, no-store');
		expect(await resposta.json()).toEqual({
			uf: 'SP',
			semana: { inicio: '2026-11-02', fim: '2026-11-08' },
			municipio: { ibge: 3509502, nome: 'Campinas', chave: 'CAMPINAS' },
		});
		expect(banco.rpc).toHaveBeenCalledWith('municipio_por_ponto', { lat: -22.9056, lng: -47.0608 });
		expect(banco.filtros).toEqual([
			['precos_municipio', 'semana_fim', '2026-11-08'],
			['precos_municipio', 'uf', 'SP'],
			['precos_municipio', 'municipio_ibge', 3509502],
		]);
	});

	it('devolve chave nula quando a ANP não pesquisou a cidade', async () => {
		banco.rpc.mockResolvedValue({ data: [{ codigo: 3552205, nome: 'Sorocaba', uf: 'SP' }], error: null });
		banco.tabelas = { importacoes_precos: { data: semana, error: null } };

		const resposta = await GET(requisicao('?lat=-23.5&lng=-47.45'));

		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toEqual({
			uf: 'SP',
			semana: { inicio: '2026-11-02', fim: '2026-11-08' },
			municipio: { ibge: 3552205, nome: 'Sorocaba', chave: null },
		});
	});

	it('devolve chave nula quando ainda não há preços importados', async () => {
		banco.rpc.mockResolvedValue({ data: [{ codigo: 5300108, nome: 'Brasília', uf: 'DF' }], error: null });

		const resposta = await GET(requisicao('?lat=-15.79&lng=-47.88'));

		expect(await resposta.json()).toEqual({ uf: 'DF', semana: null, municipio: { ibge: 5300108, nome: 'Brasília', chave: null } });
		expect(banco.filtros).toEqual([]);
	});

	it.each(['', '?lat=-23.5', '?lng=-46.6', '?lat=&lng=', '?lat=abc&lng=-46.6', '?lat=-91&lng=-46.6', '?lat=-23.5&lng=181', '?lat=Infinity&lng=-46.6'])(
		'retorna 400 para coordenadas inválidas (%s)',
		async parametros => {
			const resposta = await GET(requisicao(parametros));
			expect(resposta.status).toBe(400);
			expect(await resposta.json()).toEqual({ erro: { codigo: 'coordenadas_invalidas', mensagem: expect.any(String) } });
			expect(banco.rpc).not.toHaveBeenCalled();
		}
	);

	it.each([
		['Lisboa', '?lat=38.72&lng=-9.14'],
		['Buenos Aires', '?lat=-34.6&lng=-58.4'],
		['oceano Pacífico', '?lat=-20&lng=-80'],
	])('retorna 404 fora_do_brasil sem consultar o banco (%s)', async (_, parametros) => {
		const resposta = await GET(requisicao(parametros));
		expect(resposta.status).toBe(404);
		expect((await resposta.json()).erro.codigo).toBe('fora_do_brasil');
		expect(banco.rpc).not.toHaveBeenCalled();
	});

	it('retorna 404 quando nenhum município contém o ponto', async () => {
		banco.rpc.mockResolvedValue({ data: [], error: null });

		const resposta = await GET(requisicao('?lat=-25&lng=-40'));

		expect(resposta.status).toBe(404);
		expect(await resposta.json()).toEqual({ erro: { codigo: 'municipio_nao_encontrado', mensagem: expect.any(String) } });
	});

	it('retorna 500 no formato padrão quando a RPC falha', async () => {
		banco.rpc.mockResolvedValue({ data: null, error: { message: 'function public.municipio_por_ponto does not exist' } });

		const resposta = await GET(requisicao('?lat=-23.55&lng=-46.63'));

		expect(resposta.status).toBe(500);
		expect(resposta.headers.get('cache-control')).toBe('private, no-store');
		expect((await resposta.json()).erro.codigo).toBe('erro_interno');
	});

	it('retorna 500 quando a busca de preços falha', async () => {
		banco.rpc.mockResolvedValue({ data: [{ codigo: 3550308, nome: 'São Paulo', uf: 'SP' }], error: null });
		banco.tabelas = { importacoes_precos: { data: null, error: { message: 'falhou' } } };

		const resposta = await GET(requisicao('?lat=-23.55&lng=-46.63'));

		expect(resposta.status).toBe(500);
	});
});

describe('limite de requisições da localização', () => {
	it('retorna 429 sem cache quando o IP passa do limite de leitura', async () => {
		const { LEITURA } = await import('@/lib/api/limite');
		const comIp = () => new NextRequest('http://localhost/api/v1/localizacao?lat=x&lng=y', { headers: { 'x-forwarded-for': '203.0.113.10' } });
		for (let i = 0; i < LEITURA.limite; i++) expect((await GET(comIp())).status).toBe(400);
		const resposta = await GET(comIp());
		expect(resposta.status).toBe(429);
		expect(resposta.headers.get('cache-control')).toBe('private, no-store');
		expect((await resposta.json()).erro.codigo).toBe('muitas_requisicoes');
	});
});
