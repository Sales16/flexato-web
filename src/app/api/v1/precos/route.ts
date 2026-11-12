import type { NextRequest } from 'next/server';
import { LEITURA, limitar } from '@/lib/api/limite';
import { buscarPrecos } from '@/lib/dados/precos';
import { erro, erroInterno } from '@/lib/api/respostas';
import { clientePublico } from '@/lib/supabase/servidor';
import { ehUf, normalizarNome } from '@/lib/ufs';

export async function GET(request: NextRequest) {
	const bloqueio = limitar(request, LEITURA);
	if (bloqueio) return bloqueio;
	const uf = (request.nextUrl.searchParams.get('uf') ?? '').toUpperCase();
	const municipio = request.nextUrl.searchParams.get('municipio');
	if (!ehUf(uf)) return erro(400, 'uf_invalida', 'Informe uma UF válida, por exemplo uf=SP.');

	try {
		const precos = await buscarPrecos(clientePublico(), uf, municipio ? normalizarNome(municipio) : null);
		if (!precos) return erro(404, 'sem_dados', 'Ainda não há preços importados da ANP.');
		return Response.json(precos);
	} catch (e) {
		return erroInterno(e);
	}
}
