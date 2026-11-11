import { z } from 'zod';
import { autenticar } from '@/lib/api/autenticacao';
import { erro, erroInterno } from '@/lib/api/respostas';
import { removerAbastecimento } from '@/lib/dados/abastecimentos';

const naoAutenticado = () => erro(401, 'nao_autenticado', 'Entre na sua conta para acessar seus abastecimentos.');
const naoEncontrado = () => erro(404, 'abastecimento_nao_encontrado', 'Abastecimento não encontrado.');

export async function DELETE(request: Request, ctx: RouteContext<'/api/v1/carros/[id]/abastecimentos/[abastecimentoId]'>) {
	const auth = await autenticar(request);
	if (!auth) return naoAutenticado();
	const { id, abastecimentoId } = await ctx.params;
	if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(abastecimentoId).success) return naoEncontrado();
	try {
		return (await removerAbastecimento(auth.supabase, id, abastecimentoId)) ? new Response(null, { status: 204 }) : naoEncontrado();
	} catch (e) {
		return erroInterno(e);
	}
}
