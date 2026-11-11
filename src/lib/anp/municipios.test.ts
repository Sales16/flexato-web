import { describe, expect, it } from 'vitest';
import { chaveComparacao, nomeLegivel } from './municipios';

describe('chaveComparacao', () => {
	it('casa o nome da ANP com o nome oficial do IBGE', () => {
		expect(chaveComparacao('SP', 'SANTA BARBARA D OESTE')).toBe(chaveComparacao('SP', "Santa Bárbara d'Oeste"));
		expect(chaveComparacao('SP', 'SAO PAULO')).toBe(chaveComparacao('SP', 'São Paulo'));
	});

	it('diferencia municípios homônimos de UFs diferentes', () => {
		expect(chaveComparacao('MG', 'BOM JESUS')).not.toBe(chaveComparacao('RS', 'BOM JESUS'));
	});
});

describe('nomeLegivel', () => {
	it('capitaliza e mantém preposições em minúsculas', () => {
		expect(nomeLegivel('RIO DE JANEIRO')).toBe('Rio de Janeiro');
		expect(nomeLegivel('SAO JOSE DOS CAMPOS')).toBe('Sao Jose dos Campos');
	});
});
