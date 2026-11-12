import { beforeEach, describe, expect, it, vi } from 'vitest';
import { criarSupabaseFalso } from '@/lib/testes/supabase-falso';

const estado = vi.hoisted(() => ({ falso: null as unknown as ReturnType<typeof criarSupabaseFalso> }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/servidor', () => ({ clienteDoUsuario: () => estado.falso.cliente }));

const { PATCH } = await import('./route');

const CARRO = '3f0b8f5e-5a43-4a8e-9a39-1d2c3b4a5f60';

const LINHA = {
	id: CARRO,
	nome: 'Onix',
	catalogo_id: null,
	etanol_cidade: '9.2',
	etanol_estrada: '10.0',
	gasolina_cidade: '12.6',
	gasolina_estrada: '14.8',
	criado_em: '2026-11-11T00:00:00Z',
	atualizado_em: '2026-11-11T00:00:00Z',
};

const requisicao = (corpo: unknown) =>
	new Request(`http://localhost/api/v1/carros/${CARRO}`, {
		method: 'PATCH',
		headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
		body: JSON.stringify(corpo),
	});

const ctx = { params: Promise.resolve({ id: CARRO }) };

const atualizacao = () => estado.falso.consultas.find(c => c.tabela === 'carros')?.usou('update')?.args[0];

describe('PATCH /api/v1/carros/{id} com consumoTrecho', () => {
	beforeEach(() => {
		estado.falso = criarSupabaseFalso(() => ({ data: LINHA, error: null }));
	});

	it('atualiza só a coluna do combustível e trecho informados', async () => {
		const resposta = await PATCH(requisicao({ consumoTrecho: { combustivel: 'etanol', trecho: 'cidade', kmPorLitro: 9.2 } }), ctx);
		expect(resposta.status).toBe(200);
		expect((await resposta.json()).consumo.etanol.cidade).toBe(9.2);
		expect(atualizacao()).toEqual({ etanol_cidade: 9.2 });
	});

	it('mantém o PATCH com o consumo completo gravando as quatro colunas', async () => {
		const consumo = { etanol: { cidade: 9.2, estrada: 10 }, gasolina: { cidade: 12.6, estrada: 14.8 } };
		expect((await PATCH(requisicao({ consumo }), ctx)).status).toBe(200);
		expect(atualizacao()).toEqual({ etanol_cidade: 9.2, etanol_estrada: 10, gasolina_cidade: 12.6, gasolina_estrada: 14.8 });
	});

	it.each([
		['trecho misto', { consumoTrecho: { combustivel: 'etanol', trecho: 'misto', kmPorLitro: 9 } }],
		['combustível desconhecido', { consumoTrecho: { combustivel: 'diesel', trecho: 'cidade', kmPorLitro: 9 } }],
		['consumo zerado', { consumoTrecho: { combustivel: 'gasolina', trecho: 'estrada', kmPorLitro: 0 } }],
		[
			'consumo e consumoTrecho juntos',
			{
				consumo: { etanol: { cidade: 9, estrada: 10 }, gasolina: { cidade: 12, estrada: 14 } },
				consumoTrecho: { combustivel: 'etanol', trecho: 'cidade', kmPorLitro: 9 },
			},
		],
	])('retorna 422 para %s', async (_, corpo) => {
		const resposta = await PATCH(requisicao(corpo), ctx);
		expect(resposta.status).toBe(422);
		expect((await resposta.json()).erro.codigo).toBe('dados_invalidos');
		expect(estado.falso.consultas).toHaveLength(0);
	});
});
