export type Combustivel = 'etanol' | 'gasolina';
export type Vencedor = Combustivel | 'empate';

export type ConsumoPorTrecho = {
	cidade: number;
	estrada: number;
};

export type Consumo = {
	etanol: ConsumoPorTrecho;
	gasolina: ConsumoPorTrecho;
};

export type EntradaCalculo = {
	consumo: Consumo;
	precos: Record<Combustivel, number>;
	percentualCidade: number;
	tanqueLitros?: number | null;
	kmPorMes?: number | null;
};

export type ResultadoCalculo = {
	vencedor: Vencedor;
	vencedorRegraGenerica: Combustivel;
	regraGenericaErra: boolean;
	custoPorKm: Record<Combustivel, number>;
	diferencaPorKm: number;
	razaoPrecos: number;
	razaoLimite: number;
	precoLimiteEtanol: number;
	kmPorTanque: number | null;
	economiaPorTanque: number | null;
	economiaPorMes: number | null;
};

export const RAZAO_REGRA_GENERICA = 0.7;
const TOLERANCIA_EMPATE = 0.0005;

const positivo = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

export function litrosPorKm(consumo: ConsumoPorTrecho, percentualCidade: number): number {
	const cidade = percentualCidade / 100;
	const estrada = 1 - cidade;
	let litros = 0;
	if (cidade > 0) litros += cidade / consumo.cidade;
	if (estrada > 0) litros += estrada / consumo.estrada;
	return litros;
}

export function validarEntrada(entrada: EntradaCalculo): string[] {
	const erros: string[] = [];
	const { consumo, precos, percentualCidade } = entrada;
	if (!Number.isFinite(percentualCidade) || percentualCidade < 0 || percentualCidade > 100) {
		erros.push('percentualCidade deve estar entre 0 e 100.');
	}
	if (!positivo(precos.etanol)) erros.push('Informe o preço do etanol.');
	if (!positivo(precos.gasolina)) erros.push('Informe o preço da gasolina.');
	const trechos: (keyof ConsumoPorTrecho)[] = [];
	if (percentualCidade > 0) trechos.push('cidade');
	if (percentualCidade < 100) trechos.push('estrada');
	for (const combustivel of ['etanol', 'gasolina'] as const) {
		for (const trecho of trechos) {
			if (!positivo(consumo[combustivel][trecho])) erros.push(`Informe o consumo de ${combustivel} na ${trecho}.`);
		}
	}
	return erros;
}

export function calcular(entrada: EntradaCalculo): ResultadoCalculo {
	const erros = validarEntrada(entrada);
	if (erros.length) throw new Error(erros.join(' '));

	const { consumo, precos, percentualCidade } = entrada;
	const litrosEtanol = litrosPorKm(consumo.etanol, percentualCidade);
	const litrosGasolina = litrosPorKm(consumo.gasolina, percentualCidade);
	const custoEtanol = precos.etanol * litrosEtanol;
	const custoGasolina = precos.gasolina * litrosGasolina;
	const diferencaPorKm = Math.abs(custoEtanol - custoGasolina);
	const vencedor: Vencedor = diferencaPorKm < TOLERANCIA_EMPATE ? 'empate' : custoEtanol < custoGasolina ? 'etanol' : 'gasolina';
	const razaoPrecos = precos.etanol / precos.gasolina;
	const razaoLimite = litrosGasolina / litrosEtanol;
	const vencedorRegraGenerica: Combustivel = razaoPrecos <= RAZAO_REGRA_GENERICA ? 'etanol' : 'gasolina';

	const litrosVencedor = vencedor === 'etanol' ? litrosEtanol : litrosGasolina;
	const kmPorTanque = positivo(entrada.tanqueLitros) ? entrada.tanqueLitros / litrosVencedor : null;
	const temEconomia = vencedor !== 'empate';

	return {
		vencedor,
		vencedorRegraGenerica,
		regraGenericaErra: temEconomia && vencedor !== vencedorRegraGenerica,
		custoPorKm: { etanol: custoEtanol, gasolina: custoGasolina },
		diferencaPorKm,
		razaoPrecos,
		razaoLimite,
		precoLimiteEtanol: precos.gasolina * razaoLimite,
		kmPorTanque,
		economiaPorTanque: temEconomia && kmPorTanque !== null ? kmPorTanque * diferencaPorKm : null,
		economiaPorMes: temEconomia && positivo(entrada.kmPorMes) ? entrada.kmPorMes * diferencaPorKm : null,
	};
}

export function razaoLimiteDoCarro(consumo: Consumo, percentualCidade = 50): number {
	return litrosPorKm(consumo.gasolina, percentualCidade) / litrosPorKm(consumo.etanol, percentualCidade);
}
