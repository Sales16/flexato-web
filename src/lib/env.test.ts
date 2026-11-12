import { afterEach, describe, expect, it, vi } from 'vitest';
import { jobPrecosAnpHabilitado, lerFlag, loginAppleHabilitado, loginGoogleHabilitado } from './env';

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('lerFlag', () => {
	it('usa o padrão quando a variável não existe ou está vazia', () => {
		expect(lerFlag('FLAG', undefined)).toBe(true);
		expect(lerFlag('FLAG', '  ')).toBe(true);
		expect(lerFlag('FLAG', undefined, false)).toBe(false);
	});

	it.each(['false', 'FALSE', '0', 'nao', 'não', 'off', ' false '])('desliga com %j', valor => {
		expect(lerFlag('FLAG', valor)).toBe(false);
	});

	it.each(['true', 'TRUE', '1', 'sim', 'on', ' true '])('liga com %j', valor => {
		expect(lerFlag('FLAG', valor, false)).toBe(true);
	});

	it.each(['desligado', 'no', 'disabled', 'flase', 'yes'])('lança erro citando a variável com o valor desconhecido %j', valor => {
		expect(() => lerFlag('JOB_PRECOS_ANP_HABILITADO', valor)).toThrow(`Valor inválido para JOB_PRECOS_ANP_HABILITADO: "${valor}"`);
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

	it.each([
		['NEXT_PUBLIC_LOGIN_GOOGLE_HABILITADO', loginGoogleHabilitado],
		['NEXT_PUBLIC_LOGIN_APPLE_HABILITADO', loginAppleHabilitado],
		['JOB_PRECOS_ANP_HABILITADO', jobPrecosAnpHabilitado],
	])('%s com valor desconhecido lança erro com o nome da variável', (nome, flag) => {
		vi.stubEnv(nome, 'desligado');
		expect(() => flag()).toThrow(nome);
	});
});
