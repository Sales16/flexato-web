import type { Consumo } from '@/lib/calculo';
import { decimalParaCampo, lerDecimal } from '@/lib/formato';

export type CamposConsumo = {
	etanol: { cidade: string; estrada: string };
	gasolina: { cidade: string; estrada: string };
};

export const CONSUMO_VAZIO: CamposConsumo = { etanol: { cidade: '', estrada: '' }, gasolina: { cidade: '', estrada: '' } };

export function camposDeConsumo(consumo: Consumo): CamposConsumo {
	return {
		etanol: { cidade: decimalParaCampo(consumo.etanol.cidade, 1), estrada: decimalParaCampo(consumo.etanol.estrada, 1) },
		gasolina: { cidade: decimalParaCampo(consumo.gasolina.cidade, 1), estrada: decimalParaCampo(consumo.gasolina.estrada, 1) },
	};
}

export function consumoDeCampos(campos: CamposConsumo): Consumo {
	return {
		etanol: { cidade: lerDecimal(campos.etanol.cidade), estrada: lerDecimal(campos.etanol.estrada) },
		gasolina: { cidade: lerDecimal(campos.gasolina.cidade), estrada: lerDecimal(campos.gasolina.estrada) },
	};
}

export function consumoCompleto(consumo: Consumo): boolean {
	return [consumo.etanol.cidade, consumo.etanol.estrada, consumo.gasolina.cidade, consumo.gasolina.estrada].every(Number.isFinite);
}

export function mesmoConsumo(a: Consumo, b: Consumo): boolean {
	const iguais = (x: number, y: number) => (Number.isNaN(x) && Number.isNaN(y)) || x === y;
	return (
		iguais(a.etanol.cidade, b.etanol.cidade) &&
		iguais(a.etanol.estrada, b.etanol.estrada) &&
		iguais(a.gasolina.cidade, b.gasolina.cidade) &&
		iguais(a.gasolina.estrada, b.gasolina.estrada)
	);
}
