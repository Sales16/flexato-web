import { describe, expect, it } from 'vitest';
import { posicaoNaFaixa } from './faixa-preco';

describe('posicaoNaFaixa', () => {
	it('posiciona proporcionalmente dentro da faixa, incluindo os extremos', () => {
		expect(posicaoNaFaixa(4, 4, 5)).toEqual({ percentual: 0, fora: null });
		expect(posicaoNaFaixa(4.5, 4, 5)).toEqual({ percentual: 50, fora: null });
		expect(posicaoNaFaixa(5, 4, 5)).toEqual({ percentual: 100, fora: null });
	});

	it('prende no extremo e indica quando o preço fica abaixo ou acima da faixa', () => {
		expect(posicaoNaFaixa(3.99, 4, 5)).toEqual({ percentual: 0, fora: 'abaixo' });
		expect(posicaoNaFaixa(5.01, 4, 5)).toEqual({ percentual: 100, fora: 'acima' });
	});
});
