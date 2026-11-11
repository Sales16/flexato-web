export function numero(valor: number, casas = 2): string {
	return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function reais(valor: number): string {
	return `R$ ${numero(valor, 2)}`;
}

export function lerDecimal(texto: string): number {
	const t = texto.trim();
	if (!t) return Number.NaN;
	const normalizado = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
	if (!/^\d*\.?\d+$|^\d+\.$/.test(normalizado)) return Number.NaN;
	const n = Number(normalizado);
	return n > 0 ? n : Number.NaN;
}

export function lerInteiro(texto: string): number {
	const t = texto.trim().replace(/\./g, '');
	if (!/^\d+$/.test(t)) return Number.NaN;
	const n = Number(t);
	return n > 0 ? n : Number.NaN;
}

export function decimalParaCampo(valor: number | null | undefined, casas: number): string {
	return typeof valor === 'number' && Number.isFinite(valor) ? numero(valor, casas) : '';
}
