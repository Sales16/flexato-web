import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/server', async importOriginal => ({ ...(await importOriginal<typeof import('next/server')>()), connection: vi.fn(async () => {}) }));
vi.mock('@/lib/supabase/servidor', () => ({ clientePublico: vi.fn(() => ({})) }));
vi.mock('@/lib/dados/precos', () => ({ listarLocais: vi.fn() }));

const { listarLocais } = await import('@/lib/dados/precos');
const { GET } = await import('./route');
const { LEITURA } = await import('@/lib/api/limite');

const requisicao = (ip = '198.51.100.1') => new Request('http://localhost/api/v1/locais', { headers: { 'x-forwarded-for': ip } });

beforeEach(() => {
	vi.mocked(listarLocais).mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/v1/locais', () => {
	it('retorna as UFs e municípios', async () => {
		const locais = { semana: { inicio: '2026-11-02', fim: '2026-11-08' }, ufs: [{ sigla: 'SP', nome: 'São Paulo', municipios: [] }] };
		vi.mocked(listarLocais).mockResolvedValue(locais as never);
		const resposta = await GET(requisicao());
		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toEqual(locais);
	});

	it('retorna 500 no formato padrão quando o banco falha', async () => {
		vi.mocked(listarLocais).mockRejectedValue(new Error('falhou'));
		const resposta = await GET(requisicao());
		expect(resposta.status).toBe(500);
		expect(await resposta.json()).toEqual({ erro: { codigo: 'erro_interno', mensagem: expect.any(String) } });
	});

	it('retorna 429 com Retry-After quando o IP passa do limite de leitura', async () => {
		vi.mocked(listarLocais).mockResolvedValue({ semana: null, ufs: [] });
		const ip = '198.51.100.99';
		for (let i = 0; i < LEITURA.limite; i++) expect((await GET(requisicao(ip))).status).toBe(200);
		const resposta = await GET(requisicao(ip));
		expect(resposta.status).toBe(429);
		expect(resposta.headers.get('Retry-After')).toMatch(/^\d+$/);
		expect((await resposta.json()).erro.codigo).toBe('muitas_requisicoes');
		expect((await GET(requisicao('198.51.100.100'))).status).toBe(200);
	});
});
