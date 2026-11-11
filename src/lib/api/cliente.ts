import { supabaseNavegador } from '@/lib/supabase/navegador';

export class ErroApi extends Error {
	readonly status: number;
	readonly codigo: string;

	constructor(status: number, codigo: string, mensagem: string) {
		super(mensagem);
		this.status = status;
		this.codigo = codigo;
	}
}

type Opcoes = Omit<RequestInit, 'body'> & { corpo?: unknown; autenticado?: boolean };

async function tokenAtual(): Promise<string | null> {
	const supabase = supabaseNavegador();
	if (!supabase) return null;
	const { data } = await supabase.auth.getSession();
	return data.session?.access_token ?? null;
}

export async function chamarApi<T>(caminho: string, { corpo, autenticado, ...init }: Opcoes = {}): Promise<T> {
	const headers = new Headers(init.headers);
	if (corpo !== undefined) headers.set('content-type', 'application/json');
	if (autenticado) {
		const token = await tokenAtual();
		if (!token) throw new ErroApi(401, 'nao_autenticado', 'Entre na sua conta para continuar.');
		headers.set('authorization', `Bearer ${token}`);
	}
	const resposta = await fetch(`/api/v1${caminho}`, { ...init, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
	if (resposta.status === 204) return undefined as T;
	const json = await resposta.json().catch(() => null);
	if (!resposta.ok) {
		throw new ErroApi(resposta.status, json?.erro?.codigo ?? 'erro', json?.erro?.mensagem ?? 'Não foi possível concluir a operação. Tente novamente.');
	}
	return json as T;
}

export function mensagemDeErro(e: unknown, padrao: string): string {
	return e instanceof ErroApi ? e.message : padrao;
}
