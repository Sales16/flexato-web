import { afterEach, describe, expect, it, vi } from 'vitest';

async function carregar() {
	vi.resetModules();
	return (await import('../next.config')).default;
}

async function politicaConteudo() {
	const [{ headers }] = (await (await carregar()).headers?.()) ?? [];
	return headers.find(cabecalho => cabecalho.key === 'Content-Security-Policy')?.value;
}

afterEach(() => vi.unstubAllEnvs());

describe('next.config', () => {
	it('carrega com as flags ausentes ou válidas', async () => {
		vi.stubEnv('VERCEL_ENV', '');
		vi.stubEnv('NEXT_PUBLIC_LOGIN_GOOGLE_HABILITADO', undefined);
		vi.stubEnv('NEXT_PUBLIC_LOGIN_APPLE_HABILITADO', 'false');
		vi.stubEnv('JOB_PRECOS_ANP_HABILITADO', 'sim');
		await expect(carregar()).resolves.toBeDefined();
	});

	it.each(['NEXT_PUBLIC_LOGIN_GOOGLE_HABILITADO', 'NEXT_PUBLIC_LOGIN_APPLE_HABILITADO', 'JOB_PRECOS_ANP_HABILITADO'])(
		'quebra o build quando %s tem valor desconhecido',
		async nome => {
			vi.stubEnv(nome, 'desligado');
			await expect(carregar()).rejects.toThrow(`Valor inválido para ${nome}`);
		}
	);

	it('libera a origem do Supabase no connect-src', async () => {
		vi.stubEnv('VERCEL_ENV', 'production');
		vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co/rest/v1');
		expect(await politicaConteudo()).toContain("connect-src 'self' https://abc.supabase.co;");
	});

	it.each(['', 'nao-e-url', 'localhost:54321'])('falha no build de produção da Vercel com NEXT_PUBLIC_SUPABASE_URL inválida (%j)', async url => {
		vi.stubEnv('VERCEL_ENV', 'production');
		vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
		await expect(carregar()).rejects.toThrow('NEXT_PUBLIC_SUPABASE_URL');
	});

	it.each(['', 'preview'])('fora da produção da Vercel (VERCEL_ENV=%j) segue só com self no connect-src', async ambiente => {
		vi.stubEnv('VERCEL_ENV', ambiente);
		vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
		expect(await politicaConteudo()).toContain("connect-src 'self';");
	});

	it('quebra o build de produção com flag inválida mesmo com a URL do Supabase válida', async () => {
		vi.stubEnv('VERCEL_ENV', 'production');
		vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co');
		vi.stubEnv('JOB_PRECOS_ANP_HABILITADO', 'talvez');
		await expect(carregar()).rejects.toThrow('Valor inválido para JOB_PRECOS_ANP_HABILITADO');
	});
});
