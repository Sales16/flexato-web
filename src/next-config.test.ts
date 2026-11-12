import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
	vi.resetModules();
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('next.config', () => {
	it('carrega com as flags ausentes ou válidas', async () => {
		vi.stubEnv('NEXT_PUBLIC_LOGIN_GOOGLE_HABILITADO', undefined);
		vi.stubEnv('NEXT_PUBLIC_LOGIN_APPLE_HABILITADO', 'false');
		vi.stubEnv('JOB_PRECOS_ANP_HABILITADO', 'sim');
		await expect(import('../next.config')).resolves.toHaveProperty('default');
	});

	it.each(['NEXT_PUBLIC_LOGIN_GOOGLE_HABILITADO', 'NEXT_PUBLIC_LOGIN_APPLE_HABILITADO', 'JOB_PRECOS_ANP_HABILITADO'])(
		'quebra o build quando %s tem valor desconhecido',
		async nome => {
			vi.stubEnv(nome, 'desligado');
			await expect(import('../next.config')).rejects.toThrow(`Valor inválido para ${nome}`);
		}
	);
});
