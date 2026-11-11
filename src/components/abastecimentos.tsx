'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Combustivel } from '@/lib/calculo';
import { chamarApi, mensagemDeErro } from '@/lib/api/cliente';
import type { ConsumoMedido, MotivoDescarte, Trecho, TrechoMedido } from '@/lib/consumo-real';
import { lerDecimal, lerInteiro, numero, reais } from '@/lib/formato';
import type { AbastecimentoApi, AbastecimentosApi, CarroApi } from '@/lib/tipos-api';
import { useAvisos } from './provedor-avisos';

const NOME_COMBUSTIVEL: Record<Combustivel, string> = { etanol: 'Etanol', gasolina: 'Gasolina' };
const NOME_TRECHO: Record<Trecho, string> = { cidade: 'Cidade', estrada: 'Estrada', misto: 'Misto' };
const TRECHO_MEDIDO: Record<TrechoMedido, string> = { cidade: 'na cidade', estrada: 'na estrada' };
const MOTIVO: Record<MotivoDescarte, string> = {
	hodometro_inconsistente: 'hodômetro igual ou menor que o anterior',
	litros_invalidos: 'litros zerados',
	combustiveis_misturados: 'troca de combustível no meio',
	consumo_implausivel: 'consumo fora de 2 a 40 km/l, talvez um abastecimento sem registro',
};

type Carga = { carroId: string; dados: AbastecimentosApi | null; erro: string | null };

const doisDigitos = (n: number) => String(n).padStart(2, '0');

function hoje(): string {
	const d = new Date();
	return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

function dataCurta(iso: string): string {
	const [a, m, d] = iso.split('-');
	return `${d}/${m}/${a}`;
}

const umaCasa = (v: number) => Math.round(v * 10) / 10;

export function Abastecimentos({ carro, aoAlterarCarro }: { carro: CarroApi; aoAlterarCarro: (carro: CarroApi) => void }) {
	const [versao, setVersao] = useState(0);
	const [carga, setCarga] = useState<Carga | null>(null);
	const recarregar = () => setVersao(v => v + 1);

	useEffect(() => {
		let ativo = true;
		chamarApi<AbastecimentosApi>(`/carros/${carro.id}/abastecimentos`, { autenticado: true })
			.then(dados => {
				if (ativo) setCarga({ carroId: carro.id, dados, erro: null });
			})
			.catch(e => {
				if (ativo) setCarga({ carroId: carro.id, dados: null, erro: mensagemDeErro(e, 'Não foi possível carregar os abastecimentos.') });
			});
		return () => {
			ativo = false;
		};
	}, [carro.id, versao]);

	const atual = carga?.carroId === carro.id ? carga : null;
	const dados = atual?.dados ?? null;
	const ultimo = dados?.itens.at(-1);

	return (
		<section className="secao-abast" aria-label={`Abastecimentos de ${carro.nome}`}>
			<div className="grid gap-2">
				<h4>Consumo medido</h4>
				{!atual ? (
					<p className="hint">Carregando abastecimentos…</p>
				) : atual.erro ? (
					<div className="row">
						<p className="hint erro grow">{atual.erro}</p>
						<button type="button" className="btn small" onClick={recarregar}>
							Tentar de novo
						</button>
					</div>
				) : (
					dados && <ConsumoMedidoCarro carro={carro} dados={dados} aoAlterarCarro={aoAlterarCarro} />
				)}
			</div>

			<div className="grid gap-2">
				<h4>Registrar abastecimento</h4>
				<FormAbastecimento carroId={carro.id} ultimo={ultimo} aoSalvar={recarregar} />
			</div>

			{dados && dados.itens.length > 0 && (
				<div className="grid gap-2">
					<h4>Histórico ({dados.itens.length})</h4>
					<ListaAbastecimentos carroId={carro.id} itens={dados.itens} aoRemover={recarregar} />
				</div>
			)}
		</section>
	);
}

function ConsumoMedidoCarro({ carro, dados, aoAlterarCarro }: { carro: CarroApi; dados: AbastecimentosApi; aoAlterarCarro: (carro: CarroApi) => void }) {
	const { medicoes, intervalos } = dados.consumoReal;
	const descartados = intervalos.filter(i => i.motivoDescarte);
	const motivos = [...new Set(descartados.map(i => MOTIVO[i.motivoDescarte!]))];

	return (
		<>
			{medicoes.length === 0 ? (
				<p className="hint">
					Para medir, registre dois abastecimentos seguidos de <b>tanque cheio</b> com o mesmo combustível. Os parciais entre eles também contam.
				</p>
			) : (
				<div className="medicoes">
					{medicoes.map(m => (
						<Medicao key={`${m.combustivel}-${m.trecho}`} carro={carro} medicao={m} aoAlterarCarro={aoAlterarCarro} />
					))}
				</div>
			)}
			{descartados.length > 0 && (
				<p className="hint">
					{descartados.length === 1
						? '1 intervalo entre tanques cheios foi ignorado'
						: `${descartados.length} intervalos entre tanques cheios foram ignorados`}
					: {motivos.join('; ')}.
				</p>
			)}
		</>
	);
}

function Medicao({ carro, medicao: m, aoAlterarCarro }: { carro: CarroApi; medicao: ConsumoMedido; aoAlterarCarro: (carro: CarroApi) => void }) {
	const avisar = useAvisos();
	const [confirmando, setConfirmando] = useState(false);
	const [salvando, setSalvando] = useState(false);
	const [erro, setErro] = useState<string | null>(null);
	const sugerido = umaCasa(m.kmPorLitro);
	const cadastrado = m.trecho ? carro.consumo[m.combustivel][m.trecho] : null;
	const nome = NOME_COMBUSTIVEL[m.combustivel];

	async function aplicar() {
		if (!m.trecho) return;
		setSalvando(true);
		setErro(null);
		try {
			const consumo = { ...carro.consumo, [m.combustivel]: { ...carro.consumo[m.combustivel], [m.trecho]: sugerido } };
			const atualizado = await chamarApi<CarroApi>(`/carros/${carro.id}`, { method: 'PATCH', corpo: { consumo }, autenticado: true });
			aoAlterarCarro(atualizado);
			setConfirmando(false);
			avisar(`Consumo de ${nome.toLowerCase()} ${TRECHO_MEDIDO[m.trecho]} atualizado`);
		} catch (e) {
			setErro(mensagemDeErro(e, 'Não foi possível atualizar o consumo.'));
		} finally {
			setSalvando(false);
		}
	}

	return (
		<div className="medicao">
			<div className="medicao-topo">
				<span className="fuel-tag">
					<span className={`dot ${m.combustivel}`} />
					{nome} {m.trecho ? TRECHO_MEDIDO[m.trecho] : '· trechos misturados'}
				</span>
				<span className="medicao-valor">
					{numero(m.kmPorLitro, 1)}
					<small> km/l</small>
				</span>
			</div>
			<p className="hint">
				{numero(m.km, 0)} km com {numero(m.litros, 2)} L em {m.intervalos === 1 ? '1 medição' : `${m.intervalos} medições`}
				{cadastrado !== null && (
					<>
						{' '}
						· cadastrado: <b className="num">{numero(cadastrado, 1)} km/l</b>
					</>
				)}
			</p>
			{m.trecho === null ? (
				<p className="hint">Marque o trecho (cidade ou estrada) nos abastecimentos para comparar com o consumo cadastrado.</p>
			) : cadastrado === sugerido ? (
				<p className="hint">Igual ao consumo cadastrado.</p>
			) : confirmando ? (
				<div className="confirmar" role="group" aria-label="Confirmar troca de consumo">
					<p>
						Trocar {nome.toLowerCase()} {TRECHO_MEDIDO[m.trecho]} de <b className="num">{numero(cadastrado ?? 0, 1)}</b> para{' '}
						<b className="num">{numero(sugerido, 1)} km/l</b>? Os outros consumos continuam iguais.
					</p>
					{erro && <p className="hint erro">{erro}</p>}
					<div className="row">
						<button type="button" className="btn primary small" onClick={aplicar} disabled={salvando}>
							{salvando ? 'Salvando…' : 'Confirmar troca'}
						</button>
						<button type="button" className="btn ghost small" onClick={() => setConfirmando(false)} disabled={salvando}>
							Cancelar
						</button>
					</div>
				</div>
			) : (
				<div className="row">
					<button type="button" className="btn small" onClick={() => setConfirmando(true)}>
						Usar este consumo
					</button>
				</div>
			)}
		</div>
	);
}

function FormAbastecimento({ carroId, ultimo, aoSalvar }: { carroId: string; ultimo: AbastecimentoApi | undefined; aoSalvar: () => void }) {
	const avisar = useAvisos();
	const [dataPadrao] = useState(hoje);
	const [salvando, setSalvando] = useState(false);
	const [erro, setErro] = useState<string | null>(null);
	const prefixo = `abast-${carroId}`;

	async function salvar(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const formulario = e.currentTarget;
		const campos = new FormData(formulario);
		const data = String(campos.get('data') ?? '');
		const combustivel = String(campos.get('combustivel')) as Combustivel;
		const litros = lerDecimal(String(campos.get('litros') ?? ''));
		const hodometroKm = lerInteiro(String(campos.get('hodometro') ?? ''));
		const textoPreco = String(campos.get('preco') ?? '').trim();
		const precoLitro = textoPreco ? lerDecimal(textoPreco) : null;
		const trecho = String(campos.get('trecho') ?? '');

		if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return setErro('Informe a data do abastecimento.');
		if (!Number.isFinite(litros) || litros >= 1000) return setErro('Informe os litros abastecidos, por exemplo 38,5.');
		if (!Number.isFinite(hodometroKm) || hodometroKm >= 10000000) return setErro('Informe o hodômetro em km, sem casas decimais.');
		if (precoLitro !== null && (!Number.isFinite(precoLitro) || precoLitro >= 100))
			return setErro('Preço por litro inválido. Deixe em branco se não souber.');
		setErro(null);
		setSalvando(true);
		try {
			await chamarApi<AbastecimentoApi>(`/carros/${carroId}/abastecimentos`, {
				method: 'POST',
				autenticado: true,
				corpo: {
					data,
					combustivel,
					litros,
					hodometroKm,
					precoLitro,
					tanqueCheio: campos.get('cheio') === 'on',
					trecho: trecho ? (trecho as Trecho) : null,
				},
			});
			formulario.reset();
			avisar('Abastecimento registrado');
			aoSalvar();
		} catch (e) {
			setErro(mensagemDeErro(e, 'Não foi possível registrar o abastecimento.'));
		} finally {
			setSalvando(false);
		}
	}

	return (
		<form className="grid gap-3" onSubmit={salvar} noValidate>
			<div className="form-abast">
				<div className="field">
					<label htmlFor={`${prefixo}-data`}>Data</label>
					<input id={`${prefixo}-data`} name="data" className="entrada" type="date" defaultValue={dataPadrao} max={dataPadrao} required />
				</div>
				<div className="field">
					<label htmlFor={`${prefixo}-combustivel`}>Combustível</label>
					<select id={`${prefixo}-combustivel`} name="combustivel" className="entrada" defaultValue={ultimo?.combustivel ?? 'etanol'}>
						<option value="etanol">Etanol</option>
						<option value="gasolina">Gasolina</option>
					</select>
				</div>
				<div className="field">
					<label htmlFor={`${prefixo}-litros`}>Litros</label>
					<div className="unit-input">
						<input id={`${prefixo}-litros`} name="litros" className="entrada" type="text" inputMode="decimal" required />
						<span>L</span>
					</div>
				</div>
				<div className="field">
					<label htmlFor={`${prefixo}-hodometro`}>Hodômetro</label>
					<div className="unit-input">
						<input id={`${prefixo}-hodometro`} name="hodometro" className="entrada" type="text" inputMode="numeric" required />
						<span>km</span>
					</div>
				</div>
				<div className="field">
					<label htmlFor={`${prefixo}-preco`}>Preço por litro (opcional)</label>
					<div className="unit-input pre">
						<span>R$</span>
						<input id={`${prefixo}-preco`} name="preco" className="entrada" type="text" inputMode="decimal" />
					</div>
				</div>
				<div className="field">
					<label htmlFor={`${prefixo}-trecho`}>Rodou mais na (opcional)</label>
					<select id={`${prefixo}-trecho`} name="trecho" className="entrada" defaultValue="">
						<option value="">Não informar</option>
						<option value="cidade">Cidade</option>
						<option value="estrada">Estrada</option>
						<option value="misto">Cidade e estrada</option>
					</select>
				</div>
			</div>
			<label className="checkbox">
				<input type="checkbox" name="cheio" defaultChecked />
				Enchi o tanque
			</label>
			<p className="hint">
				O trecho vale para os km rodados desde o abastecimento anterior.
				{ultimo && ` Último hodômetro registrado: ${numero(ultimo.hodometroKm, 0)} km.`}
			</p>
			{erro && <p className="hint erro">{erro}</p>}
			<div className="row">
				<button type="submit" className="btn primary small" disabled={salvando}>
					{salvando ? 'Salvando…' : 'Registrar'}
				</button>
			</div>
		</form>
	);
}

function ListaAbastecimentos({ carroId, itens, aoRemover }: { carroId: string; itens: AbastecimentoApi[]; aoRemover: () => void }) {
	const avisar = useAvisos();
	const [removendo, setRemovendo] = useState<string | null>(null);

	async function remover(item: AbastecimentoApi) {
		setRemovendo(item.id);
		try {
			await chamarApi(`/carros/${carroId}/abastecimentos/${item.id}`, { method: 'DELETE', autenticado: true });
			avisar('Abastecimento removido');
			aoRemover();
		} catch (e) {
			avisar(mensagemDeErro(e, 'Não foi possível remover o abastecimento.'));
		} finally {
			setRemovendo(null);
		}
	}

	return (
		<ul className="lista-abast">
			{[...itens].reverse().map(item => (
				<li key={item.id} className="item-abast">
					<span className="data">{dataCurta(item.data)}</span>
					<span className="detalhes">
						<span className="fuel-tag">
							<span className={`dot ${item.combustivel}`} />
							{NOME_COMBUSTIVEL[item.combustivel]}
						</span>
						<span className="num">{numero(item.litros, 2)} L</span>
						<span className="num">{numero(item.hodometroKm, 0)} km</span>
						{item.precoLitro !== null && <span className="num">{reais(item.precoLitro)}/L</span>}
						<span className={item.tanqueCheio ? 'chip ok' : 'chip'}>{item.tanqueCheio ? 'Tanque cheio' : 'Parcial'}</span>
						{item.trecho && <span className="chip">{NOME_TRECHO[item.trecho]}</span>}
					</span>
					<button
						type="button"
						className="btn ghost small"
						onClick={() => remover(item)}
						disabled={removendo !== null}
						aria-label={`Remover abastecimento de ${dataCurta(item.data)}`}
					>
						{removendo === item.id ? 'Removendo…' : 'Remover'}
					</button>
				</li>
			))}
		</ul>
	);
}
