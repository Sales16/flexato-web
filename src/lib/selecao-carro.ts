export type Selecao = `cat:${number}` | `gar:${string}` | 'outro';

type Escolha = { tipo: 'catalogo'; carro: { id: number } } | { tipo: 'garagem'; carro: { id: string } } | { tipo: 'outro' };

export function selecaoDaEscolha(escolha: Escolha): Selecao {
	if (escolha.tipo === 'catalogo') return `cat:${escolha.carro.id}`;
	if (escolha.tipo === 'garagem') return `gar:${escolha.carro.id}`;
	return 'outro';
}

export function trocaDeSelecao(atual: Selecao, escolha: Escolha): Selecao | null {
	const nova = selecaoDaEscolha(escolha);
	return nova === atual ? null : nova;
}
