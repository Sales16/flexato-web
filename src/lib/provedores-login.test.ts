import { describe, expect, it } from 'vitest';
import { provedoresLogin } from './provedores-login';

describe('provedoresLogin', () => {
	it('lista Google e Apple, nessa ordem, quando os dois estão habilitados', () => {
		expect(provedoresLogin({ google: true, apple: true })).toEqual([
			{ id: 'google', rotulo: 'Continuar com Google' },
			{ id: 'apple', rotulo: 'Continuar com Apple' },
		]);
	});

	it('lista só o Google quando a Apple está desligada', () => {
		expect(provedoresLogin({ google: true, apple: false }).map(p => p.id)).toEqual(['google']);
	});

	it('lista só a Apple quando o Google está desligado', () => {
		expect(provedoresLogin({ google: false, apple: true }).map(p => p.id)).toEqual(['apple']);
	});

	it('fica vazia quando os dois estão desligados', () => {
		expect(provedoresLogin({ google: false, apple: false })).toEqual([]);
	});
});
