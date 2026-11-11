import { describe, expect, it } from 'vitest';
import { emLotes, ehQualidadeMalha, montarMunicipios, urlMalhaMunicipal, type ColecaoMalha, type FeicaoMalha, type MunicipioLocalidade } from './malha';

const quadrado = {
	type: 'Polygon' as const,
	coordinates: [
		[
			[-46.8, -23.7],
			[-46.4, -23.7],
			[-46.4, -23.4],
			[-46.8, -23.4],
			[-46.8, -23.7],
		],
	],
};
const ilhas = { type: 'MultiPolygon' as const, coordinates: [quadrado.coordinates, quadrado.coordinates] };

const feicao = (codarea: string | number | undefined, geometry: FeicaoMalha['geometry'] = quadrado): FeicaoMalha => ({
	type: 'Feature',
	geometry,
	properties: codarea === undefined ? null : { codarea },
});

const colecao = (...features: FeicaoMalha[]): ColecaoMalha => ({ type: 'FeatureCollection', features });

const localidades: MunicipioLocalidade[] = [
	{ 'municipio-id': 3550308, 'municipio-nome': 'São Paulo', 'UF-sigla': 'SP' },
	{ 'municipio-id': 2605459, 'municipio-nome': 'Fernando de Noronha', 'UF-sigla': 'PE' },
	{ 'municipio-id': 5300108, 'municipio-nome': 'Brasília', 'UF-sigla': 'DF' },
];

describe('urlMalhaMunicipal', () => {
	it('monta a URL da API de malhas v4 com GeoJSON e divisão por município', () => {
		const url = new URL(urlMalhaMunicipal('intermediaria'));
		expect(url.origin + url.pathname).toBe('https://servicodados.ibge.gov.br/api/v4/malhas/paises/BR');
		expect(url.searchParams.get('formato')).toBe('application/vnd.geo+json');
		expect(url.searchParams.get('qualidade')).toBe('intermediaria');
		expect(url.searchParams.get('intrarregiao')).toBe('municipio');
	});

	it('reconhece só as qualidades aceitas pela API', () => {
		expect(ehQualidadeMalha('minima')).toBe(true);
		expect(ehQualidadeMalha('maxima')).toBe(true);
		expect(ehQualidadeMalha('alta')).toBe(false);
	});
});

describe('montarMunicipios', () => {
	it('junta a geometria da malha com nome e UF da API de localidades', () => {
		const { municipios, semNome, semGeometria, invalidos } = montarMunicipios(colecao(feicao('3550308'), feicao(2605459, ilhas)), localidades);
		expect(municipios).toEqual([
			{ codigo: 3550308, nome: 'São Paulo', uf: 'SP', geometria: quadrado },
			{ codigo: 2605459, nome: 'Fernando de Noronha', uf: 'PE', geometria: ilhas },
		]);
		expect(semNome).toEqual([]);
		expect(semGeometria).toEqual([5300108]);
		expect(invalidos).toEqual([]);
	});

	it('separa municípios da malha que não existem na lista de localidades', () => {
		const { municipios, semNome } = montarMunicipios(colecao(feicao('5101837'), feicao('3550308')), localidades);
		expect(municipios.map(m => m.codigo)).toEqual([3550308]);
		expect(semNome).toEqual([5101837]);
	});

	it('descarta feições sem código IBGE válido, sem polígono ou repetidas', () => {
		const { municipios, invalidos } = montarMunicipios(
			colecao(
				feicao(undefined),
				feicao('123'),
				feicao('9999999'),
				feicao('3550308', { type: 'Point' }),
				feicao('3550308', null),
				feicao('5300108', { type: 'Polygon', coordinates: [] } as never),
				feicao('3550308'),
				feicao('3550308')
			),
			localidades
		);
		expect(municipios.map(m => m.codigo)).toEqual([3550308]);
		expect(invalidos).toEqual(['?', '123', '9999999', '3550308', '3550308', '5300108', '3550308']);
	});

	it('falha quando a resposta não é um FeatureCollection', () => {
		expect(() => montarMunicipios({ type: 'Feature' } as never, localidades)).toThrow(/FeatureCollection/);
	});
});

describe('emLotes', () => {
	it('divide a lista em lotes do tamanho pedido', () => {
		expect(emLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
		expect(emLotes([], 3)).toEqual([]);
	});

	it('recusa tamanho inválido', () => {
		expect(() => emLotes([1], 0)).toThrow();
	});
});
