import type { NextRequest } from 'next/server';
import { LEITURA, limitar } from '@/lib/api/limite';
import { buscarCatalogo } from '@/lib/dados/catalogo';
import { erroInterno } from '@/lib/api/respostas';
import { clientePublico } from '@/lib/supabase/servidor';

const LIMITE_PADRAO = 50;
const LIMITE_MAXIMO = 200;

export async function GET(request: NextRequest) {
	const bloqueio = limitar(request, LEITURA);
	if (bloqueio) return bloqueio;
	const termo = (request.nextUrl.searchParams.get('q') ?? '').slice(0, 80);
	const limite = Math.min(LIMITE_MAXIMO, Math.max(1, Math.trunc(Number(request.nextUrl.searchParams.get('limite'))) || LIMITE_PADRAO));
	try {
		return Response.json({ itens: await buscarCatalogo(clientePublico(), termo, limite) });
	} catch (e) {
		return erroInterno(e);
	}
}
