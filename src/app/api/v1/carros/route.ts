import { autenticar } from '@/lib/api/autenticacao';
import { ESCRITA, LEITURA, limitar } from '@/lib/api/limite';
import { erro, erroInterno, erroValidacao, lerJson } from '@/lib/api/respostas';
import { criarCarro, listarCarros } from '@/lib/dados/carros';
import { carroCriarSchema } from '@/lib/esquemas';

const naoAutenticado = () => erro(401, 'nao_autenticado', 'Entre na sua conta para acessar seus carros.');

export async function GET(request: Request) {
	const bloqueio = limitar(request, LEITURA);
	if (bloqueio) return bloqueio;
	try {
		const auth = await autenticar(request);
		if (!auth) return naoAutenticado();
		return Response.json({ itens: await listarCarros(auth.supabase) });
	} catch (e) {
		return erroInterno(e);
	}
}

export async function POST(request: Request) {
	const bloqueio = limitar(request, ESCRITA);
	if (bloqueio) return bloqueio;
	try {
		const auth = await autenticar(request);
		if (!auth) return naoAutenticado();
		const entrada = carroCriarSchema.safeParse(await lerJson(request));
		if (!entrada.success) return erroValidacao(entrada.error);
		return Response.json(await criarCarro(auth.supabase, entrada.data), { status: 201 });
	} catch (e) {
		return erroInterno(e);
	}
}
