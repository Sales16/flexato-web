import { describe, expect, it } from 'vitest';
import { afastarRotulos, escalaDePrecos, posicaoX, posicaoY } from './grafico';

function conferirEscala(valores: number[]) {
	const e = escalaDePrecos(valores)!;
	for (const v of valores) {
		expect(v).toBeGreaterThanOrEqual(e.min);
		expect(v).toBeLessThanOrEqual(e.max);
	}
	expect(e.marcas[0]).toBe(e.min);
	expect(e.marcas[e.marcas.length - 1]).toBe(e.max);
	for (let i = 1; i < e.marcas.length; i++) expect(e.marcas[i] - e.marcas[i - 1]).toBeCloseTo(e.passo, 6);
	return e;
}

describe('escalaDePrecos', () => {
	it('arredonda para passos legíveis que cobrem etanol e gasolina', () => {
		expect(conferirEscala([4.01, 6.35])).toEqual({ min: 4, max: 7, passo: 1, marcas: [4, 5, 6, 7] });
	});

	it('abre uma faixa mínima quando os preços quase não variam', () => {
		const e = conferirEscala([4.3, 4.35, 4.4]);
		expect(e.max - e.min).toBeGreaterThanOrEqual(0.2);
		expect(e.passo).toBe(0.05);
	});

	it('funciona com um único ponto', () => {
		const e = conferirEscala([4.01]);
		expect(e.min).toBeLessThan(4.01);
		expect(e.max).toBeGreaterThan(4.01);
	});

	it.each([[[3.99, 4.0, 4.01]], [[0.05, 0.07]], [[5.49, 8.97, 3.39, 5.99]], [[12.5, 13.1]]])('cobre os valores %j com marcas regulares', valores => {
		conferirEscala(valores);
	});

	it('nunca começa abaixo de zero', () => {
		expect(escalaDePrecos([0.01])!.min).toBe(0);
	});

	it('ignora valores não numéricos e devolve nulo sem dados', () => {
		expect(escalaDePrecos([])).toBeNull();
		expect(escalaDePrecos([Number.NaN])).toBeNull();
		expect(escalaDePrecos([Number.NaN, 4.5])).not.toBeNull();
	});
});

describe('posições', () => {
	it('mapeia o mínimo na base e o máximo no topo', () => {
		const escala = { min: 4, max: 7 };
		expect(posicaoY(4, escala, 10, 190)).toBe(190);
		expect(posicaoY(7, escala, 10, 190)).toBe(10);
		expect(posicaoY(5.5, escala, 10, 190)).toBe(100);
	});

	it('centraliza um ponto único e distribui vários de ponta a ponta', () => {
		expect(posicaoX(0, 1, 50, 450)).toBe(250);
		expect([0, 1, 2].map(i => posicaoX(i, 3, 50, 450))).toEqual([50, 250, 450]);
	});

	it('afasta rótulos sobrepostos sem sair da área', () => {
		expect(afastarRotulos([100, 105], 14, 0, 200)).toEqual([100, 114]);
		expect(afastarRotulos([105, 100], 14, 0, 200)).toEqual([114, 100]);
		expect(afastarRotulos([195, 198], 14, 0, 200)).toEqual([186, 200]);
		expect(afastarRotulos([20, 150], 14, 0, 200)).toEqual([20, 150]);
	});
});
