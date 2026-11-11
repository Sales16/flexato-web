import { reais } from '@/lib/formato';
import type { PrecoCombustivelApi } from '@/lib/tipos-api';

export function FaixaPreco({ preco, atual }: { preco: PrecoCombustivelApi | undefined; atual: number }) {
	if (!preco || preco.precoMin === null || preco.precoMax === null || preco.precoMax <= preco.precoMin) return null;
	const { precoMin, precoMax, precoMedio } = preco;
	const posicao = (v: number) => `${Math.min(100, Math.max(0, ((v - precoMin) / (precoMax - precoMin)) * 100))}%`;
	const local = preco.fonte === 'municipio' ? 'na cidade' : 'no estado';

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
		</div>
	);
}
