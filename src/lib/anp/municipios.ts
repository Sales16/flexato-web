import { normalizarNome } from '@/lib/ufs';

const PALAVRAS_MINUSCULAS = new Set(['DA', 'DAS', 'DE', 'DO', 'DOS', 'E']);

export function chaveComparacao(uf: string, nome: string): string {
	return `${uf}|${normalizarNome(nome).replace(/[^A-Z0-9]/g, '')}`;
}

export function nomeLegivel(chaveAnp: string): string {
	return chaveAnp
		.split(' ')
		.filter(Boolean)
		.map((p, i) => (i > 0 && PALAVRAS_MINUSCULAS.has(p) ? p.toLowerCase() : p.charAt(0) + p.slice(1).toLowerCase()))
		.join(' ');
}
