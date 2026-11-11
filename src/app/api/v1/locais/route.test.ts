import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/server', async importOriginal => ({ ...(await importOriginal<typeof import('next/server')>()), connection: vi.fn(async () => {}) }));
vi.mock('@/lib/supabase/servidor', () => ({ clientePublico: vi.fn(() => ({})) }));
vi.mock('@/lib/dados/precos', () => ({ listarLocais: vi.fn() }));

const { listarLocais } = await import('@/lib/dados/precos');
const { GET } = await import('./route');

beforeEach(() => {
	vi.mocked(listarLocais).mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/v1/locais', () => {
	it('retorna as UFs e municípios', async () => {
		const locais = { semana: { inicio: '2026-11-02', fim: '2026-11-08' }, ufs: [{ sigla: 'SP', nome: 'São Paulo', municipios: [] }] };
		vi.mocked(listarLocais).mockResolvedValue(locais as never);
		const resposta = await GET();
		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toEqual(locais);
	});

	it('retorna 500 no formato padrão quando o banco falha', async () => {
		vi.mocked(listarLocais).mockRejectedValue(new Error('falhou'));
		const resposta = await GET();
		expect(resposta.status).toBe(500);
		expect(await resposta.json()).toEqual({ erro: { codigo: 'erro_interno', mensagem: expect.any(String) } });
	});
});
