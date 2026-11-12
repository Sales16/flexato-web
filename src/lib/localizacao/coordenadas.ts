export type Coordenadas = { lat: number; lng: number };

export const LIMITES_BRASIL = { latMin: -34, latMax: 5.5, lngMin: -74.1, lngMax: -28.5 } as const;

function lerNumero(texto: string | null): number {
	if (texto === null || texto.trim() === '') return Number.NaN;
	return Number(texto.trim());
}

export function lerCoordenadas(lat: string | null, lng: string | null): Coordenadas | null {
	const coordenadas = { lat: lerNumero(lat), lng: lerNumero(lng) };
	if (!Number.isFinite(coordenadas.lat) || !Number.isFinite(coordenadas.lng)) return null;
	if (Math.abs(coordenadas.lat) > 90 || Math.abs(coordenadas.lng) > 180) return null;
	return coordenadas;
}

export function dentroDoBrasil({ lat, lng }: Coordenadas): boolean {
	return lat >= LIMITES_BRASIL.latMin && lat <= LIMITES_BRASIL.latMax && lng >= LIMITES_BRASIL.lngMin && lng <= LIMITES_BRASIL.lngMax;
}

export function arredondar({ lat, lng }: Coordenadas, casas = 3): Coordenadas {
	const fator = 10 ** casas;
	return { lat: Math.round(lat * fator) / fator, lng: Math.round(lng * fator) / fator };
}
