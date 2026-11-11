import { beforeEach, describe, expect, it, vi } from 'vitest';
import { criarSupabaseFalso, type Resolvedor } from '@/lib/testes/supabase-falso';

const estado = vi.hoisted(() => ({ falso: null as unknown as ReturnType<typeof criarSupabaseFalso> }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/servidor', () => ({
	clienteDoUsuario: () => estado.falso.cliente,
	clientePublico: () => estado.falso.cliente,
}));

const { GET, POST } = await import('./route');
const { DELETE } = await import('./[abastecimentoId]/route');

const CARRO = '3f0b8f5e-5a43-4a8e-9a39-1d2c3b4a5f60';
const ABASTECIMENTO = '9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f';

function linha(parcial: Record<string, unknown>) {
	return {
		id: 'x',
		carro_id: CARRO,
		data: '2026-10-01',
		combustivel: 'etanol',
		litros: '40.00',
		hodometro_km: 10000,
		preco_litro: '4.390',
		tanque_cheio: true,
		trecho: null,
		criado_em: '2026-10-01T12:00:00Z',
		...parcial,
	};
}

function preparar(resolver: Resolvedor, usuarioId: string | null = 'usuario-1') {
	estado.falso = criarSupabaseFalso(resolver, usuarioId);
}

function requisicao(metodo: string, corpo?: unknown, token: string | null = 'token') {
	return new Request(`http://localhost/api/v1/carros/${CARRO}/abastecimentos`, {
		method: metodo,
		headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(corpo !== undefined ? { 'content-type': 'application/json' } : {}) },
		body: corpo === undefined ? undefined : JSON.stringify(corpo),
	});
}

const ctx = (id = CARRO) => ({ params: Promise.resolve({ id }) });
const ctxItem = (id = CARRO, abastecimentoId = ABASTECIMENTO) => ({ params: Promise.resolve({ id, abastecimentoId }) });

const carroDoUsuario: Resolvedor = c => (c.tabela === 'carros' ? { data: { id: CARRO }, error: null } : { data: [], error: null });

const valido = { data: '2026-10-10', combustivel: 'etanol', litros: 40, hodometroKm: 10360, precoLitro: 4.39, tanqueCheio: true, trecho: 'cidade' };

describe('GET /api/v1/carros/{id}/abastecimentos', () => {
	beforeEach(() => preparar(carroDoUsuario));

	it('exige token', async () => {
		const resposta = await GET(requisicao('GET', undefined, null), ctx());
		expect(resposta.status).toBe(401);
		expect((await resposta.json()).erro.codigo).toBe('nao_autenticado');
	});

	it('rejeita token que o Supabase não reconhece', async () => {
		preparar(carroDoUsuario, null);
		expect((await GET(requisicao('GET'), ctx())).status).toBe(401);
	});

	it('retorna 404 para id que não é uuid sem consultar o banco', async () => {
		const resposta = await GET(requisicao('GET'), ctx('abc'));
		expect(resposta.status).toBe(404);
		expect(estado.falso.consultas).toHaveLength(0);
	});

	it('retorna 404 quando o carro não é visível para o usuário (RLS)', async () => {
		preparar(() => ({ data: null, error: null }));
		const resposta = await GET(requisicao('GET'), ctx());
		expect(resposta.status).toBe(404);
		expect((await resposta.json()).erro.codigo).toBe('carro_nao_encontrado');
	});

	it('lista os abastecimentos do carro e calcula o consumo real', async () => {
		preparar(c =>
			c.tabela === 'carros'
				? { data: { id: CARRO }, error: null }
				: {
						data: [linha({ id: 'a1' }), linha({ id: 'a2', data: '2026-10-10', hodometro_km: 10360, preco_litro: null, trecho: 'cidade' })],
						error: null,
					}
		);
		const resposta = await GET(requisicao('GET'), ctx());
		expect(resposta.status).toBe(200);
		const corpo = await resposta.json();
		expect(corpo.itens).toHaveLength(2);
		expect(corpo.itens[0]).toMatchObject({ id: 'a1', carroId: CARRO, litros: 40, hodometroKm: 10000, precoLitro: 4.39, tanqueCheio: true, trecho: null });
		expect(corpo.itens[1].precoLitro).toBeNull();
		expect(corpo.consumoReal.medicoes).toEqual([{ combustivel: 'etanol', trecho: 'cidade', km: 360, litros: 40, kmPorLitro: 9, intervalos: 1 }]);
		const consulta = estado.falso.consultas.find(c => c.tabela === 'abastecimentos')!;
		expect(consulta.usou('eq')?.args).toEqual(['carro_id', CARRO]);
	});

	it('retorna 500 quando o banco falha', async () => {
		const espiao = vi.spyOn(console, 'error').mockImplementation(() => {});
		preparar(c => (c.tabela === 'carros' ? { data: { id: CARRO }, error: null } : { data: null, error: new Error('falha') }));
		expect((await GET(requisicao('GET'), ctx())).status).toBe(500);
		espiao.mockRestore();
	});
});

describe('POST /api/v1/carros/{id}/abastecimentos', () => {
	beforeEach(() =>
		preparar(c =>
			c.tabela === 'carros'
				? { data: { id: CARRO }, error: null }
				: { data: linha({ id: 'novo', data: '2026-10-10', hodometro_km: 10360, trecho: 'cidade' }), error: null }
		)
	);

	it('cria o abastecimento e devolve 201', async () => {
		const resposta = await POST(requisicao('POST', valido), ctx());
		expect(resposta.status).toBe(201);
		expect((await resposta.json()).id).toBe('novo');
		const insercao = estado.falso.consultas.find(c => c.tabela === 'abastecimentos')!.usou('insert');
		expect(insercao?.args[0]).toEqual({
			carro_id: CARRO,
			data: '2026-10-10',
			combustivel: 'etanol',
			litros: 40,
			hodometro_km: 10360,
			preco_litro: 4.39,
			tanque_cheio: true,
			trecho: 'cidade',
		});
	});

	it('grava preço e trecho nulos quando não informados', async () => {
		const semOpcionais = { ...valido, precoLitro: undefined, trecho: undefined };
		expect((await POST(requisicao('POST', semOpcionais), ctx())).status).toBe(201);
		const insercao = estado.falso.consultas.find(c => c.tabela === 'abastecimentos')!.usou('insert');
		expect(insercao?.args[0]).toMatchObject({ preco_litro: null, trecho: null });
	});

	it.each([
		['litros zero', { litros: 0 }, 'litros'],
		['hodômetro negativo', { hodometroKm: -1 }, 'hodometroKm'],
		['hodômetro fracionado', { hodometroKm: 10.5 }, 'hodometroKm'],
		['data inválida', { data: '2026-02-30' }, 'data'],
		['combustível desconhecido', { combustivel: 'diesel' }, 'combustivel'],
		['trecho desconhecido', { trecho: 'serra' }, 'trecho'],
		['sem tanque cheio', { tanqueCheio: undefined }, 'tanqueCheio'],
	])('retorna 422 para %s', async (_, alteracao, campo) => {
		const resposta = await POST(requisicao('POST', { ...valido, ...alteracao }), ctx());
		expect(resposta.status).toBe(422);
		const corpo = await resposta.json();
		expect(corpo.erro.codigo).toBe('dados_invalidos');
		expect(corpo.erro.detalhes[0]).toMatch(new RegExp(`^${campo}:`));
		expect(estado.falso.consultas).toHaveLength(0);
	});

	it('retorna 404 quando o carro é de outro usuário', async () => {
		preparar(() => ({ data: null, error: null }));
		const resposta = await POST(requisicao('POST', valido), ctx());
		expect(resposta.status).toBe(404);
		expect(estado.falso.consultas.some(c => c.tabela === 'abastecimentos')).toBe(false);
	});
});

describe('DELETE /api/v1/carros/{id}/abastecimentos/{abastecimentoId}', () => {
	it('remove filtrando pelo carro e devolve 204', async () => {
		preparar(() => ({ data: [{ id: ABASTECIMENTO }], error: null }));
		const resposta = await DELETE(requisicao('DELETE'), ctxItem());
		expect(resposta.status).toBe(204);
		const consulta = estado.falso.consultas[0];
		expect(consulta.tabela).toBe('abastecimentos');
		expect(consulta.chamadas.filter(c => c.metodo === 'eq').map(c => c.args)).toEqual([
			['id', ABASTECIMENTO],
			['carro_id', CARRO],
		]);
	});

	it('retorna 404 quando nada foi removido', async () => {
		preparar(() => ({ data: [], error: null }));
		const resposta = await DELETE(requisicao('DELETE'), ctxItem());
		expect(resposta.status).toBe(404);
		expect((await resposta.json()).erro.codigo).toBe('abastecimento_nao_encontrado');
	});

	it('retorna 404 para ids inválidos', async () => {
		preparar(() => ({ data: [], error: null }));
		expect((await DELETE(requisicao('DELETE'), ctxItem(CARRO, 'x'))).status).toBe(404);
		expect(estado.falso.consultas).toHaveLength(0);
	});

	it('exige token', async () => {
		preparar(() => ({ data: [], error: null }));
		expect((await DELETE(requisicao('DELETE', undefined, null), ctxItem())).status).toBe(401);
	});
});
