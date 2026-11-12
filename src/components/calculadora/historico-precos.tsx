'use client';

import { useEffect, useRef, useState } from 'react';
import type { Combustivel } from '@/lib/calculo';
import { chamarApi, ErroApi, mensagemDeErro } from '@/lib/api/cliente';
import { reais } from '@/lib/formato';
import { afastarRotulos, escalaDePrecos, posicaoX, posicaoY } from '@/lib/grafico';
import type { HistoricoPrecosApi, PontoHistoricoApi } from '@/lib/tipos-api';
import type { Uf } from '@/lib/ufs';

const SEMANAS = 12;
const ALTURA = 210;
const MARGEM = { topo: 14, base: 30, esquerda: 58, direita: 78 };
const COMBUSTIVEIS: Combustivel[] = ['etanol', 'gasolina'];
const NOME: Record<Combustivel, string> = { etanol: 'Etanol', gasolina: 'Gasolina' };

type Carga = { chave: string; dados: HistoricoPrecosApi | null; erro: string | null };

const diaMes = (iso: string) => {
	const [, m, d] = iso.split('-');
	return `${d}/${m}`;
};

export function HistoricoPrecos({ uf, municipio }: { uf: Uf; municipio: string }) {
	const [aberto, setAberto] = useState(false);
	const [carga, setCarga] = useState<Carga | null>(null);
	const chave = `${uf}|${municipio}`;

	useEffect(() => {
		if (!aberto) return;
		let ativo = true;
		const consulta = new URLSearchParams({ uf, semanas: String(SEMANAS), ...(municipio ? { municipio } : {}) });
		chamarApi<HistoricoPrecosApi>(`/precos/historico?${consulta}`)
			.then(dados => {
				if (ativo) setCarga({ chave, dados, erro: null });
			})
			.catch(e => {
				if (!ativo) return;
				const semDados = e instanceof ErroApi && e.status === 404;
				setCarga({ chave, dados: null, erro: semDados ? null : mensagemDeErro(e, 'Não foi possível carregar o histórico.') });
			});
		return () => {
			ativo = false;
		};
	}, [aberto, chave, uf, municipio]);

	const atual = carga?.chave === chave ? carga : null;

	return (
		<details className="extras" onToggle={e => setAberto(e.currentTarget.open)}>
			<summary>Histórico de preços</summary>
			{!atual ? (
				<p className="hint">Carregando histórico…</p>
			) : atual.erro ? (
				<p className="hint erro">{atual.erro}</p>
			) : !atual.dados || COMBUSTIVEIS.every(c => !atual.dados!.series[c].length) ? (
				<p className="hint">Ainda não há preços da ANP importados para este local.</p>
			) : (
				<GraficoPrecos historico={atual.dados} />
			)}
		</details>
	);
}

export function GraficoPrecos({ historico }: { historico: HistoricoPrecosApi }) {
	const caixa = useRef<HTMLDivElement>(null);
	const [largura, setLargura] = useState(560);

	useEffect(() => {
		const elemento = caixa.current;
		if (!elemento) return;
		const observador = new ResizeObserver(([entrada]) => setLargura(Math.max(260, Math.round(entrada.contentRect.width))));
		observador.observe(elemento);
		return () => observador.disconnect();
	}, []);

	const semanas = [...new Set(COMBUSTIVEIS.flatMap(c => historico.series[c].map(p => p.semana.fim)))].sort();
	const escala = escalaDePrecos(COMBUSTIVEIS.flatMap(c => historico.series[c].map(p => p.precoMedio)))!;
	const topo = MARGEM.topo;
	const base = ALTURA - MARGEM.base;
	const esquerda = MARGEM.esquerda;
	const direita = largura - MARGEM.direita;
	const x = (fim: string) => posicaoX(semanas.indexOf(fim), semanas.length, esquerda, direita);
	const y = (valor: number) => posicaoY(valor, escala, topo, base);
	const finais = COMBUSTIVEIS.map(c => historico.series[c].at(-1)).filter((p): p is PontoHistoricoApi => !!p);
	const rotulosY = afastarRotulos(
		finais.map(p => y(p.precoMedio)),
		16,
		topo + 6,
		base
	);
	const unicaSemana = semanas.length === 1;
	const local = historico.municipio?.nome ?? historico.uf;
	const usaUf = COMBUSTIVEIS.some(c => historico.series[c].some(p => p.fonte === 'uf'));
	const descricao = `Preço médio semanal em ${local}. ${COMBUSTIVEIS.map(c => {
		const ultimo = historico.series[c].at(-1);
		return ultimo ? `${NOME[c]}: ${reais(ultimo.precoMedio)} na semana até ${diaMes(ultimo.semana.fim)}` : `${NOME[c]}: sem dados`;
	}).join('. ')}.`;

	return (
		<div className="grafico">
			<div className="grafico-legenda" aria-hidden="true">
				{COMBUSTIVEIS.map(c => (
					<span key={c} className="fuel-tag">
						<span className={`marca-serie ${c}`} />
						{NOME[c]}
					</span>
				))}
			</div>
			<div ref={caixa} className="grafico-area">
				<svg width={largura} height={ALTURA} viewBox={`0 0 ${largura} ${ALTURA}`} role="img" aria-label={descricao}>
					{escala.marcas.map(m => (
						<g key={m}>
							<line className="grade" x1={esquerda} x2={direita} y1={y(m)} y2={y(m)} />
							<text className="eixo" x={esquerda - 8} y={y(m)} textAnchor="end" dominantBaseline="middle">
								{reais(m)}
							</text>
						</g>
					))}
					{(unicaSemana ? semanas : [semanas[0], semanas[semanas.length - 1]]).map((fim, i) => (
						<text key={fim} className="eixo" x={x(fim)} y={ALTURA - 8} textAnchor={unicaSemana ? 'middle' : i === 0 ? 'start' : 'end'}>
							{unicaSemana ? `semana até ${diaMes(fim)}` : diaMes(fim)}
						</text>
					))}
					{COMBUSTIVEIS.map(c => {
						const pontos = historico.series[c];
						if (!pontos.length) return null;
						const caminho = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.semana.fim).toFixed(1)},${y(p.precoMedio).toFixed(1)}`).join(' ');
						return (
							<g key={c} className={`serie ${c}`}>
								{pontos.length > 1 && <path className="linha" d={caminho} />}
								{pontos.map((p, i) => {
									const final = i === pontos.length - 1;
									const px = x(p.semana.fim);
									const py = y(p.precoMedio);
									const tamanho = final ? 5 : 3;
									return (
										<g key={p.semana.fim} className="ponto">
											<title>{`${NOME[c]}, semana até ${diaMes(p.semana.fim)}: ${reais(p.precoMedio)}${p.fonte === 'uf' && historico.municipio ? ' (média do estado)' : ''}`}</title>
											<circle className="alvo" cx={px} cy={py} r={12} />
											{c === 'etanol' ? (
												<circle className={final ? 'marcador final' : 'marcador'} cx={px} cy={py} r={tamanho} />
											) : (
												<rect
													className={final ? 'marcador final' : 'marcador'}
													x={px - tamanho}
													y={py - tamanho}
													width={tamanho * 2}
													height={tamanho * 2}
													rx={1.5}
												/>
											)}
										</g>
									);
								})}
							</g>
						);
					})}
					{finais.map((p, i) => {
						const c = COMBUSTIVEIS.find(k => historico.series[k].at(-1) === p)!;
						return (
							<text key={c} className="rotulo-final num" x={x(p.semana.fim) + 12} y={rotulosY[i]} dominantBaseline="middle">
								{reais(p.precoMedio)}
							</text>
						);
					})}
				</svg>
			</div>
			<table className="sr-only">
				<caption>Preço médio semanal em {local}</caption>
				<thead>
					<tr>
						<th scope="col">Semana até</th>
						<th scope="col">Etanol</th>
						<th scope="col">Gasolina</th>
					</tr>
				</thead>
				<tbody>
					{semanas.map(fim => (
						<tr key={fim}>
							<th scope="row">{diaMes(fim)}</th>
							{COMBUSTIVEIS.map(c => {
								const p = historico.series[c].find(q => q.semana.fim === fim);
								return <td key={c}>{p ? reais(p.precoMedio) : '—'}</td>;
							})}
						</tr>
					))}
				</tbody>
			</table>
			<p className="hint">
				{unicaSemana
					? 'Por enquanto só há uma semana importada da ANP. As linhas aparecem conforme novas semanas forem publicadas.'
					: `Média semanal da ANP nas últimas ${semanas.length} semanas.`}
				{usaUf && historico.municipio ? ` Nas semanas sem pesquisa em ${historico.municipio.nome}, vale a média de ${historico.uf}.` : ''}
			</p>
		</div>
	);
}
