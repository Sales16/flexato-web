import { z } from 'zod';
import { autenticar } from '@/lib/api/autenticacao';
import { erro, erroInterno, erroValidacao, lerJson } from '@/lib/api/respostas';
import { calcularConsumoReal } from '@/lib/consumo-real';
import { carroExiste, criarAbastecimento, listarAbastecimentos } from '@/lib/dados/abastecimentos';
import { abastecimentoCriarSchema } from '@/lib/esquemas';
import type { AbastecimentosApi } from '@/lib/tipos-api';

const naoAutenticado = () => erro(401, 'nao_autenticado', 'Entre na sua conta para acessar seus abastecimentos.');
const carroNaoEncontrado = () => erro(404, 'carro_nao_encontrado', 'Carro não encontrado na sua garagem.');

export async function GET(request: Request, ctx: RouteContext<'/api/v1/carros/[id]/abastecimentos'>) {
	const auth = await autenticar(request);
	if (!auth) return naoAutenticado();
	const { id } = await ctx.params;
	if (!z.uuid().safeParse(id).success) return carroNaoEncontrado();
	try {
		if (!(await carroExiste(auth.supabase, id))) return carroNaoEncontrado();
		const itens = await listarAbastecimentos(auth.supabase, id);
		const corpo: AbastecimentosApi = { itens, consumoReal: calcularConsumoReal(itens) };
		return Response.json(corpo);
	} catch (e) {
		return erroInterno(e);
	}
}

export async function POST(request: Request, ctx: RouteContext<'/api/v1/carros/[id]/abastecimentos'>) {
	const auth = await autenticar(request);
	if (!auth) return naoAutenticado();
	const { id } = await ctx.params;
	if (!z.uuid().safeParse(id).success) return carroNaoEncontrado();
	const entrada = abastecimentoCriarSchema.safeParse(await lerJson(request));
	if (!entrada.success) return erroValidacao(entrada.error);
	try {
		if (!(await carroExiste(auth.supabase, id))) return carroNaoEncontrado();
		return Response.json(await criarAbastecimento(auth.supabase, id, entrada.data), { status: 201 });
	} catch (e) {
		return erroInterno(e);
	}
}
