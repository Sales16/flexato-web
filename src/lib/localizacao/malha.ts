export const QUALIDADES_MALHA = ['minima', 'intermediaria', 'maxima'] as const;
export type QualidadeMalha = (typeof QUALIDADES_MALHA)[number];

type Posicao = number[];
export type GeometriaMunicipio = { type: 'Polygon'; coordinates: Posicao[][] } | { type: 'MultiPolygon'; coordinates: Posicao[][][] };

export type FeicaoMalha = {
	type: 'Feature';
	geometry: GeometriaMunicipio | { type: string } | null;
	properties: { codarea?: string | number } | null;
};

export type ColecaoMalha = { type: 'FeatureCollection'; features: FeicaoMalha[] };

export type MunicipioLocalidade = { 'municipio-id': number; 'municipio-nome': string; 'UF-sigla': string };

export type MunicipioMalha = { codigo: number; nome: string; uf: string; geometria: GeometriaMunicipio };

export type ResultadoMontagem = {
	municipios: MunicipioMalha[];
	semNome: number[];
	semGeometria: number[];
	invalidos: string[];
};

export function urlMalhaMunicipal(qualidade: QualidadeMalha): string {
	const consulta = new URLSearchParams({ formato: 'application/vnd.geo+json', qualidade, intrarregiao: 'municipio' });
	return `https://servicodados.ibge.gov.br/api/v4/malhas/paises/BR?${consulta}`;
}

export const MINIMO_MUNICIPIOS = 5500;

export function conferirQuantidadeMunicipios(quantidade: number, forcar: boolean): void {
	if (quantidade === 0) throw new Error('Nenhum município para importar.');
	if (quantidade < MINIMO_MUNICIPIOS && !forcar)
		throw new Error(
			`A malha trouxe só ${quantidade} municípios, abaixo do mínimo esperado de ${MINIMO_MUNICIPIOS} (o Brasil tem 5.570). Use --forcar para importar mesmo assim.`
		);
}

export function ehQualidadeMalha(valor: string): valor is QualidadeMalha {
	return (QUALIDADES_MALHA as readonly string[]).includes(valor);
}

function ehGeometriaMunicipio(geometria: FeicaoMalha['geometry']): geometria is GeometriaMunicipio {
	return (
		geometria !== null &&
		(geometria.type === 'Polygon' || geometria.type === 'MultiPolygon') &&
		Array.isArray((geometria as GeometriaMunicipio).coordinates) &&
		(geometria as GeometriaMunicipio).coordinates.length > 0
	);
}

function codigoIbge(valor: string | number | undefined): number | null {
	const texto = String(valor ?? '').trim();
	return /^[1-5]\d{6}$/.test(texto) ? Number(texto) : null;
}

export function montarMunicipios(malha: ColecaoMalha, localidades: MunicipioLocalidade[]): ResultadoMontagem {
	if (malha?.type !== 'FeatureCollection' || !Array.isArray(malha.features)) throw new Error('A malha do IBGE não é um FeatureCollection.');

	const porCodigo = new Map(localidades.map(m => [m['municipio-id'], m]));
	const vistos = new Set<number>();
	const municipios: MunicipioMalha[] = [];
	const semNome: number[] = [];
	const invalidos: string[] = [];

	for (const feicao of malha.features) {
		const codigo = codigoIbge(feicao.properties?.codarea);
		if (codigo === null || !ehGeometriaMunicipio(feicao.geometry) || vistos.has(codigo)) {
			invalidos.push(String(feicao.properties?.codarea ?? '?'));
			continue;
		}
		vistos.add(codigo);
		const localidade = porCodigo.get(codigo);
		if (!localidade) {
			semNome.push(codigo);
			continue;
		}
		municipios.push({ codigo, nome: localidade['municipio-nome'], uf: localidade['UF-sigla'], geometria: feicao.geometry });
	}

	const semGeometria = localidades.map(m => m['municipio-id']).filter(c => !vistos.has(c));
	return { municipios, semNome, semGeometria, invalidos };
}
