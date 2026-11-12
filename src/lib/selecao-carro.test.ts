import { describe, expect, it } from 'vitest';
import { selecaoDaEscolha, trocaDeSelecao } from './selecao-carro';

describe('selecaoDaEscolha', () => {
	it('monta a seleção a partir do tipo e do id do carro', () => {
		expect(selecaoDaEscolha({ tipo: 'catalogo', carro: { id: 7 } })).toBe('cat:7');
		expect(selecaoDaEscolha({ tipo: 'garagem', carro: { id: 'abc' } })).toBe('gar:abc');
		expect(selecaoDaEscolha({ tipo: 'outro' })).toBe('outro');
	});
});

describe('trocaDeSelecao', () => {
	it('não troca quando a escolha é a opção já selecionada, para não apagar os consumos digitados', () => {
		expect(trocaDeSelecao('outro', { tipo: 'outro' })).toBeNull();
		expect(trocaDeSelecao('cat:7', { tipo: 'catalogo', carro: { id: 7 } })).toBeNull();
		expect(trocaDeSelecao('gar:abc', { tipo: 'garagem', carro: { id: 'abc' } })).toBeNull();
	});

	it('troca quando a escolha é outra opção', () => {
		expect(trocaDeSelecao('outro', { tipo: 'catalogo', carro: { id: 7 } })).toBe('cat:7');
		expect(trocaDeSelecao('cat:7', { tipo: 'catalogo', carro: { id: 8 } })).toBe('cat:8');
		expect(trocaDeSelecao('gar:abc', { tipo: 'outro' })).toBe('outro');
	});
});
