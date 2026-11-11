import { RAZAO_REGRA_GENERICA, type ResultadoCalculo, type Vencedor } from '@/lib/calculo';
import { numero, reais } from '@/lib/formato';

const ROTULO: Record<Vencedor, string> = { etanol: 'Etanol', gasolina: 'Gasolina', empate: 'Tanto faz' };
const ESCALA_MIN = 0.6;
const ESCALA_MAX = 0.8;
const MARCAS = [0.6, 0.65, 0.7, 0.75, 0.8];

const posicao = (v: number) => `${Math.min(100, Math.max(0, ((v - ESCALA_MIN) / (ESCALA_MAX - ESCALA_MIN)) * 100))}%`;

type Props = {
	resultado: ResultadoCalculo | null;
	nomeCarro: string;
	precoGasolina: number;
	kmPorMes: number;
};

export function Resultado({ resultado: r, nomeCarro, precoGasolina, kmPorMes }: Props) {
	if (!r) {
		return (
			<aside className="result" aria-live="polite">
				<div className="verdict-band vazio">
					<p className="eyebrow">Resultado</p>
					<p className="verdict-sub">Preencha os consumos e os dois preços para ver qual combustível compensa.</p>
				</div>
			</aside>
		);
	}

	const sub =
		r.vencedor === 'empate'
			? 'Os dois custam praticamente o mesmo por quilômetro.'
			: `${ROTULO[r.vencedor]} sai ${reais(r.diferencaPorKm)} mais barato a cada km.`;

	return (
		<aside className="result" aria-live="polite" id="resultado">
			<div className={`verdict-band ${r.vencedor}`}>
				<p className="eyebrow">Para o seu {nomeCarro}, hoje</p>
				<div className={`verdict ${r.vencedor}`}>{ROTULO[r.vencedor]}</div>
				<p className="verdict-sub">{sub}</p>
			</div>
			<div className="result-body">
				<div className="costs">
					{(['etanol', 'gasolina'] as const).map(c => (
						<div key={c} className={`cost ${c} ${r.vencedor === c ? 'win' : ''}`}>
							<span className="fuel-tag">
								<span className={`dot ${c}`} />
								{ROTULO[c]}
							</span>
							<span className="val">
								{reais(r.custoPorKm[c])}
								<small>/km</small>
							</span>
						</div>
					))}
				</div>

				<div className="gauge">
					<p className="eyebrow">Preço do etanol ÷ preço da gasolina</p>
					<div
						className="gauge-track"
						role="img"
						aria-label={`Razão de hoje ${numero(r.razaoPrecos, 3)}, limite do carro ${numero(r.razaoLimite, 3)}, regra genérica ${numero(RAZAO_REGRA_GENERICA, 3)}`}
					>
						<div className="gauge-bar">
							<div className="z-e" style={{ width: posicao(r.razaoLimite) }}>
								<span>etanol</span>
							</div>
							<div className="z-g">
								<span>gasolina</span>
							</div>
						</div>
						<div className="mk generic" style={{ left: posicao(RAZAO_REGRA_GENERICA) }} />
						<div className="mk limit" style={{ left: posicao(r.razaoLimite) }} />
						<div className="mk today" style={{ left: posicao(r.razaoPrecos) }} />
					</div>
					<div className="ticks num">
						{MARCAS.map(m => (
							<span key={m} style={{ left: posicao(m) }}>
								{numero(m, 2)}
							</span>
						))}
					</div>
					<div className="legend">
						<div>
							<span className="lg today" />
							Hoje<span className="num">{numero(r.razaoPrecos, 3)}</span>
						</div>
						<div>
							<span className="lg limit" />
							Limite do seu carro<span className="num">{numero(r.razaoLimite, 3)}</span>
						</div>
						<div>
							<span className="lg generic" />
							Regra genérica<span className="num">{numero(RAZAO_REGRA_GENERICA, 3)}</span>
						</div>
					</div>
				</div>

				{r.regraGenericaErra ? (
					<div className="callout warn">
						<b>A regra dos 70% erraria aqui.</b>
						<span>
							Ela mandaria abastecer com {r.vencedorRegraGenerica}. Para o seu {nomeCarro}, o etanol só compensa abaixo de{' '}
							{numero(r.razaoLimite * 100, 1)}% do preço da gasolina.
						</span>
					</div>
				) : (
					<div className="callout same">
						A regra dos 70% chega à mesma resposta neste caso. O limite do seu {nomeCarro} é {numero(r.razaoLimite * 100, 1)}%.
					</div>
				)}

				{r.vencedor !== 'empate' && (
					<div className="savings">
						<div className="saving">
							<span className="val">{r.economiaPorTanque !== null ? reais(r.economiaPorTanque) : '—'}</span>
							<span className="lbl">por tanque cheio{r.kmPorTanque !== null ? ` (${numero(r.kmPorTanque, 0)} km)` : ''}</span>
						</div>
						<div className="saving">
							<span className="val">{r.economiaPorMes !== null ? reais(r.economiaPorMes) : '—'}</span>
							<span className="lbl">por mês{Number.isFinite(kmPorMes) ? ` (${numero(kmPorMes, 0)} km)` : ''}</span>
						</div>
					</div>
				)}

				<div className="divider" />
				<p className="virada">
					Com a gasolina a {reais(precoGasolina)}, o etanol compensa até <span className="num">{reais(r.precoLimiteEtanol)}</span>.
				</p>
			</div>
		</aside>
	);
}

export function BarraResultado({ resultado: r }: { resultado: ResultadoCalculo | null }) {
	const texto = !r
		? 'Preencha os consumos e os preços.'
		: r.vencedor === 'empate'
			? 'Custos iguais por km'
			: r.economiaPorMes !== null
				? `Economia de ${reais(r.economiaPorMes)} por mês`
				: `${reais(r.diferencaPorKm)} a menos por km`;

	return (
		<div className="mbar">
			<div className="mbar-inner">
				<div>
					{r && <div className={`v ${r.vencedor}`}>{ROTULO[r.vencedor]}</div>}
					<div className="s">{texto}</div>
				</div>
				{r && (
					<a className="btn small" href="#resultado">
						Ver detalhes
					</a>
				)}
			</div>
		</div>
	);
}
