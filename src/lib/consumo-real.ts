import type { Combustivel } from '@/lib/calculo';

export type Trecho = 'cidade' | 'estrada' | 'misto';
export type TrechoMedido = 'cidade' | 'estrada';

export type RegistroAbastecimento = {
	id: string;
	data: string;
	combustivel: Combustivel;
	litros: number;
	hodometroKm: number;
	tanqueCheio: boolean;
	trecho: Trecho | null;
};

export type MotivoDescarte = 'hodometro_inconsistente' | 'litros_invalidos' | 'combustiveis_misturados' | 'consumo_implausivel';

export type IntervaloConsumo = {
	inicioId: string;
	fimId: string;
	combustivel: Combustivel | null;
	trecho: TrechoMedido | null;
	km: number;
	litros: number;
	kmPorLitro: number | null;
	motivoDescarte: MotivoDescarte | null;
};

export type ConsumoMedido = {
	combustivel: Combustivel;
	trecho: TrechoMedido | null;
	km: number;
	litros: number;
	kmPorLitro: number;
	intervalos: number;
};

export type ConsumoReal = {
	medicoes: ConsumoMedido[];
	intervalos: IntervaloConsumo[];
};

export const CONSUMO_PLAUSIVEL_MIN = 2;
export const CONSUMO_PLAUSIVEL_MAX = 40;

const ORDEM_COMBUSTIVEL: Combustivel[] = ['etanol', 'gasolina'];
const ORDEM_TRECHO = ['cidade', 'estrada', null] as const;

function ordenar(registros: RegistroAbastecimento[]): RegistroAbastecimento[] {
	return registros
		.map((r, i) => ({ r, i }))
		.sort((a, b) => a.r.data.localeCompare(b.r.data) || a.r.hodometroKm - b.r.hodometroKm || a.i - b.i)
		.map(x => x.r);
}

function trechoDoIntervalo(trechos: (Trecho | null)[]): TrechoMedido | null {
	const unicos = new Set(trechos);
	if (unicos.size !== 1) return null;
	const [unico] = unicos;
	return unico === 'cidade' || unico === 'estrada' ? unico : null;
}

function arredondar(valor: number, casas: number): number {
	const fator = 10 ** casas;
	return Math.round(valor * fator) / fator;
}

export function calcularConsumoReal(registros: RegistroAbastecimento[]): ConsumoReal {
	const intervalos: IntervaloConsumo[] = [];
	let abertura: RegistroAbastecimento | null = null;
	let anterior: RegistroAbastecimento | null = null;
	let litros = 0;
	let combustiveis = new Set<Combustivel>();
	let trechos: (Trecho | null)[] = [];
	let motivo: MotivoDescarte | null = null;

	for (const atual of ordenar(registros)) {
		if (abertura && anterior) {
			if (atual.hodometroKm < anterior.hodometroKm) motivo ??= 'hodometro_inconsistente';
			if (!(atual.litros > 0)) motivo ??= 'litros_invalidos';
			litros += atual.litros;
			combustiveis.add(atual.combustivel);
			trechos.push(atual.trecho);

			if (atual.tanqueCheio) {
				const km = atual.hodometroKm - abertura.hodometroKm;
				if (km <= 0) motivo ??= 'hodometro_inconsistente';
				if (!(litros > 0)) motivo ??= 'litros_invalidos';
				const mesmoCombustivel = combustiveis.size === 1 && combustiveis.has(abertura.combustivel);
				if (!mesmoCombustivel) motivo ??= 'combustiveis_misturados';
				const kmPorLitro = !motivo ? km / litros : null;
				if (kmPorLitro !== null && (kmPorLitro < CONSUMO_PLAUSIVEL_MIN || kmPorLitro > CONSUMO_PLAUSIVEL_MAX)) motivo = 'consumo_implausivel';
				intervalos.push({
					inicioId: abertura.id,
					fimId: atual.id,
					combustivel: mesmoCombustivel ? abertura.combustivel : null,
					trecho: trechoDoIntervalo(trechos),
					km,
					litros: arredondar(litros, 2),
					kmPorLitro: motivo || kmPorLitro === null ? null : arredondar(kmPorLitro, 2),
					motivoDescarte: motivo,
				});
			}
		}

		if (atual.tanqueCheio) {
			abertura = atual;
			litros = 0;
			combustiveis = new Set();
			trechos = [];
			motivo = null;
		}
		anterior = atual;
	}

	const medicoes: ConsumoMedido[] = [];
	for (const combustivel of ORDEM_COMBUSTIVEL) {
		for (const trecho of ORDEM_TRECHO) {
			const validos = intervalos.filter(i => !i.motivoDescarte && i.combustivel === combustivel && i.trecho === trecho);
			if (!validos.length) continue;
			const km = validos.reduce((s, i) => s + i.km, 0);
			const litrosTotais = validos.reduce((s, i) => s + i.litros, 0);
			medicoes.push({
				combustivel,
				trecho,
				km,
				litros: arredondar(litrosTotais, 2),
				kmPorLitro: arredondar(km / litrosTotais, 2),
				intervalos: validos.length,
			});
		}
	}

	return { medicoes, intervalos };
}
