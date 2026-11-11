import { describe, expect, it } from 'vitest';
import { arredondar, dentroDoBrasil, lerCoordenadas } from './coordenadas';

describe('lerCoordenadas', () => {
	it('lê graus decimais com espaços', () => {
		expect(lerCoordenadas(' -23.55 ', '-46.63')).toEqual({ lat: -23.55, lng: -46.63 });
	});

	it.each([
		[null, '-46'],
		['', '-46'],
		['-23', ' '],
		['abc', '-46'],
		['-23,5', '-46'],
		['NaN', '-46'],
		['-90.1', '-46'],
		['-23', '180.5'],
	])('recusa %s, %s', (lat, lng) => {
		expect(lerCoordenadas(lat, lng)).toBeNull();
	});
});

describe('dentroDoBrasil', () => {
	it.each([
		['Monte Caburaí', 5.27, -60.21],
		['Chuí', -33.69, -53.46],
		['Mâncio Lima', -7.61, -72.9],
		['Fernando de Noronha', -3.85, -32.42],
		['São Paulo', -23.55, -46.63],
	])('aceita %s', (_, lat, lng) => {
		expect(dentroDoBrasil({ lat, lng })).toBe(true);
	});

	it.each([
		['Lisboa', 38.72, -9.14],
		['Caracas', 10.48, -66.9],
		['Cidade do Cabo', -33.92, 18.42],
		['Montevidéu ao sul', -34.9, -56.16],
	])('recusa %s', (_, lat, lng) => {
		expect(dentroDoBrasil({ lat, lng })).toBe(false);
	});
});

describe('arredondar', () => {
	it('mantém 4 casas por padrão', () => {
		expect(arredondar({ lat: -23.550519, lng: -46.633309 })).toEqual({ lat: -23.5505, lng: -46.6333 });
	});
});
