export type ItemCombo = { chave: string; tipo: string };

export function indiceDaChave(opcoes: readonly ItemCombo[], chave: string | null): number {
	return chave === null ? -1 : opcoes.findIndex(o => o.chave === chave);
}

export function chaveAoNavegar(opcoes: readonly ItemCombo[], chaveAtiva: string | null, passo: 1 | -1): string | null {
	if (!opcoes.length) return null;
	const atual = indiceDaChave(opcoes, chaveAtiva);
	const proximo = atual < 0 ? (passo > 0 ? 0 : opcoes.length - 1) : (atual + passo + opcoes.length) % opcoes.length;
	return opcoes[proximo].chave;
}

export function opcaoAoConfirmar<T extends ItemCombo>(opcoes: readonly T[], chaveAtiva: string | null, termo: string): T | undefined {
	const ativa = opcoes[indiceDaChave(opcoes, chaveAtiva)];
	if (ativa) return ativa;
	const primeira = opcoes[0];
	return termo && primeira && primeira.tipo !== 'outro' ? primeira : undefined;
}
