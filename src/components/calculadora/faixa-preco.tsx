import { posicaoNaFaixa } from '@/lib/faixa-preco';
import { reais } from '@/lib/formato';
import type { PrecoCombustivelApi } from '@/lib/tipos-api';

export function FaixaPreco({ preco, atual }: { preco: PrecoCombustivelApi | undefined; atual: number }) {
	if (!preco || preco.precoMin === null || preco.precoMax === null || preco.precoMax <= preco.precoMin) return null;
	const { precoMin, precoMax, precoMedio } = preco;
	const posicao = (v: number) => `${posicaoNaFaixa(v, precoMin, precoMax).percentual}%`;
	const local = preco.fonte === 'municipio' ? 'na cidade' : 'no estado';
	const fora = Number.isFinite(atual) ? posicaoNaFaixa(atual, precoMin, precoMax).fora : null;

	return (
		<div className="faixa">
			<div className="faixa-trilho" aria-hidden="true">
				<span className="faixa-medio" style={{ left: posicao(precoMedio) }} />
				{Number.isFinite(atual) && <span className="faixa-atual" style={{ left: posicao(atual) }} />}
			</div>
			<p className="faixa-valores num" title={`Menor, médio e maior preço pesquisados pela ANP ${local} nesta semana`}>
				<span className="sr-only">Faixa da ANP {local} nesta semana:</span>
				<span>mín {reais(precoMin)}</span>
				<span>méd {reais(precoMedio)}</span>
				<span>máx {reais(precoMax)}</span>
			</p>
			{fora && (
				<p className="faixa-aviso">
					Seu preço está {fora === 'abaixo' ? 'abaixo do menor' : 'acima do maior'} preço pesquisado pela ANP {local}.
				</p>
			)}
		</div>
	);
}
