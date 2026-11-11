'use client';

import { useEffect, useRef, useState } from 'react';
import { chamarApi, ErroApi } from '@/lib/api/cliente';
import { arredondar, dentroDoBrasil } from '@/lib/localizacao/coordenadas';
import { FalhaLocalizacao, obterPosicao } from '@/lib/localizacao/navegador';
import type { LocalizacaoApi } from '@/lib/tipos-api';
import { UFS, type Uf } from '@/lib/ufs';

type Estado =
	| { etapa: 'fechado' }
	| { etapa: 'explicando' }
	| { etapa: 'buscando' }
	| { etapa: 'confirmando'; local: LocalizacaoApi }
	| { etapa: 'erro'; mensagem: string; repetir: boolean };

const ID_BOTAO = 'btn-localizacao';
const ERRO_API = 'Não foi possível identificar sua cidade agora. Tente de novo ou escolha a cidade abaixo.';

function focar(id: string) {
	setTimeout(() => document.getElementById(id)?.focus());
}

function mensagemDaFalha(e: unknown): { mensagem: string; repetir: boolean } {
	if (e instanceof FalhaLocalizacao) return { mensagem: e.message, repetir: e.motivo !== 'sem_suporte' && e.motivo !== 'fora_do_brasil' };
	if (e instanceof ErroApi && (e.codigo === 'fora_do_brasil' || e.codigo === 'municipio_nao_encontrado')) return { mensagem: e.message, repetir: false };
	return { mensagem: ERRO_API, repetir: true };
}

type Props = { aoConfirmar: (uf: Uf, municipioChave: string) => void; idCidade: string };

export function LocalizacaoAutomatica({ aoConfirmar, idCidade }: Props) {
	const [estado, setEstado] = useState<Estado>({ etapa: 'fechado' });
	const pedido = useRef(0);
	const caixa = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (estado.etapa !== 'fechado') caixa.current?.focus();
	}, [estado.etapa]);

	function fechar(foco: string) {
		pedido.current++;
		setEstado({ etapa: 'fechado' });
		focar(foco);
	}

	async function localizar() {
		const atual = ++pedido.current;
		setEstado({ etapa: 'buscando' });
		try {
			const posicao = arredondar(await obterPosicao());
			if (!dentroDoBrasil(posicao)) throw new FalhaLocalizacao('fora_do_brasil');
			const consulta = new URLSearchParams({ lat: String(posicao.lat), lng: String(posicao.lng) });
			const local = await chamarApi<LocalizacaoApi>(`/localizacao?${consulta}`);
			if (atual === pedido.current) setEstado({ etapa: 'confirmando', local });
		} catch (e) {
			if (atual === pedido.current) setEstado({ etapa: 'erro', ...mensagemDaFalha(e) });
		}
	}

	function confirmar(local: LocalizacaoApi) {
		aoConfirmar(local.uf, local.municipio.chave ?? '');
		fechar(idCidade);
	}

	return (
		<>
			<div className="panel-head">
				<h2>Onde você vai abastecer</h2>
				<button
					id={ID_BOTAO}
					type="button"
					className="btn ghost small"
					aria-expanded={estado.etapa !== 'fechado'}
					disabled={estado.etapa !== 'fechado'}
					onClick={() => setEstado({ etapa: 'explicando' })}
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
						<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
						<circle cx="12" cy="9.5" r="2.5" />
					</svg>
					Usar minha localização
				</button>
			</div>

			{estado.etapa !== 'fechado' && (
				<div className="consent" ref={caixa} tabIndex={-1} role="group" aria-label="Localização automática" aria-live="polite">
					{estado.etapa === 'explicando' && (
						<>
							<p>
								<b>O navegador vai pedir permissão para informar sua localização.</b> Usamos a posição só para descobrir a cidade e o estado.
								Ela não é salva.
							</p>
							<div className="row">
								<button type="button" className="btn primary small" onClick={localizar}>
									Continuar
								</button>
								<button type="button" className="btn ghost small" onClick={() => fechar(ID_BOTAO)}>
									Agora não
								</button>
							</div>
						</>
					)}

					{estado.etapa === 'buscando' && (
						<div className="row">
							<p className="grow">Descobrindo sua cidade…</p>
							<button type="button" className="btn ghost small" onClick={() => fechar(ID_BOTAO)}>
								Cancelar
							</button>
						</div>
					)}

					{estado.etapa === 'confirmando' && (
						<>
							<p>
								Você está em{' '}
								<b>
									{estado.local.municipio.nome} · {estado.local.uf}
								</b>
								?
							</p>
							{!estado.local.municipio.chave && (
								<p className="hint">A ANP não pesquisou preços nessa cidade na última semana. Vamos usar a média de {UFS[estado.local.uf]}.</p>
							)}
							<div className="row">
								<button type="button" className="btn primary small" onClick={() => confirmar(estado.local)}>
									Confirmar
								</button>
								<button type="button" className="btn ghost small" onClick={() => fechar(idCidade)}>
									Escolher outra cidade
								</button>
							</div>
						</>
					)}

					{estado.etapa === 'erro' && (
						<>
							<p className="erro">{estado.mensagem}</p>
							<div className="row">
								{estado.repetir && (
									<button type="button" className="btn small" onClick={localizar}>
										Tentar de novo
									</button>
								)}
								<button type="button" className="btn ghost small" onClick={() => fechar(estado.repetir ? ID_BOTAO : idCidade)}>
									Fechar
								</button>
							</div>
						</>
					)}
				</div>
			)}
		</>
	);
}
