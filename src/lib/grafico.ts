export type Escala = { min: number; max: number; passo: number; marcas: number[] };

const PASSOS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10];
const AMPLITUDE_MINIMA = 0.2;

const arredondar = (v: number) => Math.round(v * 1000) / 1000;

export function escalaDePrecos(valores: number[], divisoes = 4): Escala | null {
	const validos = valores.filter(Number.isFinite);
	if (!validos.length) return null;
	let menor = Math.min(...validos);
	let maior = Math.max(...validos);
	if (maior - menor < AMPLITUDE_MINIMA) {
		const centro = (menor + maior) / 2;
		menor = centro - AMPLITUDE_MINIMA / 2;
		maior = centro + AMPLITUDE_MINIMA / 2;
	}
	const bruto = (maior - menor) / divisoes;
	const passo = PASSOS.find(p => p >= bruto) ?? PASSOS[PASSOS.length - 1];
	const min = Math.max(0, arredondar(Math.floor(menor / passo) * passo));
	const max = arredondar(Math.ceil(maior / passo) * passo);
	const marcas: number[] = [];
	for (let v = min; v <= max + passo / 2; v += passo) marcas.push(arredondar(v));
	return { min, max, passo, marcas };
}

export function posicaoY(valor: number, escala: Pick<Escala, 'min' | 'max'>, topo: number, base: number): number {
	return base - ((valor - escala.min) / (escala.max - escala.min)) * (base - topo);
}

export function posicaoX(indice: number, total: number, esquerda: number, direita: number): number {
	if (total <= 1) return (esquerda + direita) / 2;
	return esquerda + (indice / (total - 1)) * (direita - esquerda);
}

export function afastarRotulos(posicoes: number[], distanciaMinima: number, topo: number, base: number): number[] {
	const ordem = posicoes.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
	for (let k = 1; k < ordem.length; k++) {
		if (ordem[k].y - ordem[k - 1].y < distanciaMinima) ordem[k].y = ordem[k - 1].y + distanciaMinima;
	}
	const excesso = ordem.length ? ordem[ordem.length - 1].y - base : 0;
	if (excesso > 0) for (const item of ordem) item.y -= excesso;
	for (const item of ordem) item.y = Math.max(topo, item.y);
	const resultado: number[] = [];
	for (const item of ordem) resultado[item.i] = item.y;
	return resultado;
}
