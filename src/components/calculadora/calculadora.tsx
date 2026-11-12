'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { calcular, validarEntrada, type Combustivel } from '@/lib/calculo';
import { chamarApi, ErroApi, mensagemDeErro } from '@/lib/api/cliente';
import { decimalParaCampo, lerDecimal, lerInteiro, numero, reais } from '@/lib/formato';
import { trocaDeSelecao, type Selecao } from '@/lib/selecao-carro';
import type { CarroApi, LocaisApi, PrecosApi, Semana, VeiculoCatalogoApi } from '@/lib/tipos-api';
import { ehUf, UFS, type Uf } from '@/lib/ufs';
import { useAvisos } from '@/components/provedor-avisos';
import { useSessao } from '@/components/provedor-sessao';
import { CONSUMO_VAZIO, camposDeConsumo, consumoCompleto, consumoDeCampos, mesmoConsumo, type CamposConsumo } from './campos';
import { FaixaPreco } from './faixa-preco';
import { HistoricoPrecos } from './historico-precos';
import { LocalizacaoAutomatica } from './localizacao';
import { BuscaCarro, type EscolhaCarro } from './busca-carro';
import { BarraResultado, Resultado } from './resultado';

export const CHAVE_CARRO_ESCOLHIDO = 'flexato:carro-escolhido';
const CHAVE_LOCAL = 'flexato:local';
const BUSCA_CARRO_INICIAL = 'onix';
const ATALHOS_USO = [
	{ rotulo: 'Cidade', valor: 100 },
	{ rotulo: 'Ambos', valor: 50 },
	{ rotulo: 'Estrada', valor: 0 },
] as const;

type EstadoPrecos = 'carregando' | 'ok' | 'sem_dados' | 'erro';

function lerArmazenado(armazenamento: 'local' | 'sessao', chave: string): string | null {
	try {
		return (armazenamento === 'local' ? localStorage : sessionStorage).getItem(chave);
	} catch {
		return null;
	}
}

function gravarArmazenado(armazenamento: 'local' | 'sessao', chave: string, valor: string | null) {
	try {
		const alvo = armazenamento === 'local' ? localStorage : sessionStorage;
		if (valor === null) alvo.removeItem(chave);
		else alvo.setItem(chave, valor);
	} catch {}
}

function formatarSemana(semana: Semana): string {
	const [ai, mi, di] = semana.inicio.split('-');
	const [af, mf, df] = semana.fim.split('-');
	return ai === af ? `${di}/${mi} a ${df}/${mf}/${af}` : `${di}/${mi}/${ai} a ${df}/${mf}/${af}`;
}

export function Calculadora() {
	const router = useRouter();
	const avisar = useAvisos();
	const { sessao } = useSessao();
	const usuarioId = sessao?.user.id ?? null;

	const [locais, setLocais] = useState<LocaisApi | null>(null);
	const [uf, setUf] = useState<Uf>('SP');
	const [municipio, setMunicipio] = useState('');
	const [precosApi, setPrecosApi] = useState<PrecosApi | null>(null);
	const [estadoPrecos, setEstadoPrecos] = useState<EstadoPrecos>('carregando');
	const [precos, setPrecos] = useState<Record<Combustivel, string>>({ etanol: '', gasolina: '' });
	const pedidoPrecos = useRef(0);

	const [veiculoCatalogo, setVeiculoCatalogo] = useState<VeiculoCatalogoApi | null>(null);
	const [garagem, setGaragem] = useState<{ dono: string; itens: CarroApi[] } | null>(null);
	const [selecao, setSelecao] = useState<Selecao>('outro');
	const [campos, setCampos] = useState<CamposConsumo>(CONSUMO_VAZIO);
	const [camposBase, setCamposBase] = useState<CamposConsumo>(CONSUMO_VAZIO);
	const [salvando, setSalvando] = useState(false);

	const [percentualCidade, setPercentualCidade] = useState(50);
	const [tanque, setTanque] = useState('50');
	const [kmMes, setKmMes] = useState('1.000');

	const garagemVisivel = garagem && garagem.dono === usuarioId ? garagem.itens : [];

	function aplicarSelecao(nova: Selecao, novosCampos: CamposConsumo) {
		setSelecao(nova);
		setCampos(novosCampos);
		setCamposBase(novosCampos);
	}

	async function trocarLocal(novaUf: Uf, novoMunicipio: string) {
		setUf(novaUf);
		setMunicipio(novoMunicipio);
		gravarArmazenado('local', CHAVE_LOCAL, JSON.stringify({ uf: novaUf, municipio: novoMunicipio }));
		setEstadoPrecos('carregando');
		const pedido = ++pedidoPrecos.current;
		try {
			const consulta = new URLSearchParams({ uf: novaUf, ...(novoMunicipio ? { municipio: novoMunicipio } : {}) });
			const resposta = await chamarApi<PrecosApi>(`/precos?${consulta}`);
			if (pedido !== pedidoPrecos.current) return;
			setPrecosApi(resposta);
			setPrecos({
				etanol: decimalParaCampo(resposta.precos.etanol?.precoMedio, 2),
				gasolina: decimalParaCampo(resposta.precos.gasolina?.precoMedio, 2),
			});
			setEstadoPrecos('ok');
		} catch (e) {
			if (pedido !== pedidoPrecos.current) return;
			setPrecosApi(null);
			setEstadoPrecos(e instanceof ErroApi && e.status === 404 ? 'sem_dados' : 'erro');
		}
	}

	const aplicarCargaInicial = useEffectEvent(
		(respostaLocais: PromiseSettledResult<LocaisApi>, respostaCatalogo: PromiseSettledResult<{ itens: VeiculoCatalogoApi[] }>) => {
			const inicial = respostaCatalogo.status === 'fulfilled' ? respostaCatalogo.value.itens[0] : undefined;
			if (inicial && !lerArmazenado('sessao', CHAVE_CARRO_ESCOLHIDO) && selecao === 'outro') {
				setVeiculoCatalogo(inicial);
				aplicarSelecao(`cat:${inicial.id}`, camposDeConsumo(inicial.consumo));
			}

			if (respostaLocais.status === 'fulfilled') {
				const dados = respostaLocais.value;
				setLocais(dados);
				let preferido: { uf?: string; municipio?: string } = {};
				try {
					preferido = JSON.parse(lerArmazenado('local', CHAVE_LOCAL) ?? '{}');
				} catch {}
				const ufInicial = preferido.uf && ehUf(preferido.uf) ? preferido.uf : 'SP';
				const municipios = dados.ufs.find(u => u.sigla === ufInicial)?.municipios ?? [];
				const municipioInicial =
					preferido.uf === ufInicial && preferido.municipio !== undefined
						? municipios.some(m => m.chave === preferido.municipio)
							? preferido.municipio
							: ''
						: municipios.some(m => m.chave === 'SAO PAULO')
							? 'SAO PAULO'
							: '';
				trocarLocal(ufInicial, municipioInicial);
			} else {
				setEstadoPrecos('erro');
			}
		}
	);

	useEffect(() => {
		let ativo = true;
		Promise.allSettled([
			chamarApi<LocaisApi>('/locais'),
			chamarApi<{ itens: VeiculoCatalogoApi[] }>(`/catalogo?${new URLSearchParams({ q: BUSCA_CARRO_INICIAL, limite: '1' })}`),
		]).then(([locais, catalogo]) => {
			if (ativo) aplicarCargaInicial(locais, catalogo);
		});
		return () => {
			ativo = false;
		};
	}, []);

	const aplicarGaragem = useEffectEvent((dono: string, itens: CarroApi[]) => {
		setGaragem({ dono, itens });
		const pendente = lerArmazenado('sessao', CHAVE_CARRO_ESCOLHIDO);
		const escolhido = pendente ? itens.find(c => c.id === pendente) : undefined;
		if (pendente) gravarArmazenado('sessao', CHAVE_CARRO_ESCOLHIDO, null);
		if (escolhido) aplicarSelecao(`gar:${escolhido.id}`, camposDeConsumo(escolhido.consumo));
	});

	useEffect(() => {
		if (!usuarioId) return;
		let ativo = true;
		chamarApi<{ itens: CarroApi[] }>('/carros', { autenticado: true })
			.then(r => {
				if (ativo) aplicarGaragem(usuarioId, r.itens);
			})
			.catch(() => {});
		return () => {
			ativo = false;
		};
	}, [usuarioId]);

	const carroCatalogo = veiculoCatalogo && selecao === `cat:${veiculoCatalogo.id}` ? veiculoCatalogo : undefined;
	const carroGaragem = selecao.startsWith('gar:') ? garagemVisivel.find(c => `gar:${c.id}` === selecao) : undefined;
	const rotuloCarro =
		carroGaragem?.nome ?? (carroCatalogo ? `${carroCatalogo.marca} ${carroCatalogo.modelo} ${carroCatalogo.versao}` : 'Outro carro (digitar consumos)');
	const nomeCarro = carroGaragem?.nome ?? carroCatalogo?.modelo ?? 'carro';

	const consumo = consumoDeCampos(campos);
	const consumoEditado = !mesmoConsumo(consumo, consumoDeCampos(camposBase));
	const precoEtanol = lerDecimal(precos.etanol);
	const precoGasolina = lerDecimal(precos.gasolina);
	const kmPorMes = lerInteiro(kmMes);
	const entrada = { consumo, precos: { etanol: precoEtanol, gasolina: precoGasolina }, percentualCidade, tanqueLitros: lerInteiro(tanque), kmPorMes };
	const resultado = validarEntrada(entrada).length ? null : calcular(entrada);

	function escolherCarro(escolha: EscolhaCarro) {
		const nova = trocaDeSelecao(selecao, escolha);
		if (!nova) return;
		if (escolha.tipo === 'catalogo') {
			setVeiculoCatalogo(escolha.carro);
			aplicarSelecao(nova, camposDeConsumo(escolha.carro.consumo));
		} else if (escolha.tipo === 'garagem') {
			aplicarSelecao(nova, camposDeConsumo(escolha.carro.consumo));
		} else {
			aplicarSelecao(nova, CONSUMO_VAZIO);
		}
	}

	function alterarCampo(combustivel: Combustivel, trecho: 'cidade' | 'estrada', valor: string) {
		setCampos(atual => ({ ...atual, [combustivel]: { ...atual[combustivel], [trecho]: valor } }));
	}

	function formatarCampo(combustivel: Combustivel, trecho: 'cidade' | 'estrada') {
		const v = consumo[combustivel][trecho];
		if (Number.isFinite(v)) alterarCampo(combustivel, trecho, decimalParaCampo(v, 1));
	}

	async function salvarCarro() {
		if (!usuarioId) {
			avisar('Entre para salvar carros na sua garagem');
			router.push('/entrar');
			return;
		}
		if (!consumoCompleto(consumo)) {
			avisar('Preencha os quatro consumos antes de salvar');
			return;
		}
		setSalvando(true);
		try {
			if (carroGaragem) {
				const atualizado = await chamarApi<CarroApi>(`/carros/${carroGaragem.id}`, { method: 'PATCH', corpo: { consumo }, autenticado: true });
				setGaragem(g => (g ? { ...g, itens: g.itens.map(c => (c.id === atualizado.id ? atualizado : c)) } : g));
				aplicarSelecao(`gar:${atualizado.id}`, camposDeConsumo(atualizado.consumo));
				avisar('Consumos atualizados na garagem');
			} else {
				const novo = await chamarApi<CarroApi>('/carros', {
					method: 'POST',
					corpo: { nome: carroCatalogo ? `Meu ${carroCatalogo.modelo}` : 'Meu carro', catalogoId: carroCatalogo?.id ?? null, consumo },
					autenticado: true,
				});
				setGaragem(g => ({ dono: usuarioId, itens: [...(g && g.dono === usuarioId ? g.itens : []), novo] }));
				aplicarSelecao(`gar:${novo.id}`, camposDeConsumo(novo.consumo));
				avisar(`"${novo.nome}" salvo na garagem`);
			}
		} catch (e) {
			avisar(mensagemDeErro(e, 'Não foi possível salvar o carro.'));
		} finally {
			setSalvando(false);
		}
	}

	const municipiosDaUf = locais?.ufs.find(u => u.sigla === uf)?.municipios ?? [];
	const fontes = precosApi ? [precosApi.precos.etanol?.fonte, precosApi.precos.gasolina?.fonte] : [];
	const precoEditado =
		estadoPrecos === 'ok' &&
		precosApi !== null &&
		(precoEtanol !== (precosApi.precos.etanol?.precoMedio ?? Number.NaN) || precoGasolina !== (precosApi.precos.gasolina?.precoMedio ?? Number.NaN));

	let chipPreco = { classe: 'chip', texto: 'Carregando…' };
	let dicaPreco: ReactNode = 'Buscando a média da ANP.';
	if (estadoPrecos === 'erro') {
		chipPreco = { classe: 'chip', texto: 'Indisponível' };
		dicaPreco = 'Não foi possível carregar a média da ANP. Digite os preços do posto.';
	} else if (estadoPrecos === 'sem_dados') {
		chipPreco = { classe: 'chip', texto: 'Sem dados' };
		dicaPreco = 'Ainda não há preços da ANP importados. Digite os preços do posto.';
	} else if (estadoPrecos === 'ok' && precosApi) {
		const semana = formatarSemana(precosApi.semana);
		if (precoEditado) {
			chipPreco = { classe: 'chip edited', texto: 'Editado por você' };
			const e = precosApi.precos.etanol;
			const g = precosApi.precos.gasolina;
			dicaPreco = `Média ANP: etanol ${e ? reais(e.precoMedio) : '—'}, gasolina ${g ? reais(g.precoMedio) : '—'}.`;
		} else if (fontes.every(f => f === 'municipio')) {
			chipPreco = { classe: 'chip', texto: 'Média ANP da cidade' };
			dicaPreco = (
				<>
					Média de <b>{precosApi.municipio?.nome}</b> na semana de {semana}. Ajuste para o preço do posto.
				</>
			);
		} else {
			chipPreco = { classe: 'chip', texto: 'Média ANP do estado' };
			dicaPreco = municipio ? (
				<>
					A ANP não pesquisou essa cidade nesta semana. Usando a média de <b>{UFS[uf]}</b> ({semana}).
				</>
			) : (
				<>
					Média de <b>{UFS[uf]}</b> na semana de {semana}. Ajuste para o preço do posto.
				</>
			);
		}
	}

	let chipConsumo = { classe: 'chip', texto: 'Informado por você' };
	let dicaConsumo = 'Use o consumo que você mede no dia a dia.';
	if (carroGaragem) {
		chipConsumo = consumoEditado ? { classe: 'chip edited', texto: 'Alterado, não salvo' } : { classe: 'chip ok', texto: 'Da sua garagem' };
		dicaConsumo = consumoEditado ? 'Salve para usar estes valores no site e no app.' : 'Valores salvos na sua conta.';
	} else if (carroCatalogo) {
		const inmetro = carroCatalogo.fonte === 'inmetro';
		const anoPbev = carroCatalogo.edicaoPbev?.match(/^\d{4}/)?.[0];
		chipConsumo = consumoEditado
			? { classe: 'chip edited', texto: 'Editado por você' }
			: { classe: 'chip', texto: inmetro ? `Inmetro PBEV${anoPbev ? ` ${anoPbev}` : ''}` : 'Valor de exemplo' };
		dicaConsumo = consumoEditado
			? 'O consumo real costuma ser diferente do teste. Seus valores valem para este cálculo.'
			: inmetro
				? `Consumo do teste padronizado do Inmetro${carroCatalogo.edicaoPbev ? `, tabela PBEV ${carroCatalogo.edicaoPbev}` : ''}.`
				: 'Valor de exemplo até a importação da tabela do Inmetro. Ajuste para o consumo do seu carro.';
	}

	const textoSalvar = carroGaragem ? (consumoEditado ? 'Salvar alterações' : 'Salvo na garagem') : 'Salvar na minha garagem';

	return (
		<>
			<div className="calc-grid">
				<form className="form-stack" onSubmit={e => e.preventDefault()} autoComplete="off">
					<div className="panel">
						<LocalizacaoAutomatica aoConfirmar={trocarLocal} idCidade="sel-municipio" />
						<div className="campos-2">
							<div className="field">
								<label htmlFor="sel-uf">Estado</label>
								<select
									id="sel-uf"
									className="entrada"
									value={uf}
									onChange={e => {
										const nova = e.target.value as Uf;
										trocarLocal(nova, '');
									}}
								>
									{(locais?.ufs ?? Object.entries(UFS).map(([sigla, nome]) => ({ sigla: sigla as Uf, nome }))).map(u => (
										<option key={u.sigla} value={u.sigla}>
											{u.nome}
										</option>
									))}
								</select>
							</div>
							<div className="field">
								<label htmlFor="sel-municipio">Cidade</label>
								<select id="sel-municipio" className="entrada" value={municipio} onChange={e => trocarLocal(uf, e.target.value)}>
									<option value="">Outra cidade (média do estado)</option>
									{municipiosDaUf.map(m => (
										<option key={m.chave} value={m.chave}>
											{m.nome}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>

					<div className="panel">
						<div className="panel-head">
							<h2>Seu carro</h2>
							<span className={chipConsumo.classe}>{chipConsumo.texto}</span>
						</div>
						<BuscaCarro garagem={garagemVisivel} rotuloSelecionado={rotuloCarro} aoEscolher={escolherCarro} />
						<div className="cons-table" role="group" aria-label="Consumo em km por litro">
							<span />
							<span className="col-h">Cidade</span>
							<span className="col-h">Estrada</span>
							{(['etanol', 'gasolina'] as const).map(c => (
								<FilaConsumo key={c} combustivel={c} campos={campos} aoAlterar={alterarCampo} aoSair={formatarCampo} />
							))}
						</div>
						<div className="row">
							<p className="hint grow">{dicaConsumo}</p>
							{carroCatalogo && consumoEditado && (
								<button type="button" className="btn ghost small" onClick={() => setCampos(camposBase)}>
									Restaurar valores do catálogo
								</button>
							)}
							<button type="button" className="btn small" onClick={salvarCarro} disabled={salvando || (!!carroGaragem && !consumoEditado)}>
								{salvando ? 'Salvando…' : textoSalvar}
							</button>
						</div>
					</div>

					<div className="panel">
						<div className="panel-head">
							<h2>Preço na bomba</h2>
							<span className={chipPreco.classe}>{chipPreco.texto}</span>
						</div>
						<div className="price-grid">
							{(['etanol', 'gasolina'] as const).map(c => (
								<div className="price-box" key={c}>
									<span className="fuel-tag">
										<span className={`dot ${c}`} />
										{c === 'etanol' ? 'Etanol' : 'Gasolina comum'}
									</span>
									<div className="unit-input pre">
										<span>R$</span>
										<input
											id={`preco-${c}`}
											className="entrada"
											type="text"
											inputMode="decimal"
											aria-label={`Preço ${c === 'etanol' ? 'do etanol' : 'da gasolina'} por litro`}
											value={precos[c]}
											onChange={e => setPrecos(p => ({ ...p, [c]: e.target.value }))}
											onBlur={() => {
												const v = lerDecimal(precos[c]);
												if (Number.isFinite(v))
													setPrecos(p => ({ ...p, [c]: decimalParaCampo(v, (precos[c].split(',')[1] ?? '').length === 3 ? 3 : 2) }));
											}}
										/>
									</div>
									{estadoPrecos === 'ok' && <FaixaPreco preco={precosApi?.precos[c]} atual={lerDecimal(precos[c])} />}
								</div>
							))}
						</div>
						<div className="row">
							<p className="hint grow">{dicaPreco}</p>
							{precoEditado && precosApi && (
								<button
									type="button"
									className="btn ghost small"
									onClick={() =>
										setPrecos({
											etanol: decimalParaCampo(precosApi.precos.etanol?.precoMedio, 2),
											gasolina: decimalParaCampo(precosApi.precos.gasolina?.precoMedio, 2),
										})
									}
								>
									Usar média da ANP
								</button>
							)}
						</div>
						<HistoricoPrecos uf={uf} municipio={municipio} />
					</div>

					<div className="panel">
						<div className="panel-head">
							<h2>Onde você mais roda</h2>
						</div>
						<div className="seg" role="group" aria-label="Perfil de uso">
							{ATALHOS_USO.map(a => (
								<button key={a.valor} type="button" aria-pressed={percentualCidade === a.valor} onClick={() => setPercentualCidade(a.valor)}>
									{a.rotulo}
								</button>
							))}
						</div>
						<div className="mix">
							<input
								id="percentual-cidade"
								type="range"
								min={0}
								max={100}
								step={5}
								value={percentualCidade}
								aria-label="Porcentagem na cidade"
								onChange={e => setPercentualCidade(Number(e.target.value))}
							/>
							<div className="mix-labels">
								<span>
									Cidade <b>{percentualCidade}%</b>
								</span>
								<span>
									Estrada <b>{100 - percentualCidade}%</b>
								</span>
							</div>
						</div>
						<details className="extras">
							<summary>Calcular economia em reais</summary>
							<div className="campos-2">
								<div className="field">
									<label htmlFor="tanque">Capacidade do tanque</label>
									<div className="unit-input">
										<input
											id="tanque"
											className="entrada"
											type="text"
											inputMode="numeric"
											value={tanque}
											onChange={e => setTanque(e.target.value)}
										/>
										<span>litros</span>
									</div>
								</div>
								<div className="field">
									<label htmlFor="km-mes">Quanto você roda por mês</label>
									<div className="unit-input">
										<input
											id="km-mes"
											className="entrada"
											type="text"
											inputMode="numeric"
											value={kmMes}
											onChange={e => setKmMes(e.target.value)}
											onBlur={() => Number.isFinite(kmPorMes) && setKmMes(numero(kmPorMes, 0))}
										/>
										<span>km</span>
									</div>
								</div>
							</div>
						</details>
					</div>
				</form>

				<Resultado resultado={resultado} nomeCarro={nomeCarro} precoGasolina={precoGasolina} kmPorMes={kmPorMes} />
			</div>
			<BarraResultado resultado={resultado} />
		</>
	);
}

type PropsFila = {
	combustivel: Combustivel;
	campos: CamposConsumo;
	aoAlterar: (c: Combustivel, t: 'cidade' | 'estrada', v: string) => void;
	aoSair: (c: Combustivel, t: 'cidade' | 'estrada') => void;
};

function FilaConsumo({ combustivel, campos, aoAlterar, aoSair }: PropsFila) {
	const nome = combustivel === 'etanol' ? 'Etanol' : 'Gasolina';
	return (
		<>
			<span className="fuel-tag">
				<span className={`dot ${combustivel}`} />
				{nome}
			</span>
			{(['cidade', 'estrada'] as const).map(t => (
				<div className="unit-input" key={t}>
					<input
						id={`consumo-${combustivel}-${t}`}
						className="entrada"
						type="text"
						inputMode="decimal"
						aria-label={`${nome} na ${t}, km por litro`}
						value={campos[combustivel][t]}
						onChange={e => aoAlterar(combustivel, t, e.target.value)}
						onBlur={() => aoSair(combustivel, t)}
					/>
					<span>km/l</span>
				</div>
			))}
		</>
	);
}
