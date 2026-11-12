import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/servidor', () => ({ clienteAdmin: vi.fn() }));
vi.mock('@/lib/anp/importar', () => ({ importarPrecosAnp: vi.fn() }));

const { clienteAdmin } = await import('@/lib/supabase/servidor');
const { importarPrecosAnp } = await import('@/lib/anp/importar');
const { GET } = await import('./route');

const SEGREDO = 'segredo-do-cron-de-teste';
const admin = { admin: true };

function requisicao(token: string | null, consulta = '') {
	return new NextRequest(`http://localhost/api/v1/jobs/precos-anp${consulta}`, { headers: token === null ? {} : { authorization: `Bearer ${token}` } });
}

beforeEach(() => {
	vi.resetAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.mocked(clienteAdmin).mockReturnValue(admin as never);
	vi.stubEnv('CRON_SECRET', SEGREDO);
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('GET /api/v1/jobs/precos-anp', () => {
	it('importa com o token correto', async () => {
		const resultado = { status: 'ja_importado', semanaFim: '2026-11-08', arquivoUrl: 'https://exemplo/arquivo.xlsx' } as const;
		vi.mocked(importarPrecosAnp).mockResolvedValue(resultado);
		const resposta = await GET(requisicao(SEGREDO));
		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toEqual(resultado);
		expect(importarPrecosAnp).toHaveBeenCalledWith(admin, { forcar: false });
	});

	it('repassa forcar=1', async () => {
		vi.mocked(importarPrecosAnp).mockResolvedValue({ status: 'ja_importado', semanaFim: '2026-11-08', arquivoUrl: 'x' });
		await GET(requisicao(SEGREDO, '?forcar=1'));
		expect(importarPrecosAnp).toHaveBeenCalledWith(admin, { forcar: true });
	});

	it.each([null, '', 'errado', `${SEGREDO}x`, SEGREDO.slice(1)])('retorna 401 para token inválido (%s)', async token => {
		const resposta = await GET(requisicao(token));
		expect(resposta.status).toBe(401);
		expect(await resposta.json()).toEqual({ erro: { codigo: 'nao_autorizado', mensagem: expect.any(String) } });
		expect(importarPrecosAnp).not.toHaveBeenCalled();
	});

	it('retorna 500 no formato padrão quando CRON_SECRET não está configurado', async () => {
		vi.stubEnv('CRON_SECRET', '');
		const resposta = await GET(requisicao(''));
		expect(resposta.status).toBe(500);
		expect((await resposta.json()).erro.codigo).toBe('erro_interno');
		expect(importarPrecosAnp).not.toHaveBeenCalled();
	});

	it('retorna 500 no formato padrão quando a importação falha', async () => {
		vi.mocked(importarPrecosAnp).mockRejectedValue(new Error('ANP fora do ar'));
		const resposta = await GET(requisicao(SEGREDO));
		expect(resposta.status).toBe(500);
		expect((await resposta.json()).erro.codigo).toBe('erro_interno');
	});

	it('não importa quando o job está desabilitado, mesmo com forcar=1', async () => {
		vi.stubEnv('JOB_PRECOS_ANP_HABILITADO', 'false');
		const resposta = await GET(requisicao(SEGREDO, '?forcar=1'));
		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toEqual({ status: 'desabilitado' });
		expect(importarPrecosAnp).not.toHaveBeenCalled();
	});

	it('exige o token mesmo com o job desabilitado', async () => {
		vi.stubEnv('JOB_PRECOS_ANP_HABILITADO', 'false');
		const resposta = await GET(requisicao('errado'));
		expect(resposta.status).toBe(401);
		expect(importarPrecosAnp).not.toHaveBeenCalled();
	});
});
