import { erro } from './respostas';

export type Regra = { nome: string; limite: number; janelaMs: number };

export const LEITURA: Regra = { nome: 'leitura', limite: 120, janelaMs: 60_000 };
export const ESCRITA: Regra = { nome: 'escrita', limite: 30, janelaMs: 60_000 };

const MAXIMO_CHAVES = 10_000;

type Janela = { expira: number; contagem: number };

export function criarLimitador(agora: () => number = Date.now, maximoChaves = MAXIMO_CHAVES) {
	const janelas = new Map<string, Janela>();

	function abrirEspaco(momento: number) {
		for (const [chave, janela] of janelas) if (janela.expira <= momento) janelas.delete(chave);
		for (const chave of janelas.keys()) {
			if (janelas.size < maximoChaves) break;
			janelas.delete(chave);
		}
	}

	return function consumir(regra: Regra, cliente: string): number | null {
		const momento = agora();
		const chave = `${regra.nome}:${cliente}`;
		let janela = janelas.get(chave);
		if (!janela || janela.expira <= momento) {
			janelas.delete(chave);
			if (janelas.size >= maximoChaves) abrirEspaco(momento);
			janela = { expira: momento + regra.janelaMs, contagem: 0 };
			janelas.set(chave, janela);
		}
		janela.contagem++;
		return janela.contagem > regra.limite ? Math.max(1, Math.ceil((janela.expira - momento) / 1000)) : null;
	};
}

export function ipDoCliente(request: Request): string {
	const realIp = request.headers.get('x-real-ip')?.trim();
	const encaminhado = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
	return realIp || encaminhado || 'desconhecido';
}

const consumir = criarLimitador();

export function limitar(request: Request, regra: Regra): Response | null {
	const espera = consumir(regra, ipDoCliente(request));
	if (espera === null) return null;
	const resposta = erro(429, 'muitas_requisicoes', 'Muitas requisições em pouco tempo. Tente novamente em instantes.');
	resposta.headers.set('Retry-After', String(espera));
	return resposta;
}
