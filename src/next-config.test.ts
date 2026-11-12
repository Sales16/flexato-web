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
});
