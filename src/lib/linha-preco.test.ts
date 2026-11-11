import { describe, expect, it } from 'vitest';
import { paraPreco } from './linha-preco';

describe('paraPreco', () => {
	it('converte os numéricos que o Postgres devolve como texto e mantém mínimo e máximo nulos', () => {
		expect(paraPreco({ produto: 'etanol', preco_medio: '4.19', preco_min: null, preco_max: '4.59' }, 'uf')).toEqual({
			precoMedio: 4.19,
			precoMin: null,
			precoMax: 4.59,
			fonte: 'uf',
		});
	});
});
