import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/servidor', () => ({ clientePublico: vi.fn(() => ({})) }));
vi.mock('@/lib/dados/precos', () => ({ buscarPrecos: vi.fn() }));

const { buscarPrecos } = await import('@/lib/dados/precos');
const { GET } = await import('./route');

const requisicao = (consulta: string) => new NextRequest(`http://localhost/api/v1/precos${consulta}`);

const precos = {
	semana: { inicio: '2026-11-02', fim: '2026-11-08' },
	uf: 'SP',
	municipio: { chave: 'SAO PAULO', nome: 'São Paulo' },
	precos: { etanol: { precoMedio: 4.39, precoMin: 3.99, precoMax: 4.89, fonte: 'municipio' } },
};

beforeEach(() => {
	vi.mocked(buscarPrecos).mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/v1/precos', () => {
	it('retorna os preços da cidade normalizando UF e município', async () => {
		vi.mocked(buscarPrecos).mockResolvedValue(precos as never);
		const resposta = await GET(requisicao('?uf=sp&municipio=S%C3%A3o%20%20Paulo'));
		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toEqual(precos);
		expect(buscarPrecos).toHaveBeenCalledWith(expect.anything(), 'SP', 'SAO PAULO');
	});

	it('busca só a UF quando não há município', async () => {
		vi.mocked(buscarPrecos).mockResolvedValue({ ...precos, municipio: null } as never);
		const resposta = await GET(requisicao('?uf=RJ'));
		expect(resposta.status).toBe(200);
		expect(buscarPrecos).toHaveBeenCalledWith(expect.anything(), 'RJ', null);
	});

	it.each(['', '?uf=XX', '?uf=', '?municipio=CAMPINAS'])('retorna 400 para UF inválida (%s)', async consulta => {
		const resposta = await GET(requisicao(consulta));
		expect(resposta.status).toBe(400);
		expect(await resposta.json()).toEqual({ erro: { codigo: 'uf_invalida', mensagem: expect.any(String) } });
		expect(buscarPrecos).not.toHaveBeenCalled();
	});

	it('retorna 404 quando ainda não há preços importados', async () => {
		vi.mocked(buscarPrecos).mockResolvedValue(null);
		const resposta = await GET(requisicao('?uf=SP'));
		expect(resposta.status).toBe(404);
		expect((await resposta.json()).erro.codigo).toBe('sem_dados');
	});

	it('retorna 500 no formato padrão quando o banco falha', async () => {
		vi.mocked(buscarPrecos).mockRejectedValue(new Error('falhou'));
		const resposta = await GET(requisicao('?uf=SP'));
		expect(resposta.status).toBe(500);
		expect((await resposta.json()).erro.codigo).toBe('erro_interno');
	});
});
