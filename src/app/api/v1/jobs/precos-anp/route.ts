import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { importarPrecosAnp } from '@/lib/anp/importar';
import { tokenBearer } from '@/lib/api/autenticacao';
import { erro, erroInterno } from '@/lib/api/respostas';
import { cronSecret } from '@/lib/env';
import { clienteAdmin } from '@/lib/supabase/servidor';

export const maxDuration = 60;

function autorizado(request: Request): boolean {
	const recebido = Buffer.from(tokenBearer(request) ?? '');
	const esperado = Buffer.from(cronSecret());
	return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}

export async function GET(request: NextRequest) {
	try {
		if (!autorizado(request)) return erro(401, 'nao_autorizado', 'Token do job inválido.');
		const resultado = await importarPrecosAnp(clienteAdmin(), { forcar: request.nextUrl.searchParams.get('forcar') === '1' });
		return Response.json(resultado);
	} catch (e) {
		return erroInterno(e);
	}
}
