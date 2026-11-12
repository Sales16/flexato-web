import { afterEach, describe, expect, it, vi } from 'vitest';
import { jobPrecosAnpHabilitado, lerFlag, loginAppleHabilitado, loginGoogleHabilitado } from './env';

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('lerFlag', () => {
	it('usa o padrão quando a variável não existe ou está vazia', () => {
		expect(lerFlag(undefined)).toBe(true);
		expect(lerFlag('  ')).toBe(true);
		expect(lerFlag(undefined, false)).toBe(false);
	});

	it.each(['false', 'FALSE', '0', 'nao', 'não', 'off', ' false '])('desliga com %j', valor => {
		expect(lerFlag(valor)).toBe(false);
	});

	it.each(['true', '1', 'sim', 'on'])('liga com %j', valor => {
		expect(lerFlag(valor, false)).toBe(true);
	});
});

describe('flags de configuração', () => {
	it('ficam habilitadas quando as variáveis não existem', () => {
		vi.stubEnv('NEXT_PUBLIC_LOGIN_GOOGLE_HABILITADO', undefined);
		vi.stubEnv('NEXT_PUBLIC_LOGIN_APPLE_HABILITADO', undefined);
		vi.stubEnv('JOB_PRECOS_ANP_HABILITADO', undefined);
		expect(loginGoogleHabilitado()).toBe(true);
		expect(loginAppleHabilitado()).toBe(true);
		expect(jobPrecosAnpHabilitado()).toBe(true);
	});

	it('cada flag desliga só a sua configuração', () => {
		vi.stubEnv('NEXT_PUBLIC_LOGIN_GOOGLE_HABILITADO', 'false');
		vi.stubEnv('NEXT_PUBLIC_LOGIN_APPLE_HABILITADO', 'true');
		vi.stubEnv('JOB_PRECOS_ANP_HABILITADO', '0');
		expect(loginGoogleHabilitado()).toBe(false);
		expect(loginAppleHabilitado()).toBe(true);
		expect(jobPrecosAnpHabilitado()).toBe(false);
	});
});
