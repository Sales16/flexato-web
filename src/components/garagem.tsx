'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { razaoLimiteDoCarro } from '@/lib/calculo';
import { chamarApi, mensagemDeErro } from '@/lib/api/cliente';
import { lerDecimal, numero } from '@/lib/formato';
import type { CarroApi, VeiculoCatalogoApi } from '@/lib/tipos-api';
import { CHAVE_CARRO_ESCOLHIDO } from './calculadora/calculadora';
import { useAvisos } from './provedor-avisos';
import { useSessao } from './provedor-sessao';

const ATRASO_BUSCA_MS = 250;
const CAMPOS_PERSONALIZADO = [
	{ id: 'etanol-cidade', rotulo: 'Etanol, cidade' },
	{ id: 'etanol-estrada', rotulo: 'Etanol, estrada' },
	{ id: 'gasolina-cidade', rotulo: 'Gasolina, cidade' },
	{ id: 'gasolina-estrada', rotulo: 'Gasolina, estrada' },
] as const;

type Aba = 'catalogo' | 'personalizado';

export function Garagem() {
	const { sessao, carregando, disponivel } = useSessao();
	const usuarioId = sessao?.user.id ?? null;
	const [dados, setDados] = useState<{ dono: string; itens: CarroApi[] } | null>(null);
	const [erroCarga, setErroCarga] = useState<string | null>(null);
	const carros = dados && dados.dono === usuarioId ? dados.itens : null;
	const atualizarCarros = (alterar: (itens: CarroApi[]) => CarroApi[]) => setDados(d => (d && d.dono === usuarioId ? { ...d, itens: alterar(d.itens) } : d));
	const [adicionando, setAdicionando] = useState(false);

	useEffect(() => {
		if (!usuarioId) return;
		let ativo = true;
		chamarApi<{ itens: CarroApi[] }>('/carros', { autenticado: true })
			.then(r => {
				if (ativo) {
					setDados({ dono: usuarioId, itens: r.itens });
					setErroCarga(null);
				}
			})
			.catch(e => {
				if (ativo) setErroCarga(mensagemDeErro(e, 'Não foi possível carregar seus carros.'));
			});
		return () => {
			ativo = false;
		};
	}, [usuarioId]);

	if (carregando) return <p className="hint">Carregando…</p>;

	if (!disponivel) {
		return (
			<div className="empty">
				<h2>Login indisponível</h2>
				<p>O Supabase ainda não foi configurado neste ambiente. Veja as variáveis em .env.example.</p>
			</div>
		);
	}

	if (!usuarioId) {
		return (
			<>
				<Cabecalho />
				<div className="empty">
					<h2>Guarde seus carros e use no app</h2>
					<p>Com uma conta, você salva o consumo de cada carro uma vez e calcula em segundos no site ou no celular.</p>
					<Link className="btn primary" href="/entrar">
						Entrar ou criar conta
					</Link>
				</div>
			</>
		);
	}

	return (
		<>
			<Cabecalho aoAdicionar={() => setAdicionando(true)} />
			{adicionando && (
				<PainelAdicionar
					aoFechar={() => setAdicionando(false)}
					aoAdicionar={carro => {
						atualizarCarros(itens => [...itens, carro]);
						setAdicionando(false);
					}}
				/>
			)}
			{erroCarga ? (
				<p className="hint erro">{erroCarga}</p>
			) : carros === null ? (
				<p className="hint">Carregando seus carros…</p>
			) : carros.length === 0 ? (
				<div className="empty">
					<h2>Nenhum carro ainda</h2>
					<p>Adicione um carro do catálogo ou informe os consumos do seu.</p>
				</div>
			) : (
				<div className="cars">
					{carros.map(carro => (
						<CartaoCarro key={carro.id} carro={carro} aoRemover={id => atualizarCarros(itens => itens.filter(x => x.id !== id))} />
					))}
				</div>
			)}
		</>
	);
}

function Cabecalho({ aoAdicionar }: { aoAdicionar?: () => void }) {
	return (
		<div className="page-head">
			<div>
				<p className="eyebrow">Garagem</p>
				<h1>Meus carros</h1>
			</div>
			{aoAdicionar && (
				<button type="button" className="btn primary" onClick={aoAdicionar}>
					Adicionar carro
				</button>
			)}
		</div>
	);
}

function CartaoCarro({ carro, aoRemover }: { carro: CarroApi; aoRemover: (id: string) => void }) {
	const router = useRouter();
	const avisar = useAvisos();
	const [removendo, setRemovendo] = useState(false);
	const { etanol, gasolina } = carro.consumo;

	async function remover() {
		setRemovendo(true);
		try {
			await chamarApi(`/carros/${carro.id}`, { method: 'DELETE', autenticado: true });
			aoRemover(carro.id);
			avisar(`"${carro.nome}" removido`);
		} catch (e) {
			avisar(mensagemDeErro(e, 'Não foi possível remover o carro.'));
			setRemovendo(false);
		}
	}

	function usar() {
		try {
			sessionStorage.setItem(CHAVE_CARRO_ESCOLHIDO, carro.id);
		} catch {}
		router.push('/');
	}

	return (
		<article className="car">
			<div className="car-head">
				<div>
					<h3>{carro.nome}</h3>
					<p>{carro.catalogoId ? 'Baseado no catálogo' : 'Cadastro personalizado'}</p>
				</div>
				<span className={carro.catalogoId ? 'chip' : 'chip edited'}>{carro.catalogoId ? 'Catálogo' : 'Personalizado'}</span>
			</div>
			<div className="mini">
				<span />
				<span className="h">Cidade</span>
				<span className="h">Estrada</span>
				<span className="fuel-tag">
					<span className="dot etanol" />
					Etanol
				</span>
				<span className="num">{numero(etanol.cidade, 1)}</span>
				<span className="num">{numero(etanol.estrada, 1)}</span>
				<span className="fuel-tag">
					<span className="dot gasolina" />
					Gasolina
				</span>
				<span className="num">{numero(gasolina.cidade, 1)}</span>
				<span className="num">{numero(gasolina.estrada, 1)}</span>
			</div>
			<p className="ratio-line">
				No uso misto, o etanol compensa até <b>{numero(razaoLimiteDoCarro(carro.consumo) * 100, 1)}%</b> do preço da gasolina.
			</p>
			<div className="car-actions">
				<button type="button" className="btn primary small" onClick={usar}>
					Usar no cálculo
				</button>
				<button type="button" className="btn ghost small" onClick={remover} disabled={removendo}>
					{removendo ? 'Removendo…' : 'Remover'}
				</button>
			</div>
		</article>
	);
}

function PainelAdicionar({ aoFechar, aoAdicionar }: { aoFechar: () => void; aoAdicionar: (carro: CarroApi) => void }) {
	const avisar = useAvisos();
	const [aba, setAba] = useState<Aba>('catalogo');
	const [termo, setTermo] = useState('');
	const [itens, setItens] = useState<VeiculoCatalogoApi[] | null>(null);
	const [erroBusca, setErroBusca] = useState<string | null>(null);
	const [ocupado, setOcupado] = useState(false);
	const [erroForm, setErroForm] = useState<string | null>(null);

	useEffect(() => {
		let ativo = true;
		const timer = setTimeout(() => {
			chamarApi<{ itens: VeiculoCatalogoApi[] }>(`/catalogo?${new URLSearchParams({ q: termo, limite: '50' })}`)
				.then(r => {
					if (!ativo) return;
					setItens(r.itens);
					setErroBusca(null);
				})
				.catch(e => {
					if (ativo) setErroBusca(mensagemDeErro(e, 'Não foi possível buscar no catálogo.'));
				});
		}, ATRASO_BUSCA_MS);
		return () => {
			ativo = false;
			clearTimeout(timer);
		};
	}, [termo]);

	async function criar(corpo: { nome: string; catalogoId: number | null; consumo: VeiculoCatalogoApi['consumo'] }) {
		setOcupado(true);
		try {
			const carro = await chamarApi<CarroApi>('/carros', { method: 'POST', corpo, autenticado: true });
			aoAdicionar(carro);
			avisar(`"${carro.nome}" salvo na garagem`);
		} catch (e) {
			avisar(mensagemDeErro(e, 'Não foi possível salvar o carro.'));
		} finally {
			setOcupado(false);
		}
	}

	function salvarPersonalizado(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const dados = new FormData(e.currentTarget);
		const nome = String(dados.get('nome') ?? '').trim();
		const [ec, ee, gc, ge] = CAMPOS_PERSONALIZADO.map(c => lerDecimal(String(dados.get(c.id) ?? '')));
		if (!nome) return setErroForm('Dê um nome ao carro para reconhecê-lo depois.');
		if (![ec, ee, gc, ge].every(Number.isFinite)) return setErroForm('Informe os quatro consumos em km/l, por exemplo 9,5.');
		setErroForm(null);
		criar({ nome, catalogoId: null, consumo: { etanol: { cidade: ec, estrada: ee }, gasolina: { cidade: gc, estrada: ge } } });
	}

	return (
		<div className="panel add-panel">
			<div className="panel-head">
				<h2>Adicionar carro</h2>
				<button type="button" className="btn ghost small" onClick={aoFechar}>
					Fechar
				</button>
			</div>
			<div className="tabs" role="tablist">
				<button
					type="button"
					role="tab"
					id="aba-catalogo"
					aria-selected={aba === 'catalogo'}
					aria-controls="painel-catalogo"
					onClick={() => setAba('catalogo')}
				>
					Buscar no catálogo
				</button>
				<button
					type="button"
					role="tab"
					id="aba-personalizado"
					aria-selected={aba === 'personalizado'}
					aria-controls="painel-personalizado"
					onClick={() => setAba('personalizado')}
				>
					Meu carro não está na lista
				</button>
			</div>

			{aba === 'catalogo' ? (
				<div id="painel-catalogo" role="tabpanel" aria-labelledby="aba-catalogo" className="form-stack">
					<input
						id="busca-catalogo"
						className="entrada"
						type="search"
						placeholder="Busque por marca ou modelo, ex.: Onix"
						aria-label="Buscar no catálogo"
						value={termo}
						onChange={e => setTermo(e.target.value)}
						autoFocus
					/>
					<div className="catalog-list">
						{erroBusca && <p className="hint erro">{erroBusca}</p>}
						{!erroBusca && itens === null && <p className="hint">Buscando…</p>}
						{!erroBusca && itens?.length === 0 && (
							<p className="hint">Nada encontrado para &quot;{termo}&quot;. Cadastre em &quot;Meu carro não está na lista&quot;.</p>
						)}
						{itens?.map(c => (
							<div className="cat-item" key={c.id}>
								<div>
									<div className="t">
										{c.marca} {c.modelo}
									</div>
									<div className="d">
										{c.versao} · etanol {numero(c.consumo.etanol.cidade, 1)}/{numero(c.consumo.etanol.estrada, 1)} · gasolina{' '}
										{numero(c.consumo.gasolina.cidade, 1)}/{numero(c.consumo.gasolina.estrada, 1)} km/l
										{c.fonte === 'exemplo' && ' · valor de exemplo'}
									</div>
								</div>
								<button
									type="button"
									className="btn small"
									disabled={ocupado}
									onClick={() => criar({ nome: `Meu ${c.modelo}`, catalogoId: c.id, consumo: c.consumo })}
								>
									Adicionar
								</button>
							</div>
						))}
					</div>
				</div>
			) : (
				<form id="painel-personalizado" role="tabpanel" aria-labelledby="aba-personalizado" className="form-stack" onSubmit={salvarPersonalizado}>
					<div className="field">
						<label htmlFor="nome-carro">Nome do carro</label>
						<input id="nome-carro" name="nome" className="entrada" type="text" placeholder="Ex.: Gol do trabalho" maxLength={60} />
					</div>
					<div className="campos-2">
						{CAMPOS_PERSONALIZADO.map(c => (
							<div className="field" key={c.id}>
								<label htmlFor={`personalizado-${c.id}`}>{c.rotulo}</label>
								<div className="unit-input">
									<input id={`personalizado-${c.id}`} name={c.id} className="entrada" type="text" inputMode="decimal" />
									<span>km/l</span>
								</div>
							</div>
						))}
					</div>
					{erroForm && <p className="hint erro">{erroForm}</p>}
					<div className="row">
						<button type="submit" className="btn primary" disabled={ocupado}>
							{ocupado ? 'Salvando…' : 'Salvar carro'}
						</button>
						<span className="hint">Fica visível só na sua conta.</span>
					</div>
				</form>
			)}
		</div>
	);
}
