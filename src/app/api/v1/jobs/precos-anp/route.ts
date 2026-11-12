import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { importarPrecosAnp } from '@/lib/anp/importar';
import { tokenBearer } from '@/lib/api/autenticacao';
import { erro, erroInterno } from '@/lib/api/respostas';
import { cronSecret, jobPrecosAnpHabilitado } from '@/lib/env';
import { clienteAdmin } from '@/lib/supabase/servidor';

export const maxDuration = 60;

function autorizado(token: string | null): boolean {
	const recebido = Buffer.from(token ?? '');
	const esperado = Buffer.from(cronSecret());
	return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}

export async function GET(request: NextRequest) {
	const token = tokenBearer(request);
	const forcar = request.nextUrl.searchParams.get('forcar') === '1';
	try {
		if (!autorizado(token)) return erro(401, 'nao_autorizado', 'Token do job inválido.');
		if (!jobPrecosAnpHabilitado()) return Response.json({ status: 'desabilitado' });
		const resultado = await importarPrecosAnp(clienteAdmin(), { forcar });
		return Response.json(resultado);
	} catch (e) {
		return erroInterno(e);
	}
}
