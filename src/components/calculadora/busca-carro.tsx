'use client';

import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { chamarApi, mensagemDeErro } from '@/lib/api/cliente';
import { normalizarBusca, palavrasDaBusca } from '@/lib/busca-catalogo';
import { acaoDaTecla, chaveAoNavegar, indiceDaChave, opcaoAoConfirmar, textoDoCampo } from '@/lib/navegacao-combo';
import type { Consumo } from '@/lib/calculo';
import { numero } from '@/lib/formato';
import type { CarroApi, VeiculoCatalogoApi } from '@/lib/tipos-api';

const ATRASO_BUSCA_MS = 250;
const MINIMO_LETRAS = 2;
const LIMITE_RESULTADOS = 20;

export type EscolhaCarro = { tipo: 'garagem'; carro: CarroApi } | { tipo: 'catalogo'; carro: VeiculoCatalogoApi } | { tipo: 'outro' };

type Opcao = EscolhaCarro & { chave: string; titulo: string; detalhe: string };
type Busca = { termo: string; itens: VeiculoCatalogoApi[] | null; erro: string | null };

type Props = {
	garagem: CarroApi[];
	rotuloSelecionado: string;
	aoEscolher: (escolha: EscolhaCarro) => void;
};

function resumoConsumo(consumo: Consumo): string {
	const par = (c: Consumo['etanol']) => `${numero(c.cidade, 1)}/${numero(c.estrada, 1)}`;
	return `etanol ${par(consumo.etanol)} · gasolina ${par(consumo.gasolina)} km/l`;
}

export function BuscaCarro({ garagem, rotuloSelecionado, aoEscolher }: Props) {
	const id = useId();
	const idLista = `${id}-lista`;
	const idOpcao = (chave: string) => `${id}-${chave}`;
	const [texto, setTexto] = useState(rotuloSelecionado);
	const [editando, setEditando] = useState(false);
	const [aberto, setAberto] = useState(false);
	const [chaveAtiva, setChaveAtiva] = useState<string | null>(null);
	const [busca, setBusca] = useState<Busca>({ termo: '', itens: null, erro: null });

	const termo = editando ? texto.trim() : '';
	const buscarNoCatalogo = palavrasDaBusca(termo).join('').length >= MINIMO_LETRAS;
	const valorExibido = textoDoCampo(editando, texto, rotuloSelecionado);

	useEffect(() => {
		if (!buscarNoCatalogo) return;
		let ativa = true;
		const timer = setTimeout(() => {
			chamarApi<{ itens: VeiculoCatalogoApi[] }>(`/catalogo?${new URLSearchParams({ q: termo, limite: String(LIMITE_RESULTADOS) })}`)
				.then(r => {
					if (ativa) setBusca({ termo, itens: r.itens, erro: null });
				})
				.catch(e => {
					if (ativa) setBusca({ termo, itens: null, erro: mensagemDeErro(e, 'Não foi possível buscar no catálogo.') });
				});
		}, ATRASO_BUSCA_MS);
		return () => {
			ativa = false;
			clearTimeout(timer);
		};
	}, [termo, buscarNoCatalogo]);

	const palavras = palavrasDaBusca(termo);
	const daGaragem = garagem.filter(c => palavras.every(p => normalizarBusca(c.nome).includes(p)));
	const buscaAtual = buscarNoCatalogo && busca.termo === termo ? busca : null;
	const doCatalogo = buscaAtual?.itens ?? [];

	const opcoes: Opcao[] = [
		...daGaragem.map(c => ({ tipo: 'garagem' as const, carro: c, chave: `gar-${c.id}`, titulo: c.nome, detalhe: resumoConsumo(c.consumo) })),
		...doCatalogo.map(c => ({
			tipo: 'catalogo' as const,
			carro: c,
			chave: `cat-${c.id}`,
			titulo: `${c.marca} ${c.modelo}`,
			detalhe: `${c.versao} · ${resumoConsumo(c.consumo)}${c.fonte === 'exemplo' ? ' · valor de exemplo' : ''}`,
		})),
		{ tipo: 'outro', chave: 'outro', titulo: 'Outro carro', detalhe: 'Digitar os consumos do seu carro' },
	];
	const indiceAtivo = indiceDaChave(opcoes, chaveAtiva);

	let aviso: string | null = null;
	if (!buscarNoCatalogo) aviso = 'Digite a marca ou o modelo para buscar no catálogo do Inmetro.';
	else if (!buscaAtual) aviso = 'Buscando no catálogo…';
	else if (buscaAtual.erro) aviso = buscaAtual.erro;
	else if (!doCatalogo.length) aviso = `Nada encontrado no catálogo para "${termo}". Escolha "Outro carro" e digite os consumos.`;
	const anuncio = !aberto ? '' : (aviso ?? `${doCatalogo.length} ${doCatalogo.length === 1 ? 'carro encontrado' : 'carros encontrados'} no catálogo.`);

	const idAtivo = aberto && indiceAtivo >= 0 ? idOpcao(opcoes[indiceAtivo].chave) : undefined;

	useEffect(() => {
		if (idAtivo) document.getElementById(idAtivo)?.scrollIntoView({ block: 'nearest' });
	}, [idAtivo]);

	function fechar() {
		setAberto(false);
		setEditando(false);
		setChaveAtiva(null);
		setTexto(rotuloSelecionado);
	}

	function escolher(opcao: Opcao) {
		if (opcao.tipo === 'garagem') aoEscolher({ tipo: 'garagem', carro: opcao.carro });
		else if (opcao.tipo === 'catalogo') aoEscolher({ tipo: 'catalogo', carro: opcao.carro });
		else aoEscolher({ tipo: 'outro' });
		setAberto(false);
		setEditando(false);
		setChaveAtiva(null);
	}

	function abrir() {
		if (aberto) return;
		if (!editando) setTexto(rotuloSelecionado);
		setAberto(true);
	}

	function aoTeclar(e: KeyboardEvent<HTMLInputElement>) {
		const acao = acaoDaTecla(e.key, e.nativeEvent.isComposing);
		if (acao?.tipo === 'navegar') {
			e.preventDefault();
			if (!aberto) {
				abrir();
				setChaveAtiva(chaveAoNavegar(opcoes, null, acao.passo));
				return;
			}
			setChaveAtiva(chaveAoNavegar(opcoes, chaveAtiva, acao.passo));
		} else if (acao?.tipo === 'confirmar') {
			if (!aberto) return;
			e.preventDefault();
			const opcao = opcaoAoConfirmar(opcoes, chaveAtiva, termo);
			if (opcao) escolher(opcao);
		} else if (acao?.tipo === 'fechar') {
			if (aberto) {
				e.preventDefault();
				fechar();
			}
		}
	}

	const grupos = [
		{ rotulo: 'Minha garagem', itens: opcoes.filter(o => o.tipo === 'garagem') },
		{ rotulo: 'Catálogo', itens: opcoes.filter(o => o.tipo === 'catalogo') },
		{ rotulo: 'Não encontrou?', itens: opcoes.filter(o => o.tipo === 'outro') },
	].filter(g => g.itens.length);

	return (
		<div className="field">
			<label htmlFor={`${id}-entrada`}>Modelo</label>
			<div className="combo">
				<input
					id={`${id}-entrada`}
					className="entrada"
					type="text"
					role="combobox"
					aria-autocomplete="list"
					aria-expanded={aberto}
					aria-controls={idLista}
					aria-activedescendant={idAtivo}
					placeholder="Busque por marca ou modelo, ex.: Onix"
					autoComplete="off"
					spellCheck={false}
					value={valorExibido}
					onChange={e => {
						setTexto(e.target.value);
						setEditando(true);
						setAberto(true);
						setChaveAtiva(null);
					}}
					onFocus={e => e.currentTarget.select()}
					onClick={abrir}
					onKeyDown={aoTeclar}
					onBlur={fechar}
				/>
				{aberto && (
					<div className="combo-popup" onMouseDown={e => e.preventDefault()}>
						{aviso && <p className="hint combo-aviso">{aviso}</p>}
						<div id={idLista} role="listbox" aria-label="Carros">
							{grupos.map(g => (
								<div key={g.rotulo} role="group" aria-labelledby={`${id}-grupo-${g.itens[0].tipo}`}>
									<div id={`${id}-grupo-${g.itens[0].tipo}`} className="combo-grupo" role="presentation">
										{g.rotulo}
									</div>
									{g.itens.map(o => {
										const indice = opcoes.indexOf(o);
										return (
											<div
												key={o.chave}
												id={idOpcao(o.chave)}
												role="option"
												aria-selected={indice === indiceAtivo}
												className="combo-opcao"
												onClick={() => escolher(o)}
												onMouseMove={() => indice !== indiceAtivo && setChaveAtiva(o.chave)}
											>
												<span className="t">{o.titulo}</span>
												<span className="d">{o.detalhe}</span>
											</div>
										);
									})}
								</div>
							))}
						</div>
					</div>
				)}
			</div>
			<p className="sr-only" aria-live="polite">
				{anuncio}
			</p>
		</div>
	);
}
