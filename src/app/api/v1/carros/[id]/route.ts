import { z } from 'zod';
import { autenticar } from '@/lib/api/autenticacao';
import { ESCRITA, limitar } from '@/lib/api/limite';
import { erro, erroInterno, erroValidacao, lerJson } from '@/lib/api/respostas';
import { alterarCarro, removerCarro } from '@/lib/dados/carros';
import { carroAlterarSchema } from '@/lib/esquemas';

const naoAutenticado = () => erro(401, 'nao_autenticado', 'Entre na sua conta para acessar seus carros.');
const naoEncontrado = () => erro(404, 'carro_nao_encontrado', 'Carro não encontrado na sua garagem.');

export async function PATCH(request: Request, ctx: RouteContext<'/api/v1/carros/[id]'>) {
	const bloqueio = limitar(request, ESCRITA);
	if (bloqueio) return bloqueio;
	try {
		const auth = await autenticar(request);
		if (!auth) return naoAutenticado();
		const { id } = await ctx.params;
		if (!z.uuid().safeParse(id).success) return naoEncontrado();
		const entrada = carroAlterarSchema.safeParse(await lerJson(request));
		if (!entrada.success) return erroValidacao(entrada.error);
		const carro = await alterarCarro(auth.supabase, id, entrada.data);
		return carro ? Response.json(carro) : naoEncontrado();
	} catch (e) {
		return erroInterno(e);
	}
}

export async function DELETE(request: Request, ctx: RouteContext<'/api/v1/carros/[id]'>) {
	const bloqueio = limitar(request, ESCRITA);
	if (bloqueio) return bloqueio;
	try {
		const auth = await autenticar(request);
		if (!auth) return naoAutenticado();
		const { id } = await ctx.params;
		if (!z.uuid().safeParse(id).success) return naoEncontrado();
		return (await removerCarro(auth.supabase, id)) ? new Response(null, { status: 204 }) : naoEncontrado();
	} catch (e) {
		return erroInterno(e);
	}
}
