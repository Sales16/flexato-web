import { describe, expect, it } from 'vitest';
import { decimalParaCampo, lerDecimal, lerInteiro, reais } from './formato';

describe('lerDecimal', () => {
	it('aceita vírgula ou ponto como separador decimal', () => {
		expect(lerDecimal('8,4')).toBe(8.4);
		expect(lerDecimal('8.4')).toBe(8.4);
		expect(lerDecimal(' 4,399 ')).toBe(4.399);
		expect(lerDecimal('10,')).toBe(10);
	});

	it('rejeita vazio, zero, negativo e texto', () => {
		expect(lerDecimal('')).toBeNaN();
		expect(lerDecimal('0')).toBeNaN();
		expect(lerDecimal('-3')).toBeNaN();
		expect(lerDecimal('abc')).toBeNaN();
		expect(lerDecimal('1,2,3')).toBeNaN();
	});
});

describe('lerInteiro', () => {
	it('ignora separador de milhar', () => {
		expect(lerInteiro('1.200')).toBe(1200);
		expect(lerInteiro('52')).toBe(52);
	});

	it('rejeita decimais e texto', () => {
		expect(lerInteiro('1,5')).toBeNaN();
		expect(lerInteiro('')).toBeNaN();
	});
});

describe('formatação', () => {
	it('formata reais e campos no padrão brasileiro', () => {
		expect(reais(22.449)).toBe('R$ 22,45');
		expect(decimalParaCampo(8.4, 1)).toBe('8,4');
		expect(decimalParaCampo(null, 1)).toBe('');
	});
});
