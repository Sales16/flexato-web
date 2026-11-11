type Identificacao = { marca: string; modelo: string; versao: string };

export function normalizarBusca(texto: string): string {
	return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function palavrasDaBusca(termo: string): string[] {
	return normalizarBusca(termo.replace(/[%_,()*\\]/g, ' '))
		.split(' ')
		.filter(Boolean);
}

function pontosDaPalavra(palavra: string, tokens: string[], exato: number, prefixo: number): number {
	if (tokens.includes(palavra)) return exato;
	return tokens.some(t => t.startsWith(palavra)) ? prefixo : 0;
}

export function pontuar(item: Identificacao, palavras: string[]): number {
	const tokens = (texto: string) => normalizarBusca(texto).split(/[\s-]+/);
	const marca = tokens(item.marca);
	const modelo = tokens(item.modelo);
	const versao = tokens(item.versao);
	let pontos = normalizarBusca(item.modelo) === palavras.join(' ') ? 100 : 0;
	for (const palavra of palavras) {
		pontos += Math.max(pontosDaPalavra(palavra, modelo, 10, 6), pontosDaPalavra(palavra, marca, 5, 4), pontosDaPalavra(palavra, versao, 3, 2), 1);
	}
	return pontos;
}

export function ordenarPorRelevancia<T extends Identificacao>(itens: T[], termo: string): T[] {
	const palavras = palavrasDaBusca(termo);
	if (!palavras.length) return itens;
	return itens
		.map((item, ordem) => ({ item, ordem, pontos: pontuar(item, palavras) }))
		.sort((a, b) => b.pontos - a.pontos || a.ordem - b.ordem)
		.map(p => p.item);
}
