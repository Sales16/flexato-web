import type { Coordenadas } from './coordenadas';

export type MotivoFalhaLocalizacao = 'sem_suporte' | 'negada' | 'indisponivel' | 'tempo_esgotado' | 'fora_do_brasil';

export const MENSAGENS_FALHA_LOCALIZACAO: Record<MotivoFalhaLocalizacao, string> = {
	sem_suporte: 'Este navegador não informa a localização. Escolha o estado e a cidade abaixo.',
	negada: 'Você não permitiu o acesso à localização. Libere a permissão nas configurações do navegador ou escolha a cidade abaixo.',
	indisponivel: 'Não foi possível descobrir sua localização agora. Tente de novo ou escolha a cidade abaixo.',
	tempo_esgotado: 'A localização demorou demais para responder. Tente de novo ou escolha a cidade abaixo.',
	fora_do_brasil: 'Parece que você está fora do Brasil. O Flexato só tem preços de cidades brasileiras. Escolha a cidade abaixo.',
};

export class FalhaLocalizacao extends Error {
	readonly motivo: MotivoFalhaLocalizacao;

	constructor(motivo: MotivoFalhaLocalizacao) {
		super(MENSAGENS_FALHA_LOCALIZACAO[motivo]);
		this.motivo = motivo;
	}
}

const CODIGO_PERMISSAO_NEGADA = 1;
const CODIGO_TEMPO_ESGOTADO = 3;

export function motivoDoCodigo(codigo: number): MotivoFalhaLocalizacao {
	if (codigo === CODIGO_PERMISSAO_NEGADA) return 'negada';
	if (codigo === CODIGO_TEMPO_ESGOTADO) return 'tempo_esgotado';
	return 'indisponivel';
}

const OPCOES: PositionOptions = { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 };

export function obterPosicao(geolocalizacao: Geolocation | undefined = globalThis.navigator?.geolocation): Promise<Coordenadas> {
	return new Promise((resolver, rejeitar) => {
		if (!geolocalizacao) {
			rejeitar(new FalhaLocalizacao('sem_suporte'));
			return;
		}
		geolocalizacao.getCurrentPosition(
			posicao => resolver({ lat: posicao.coords.latitude, lng: posicao.coords.longitude }),
			falha => rejeitar(new FalhaLocalizacao(motivoDoCodigo(falha.code))),
			OPCOES
		);
	});
}
