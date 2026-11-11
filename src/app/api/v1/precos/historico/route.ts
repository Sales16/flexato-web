import type { NextRequest } from 'next/server';
import { LEITURA, limitar } from '@/lib/api/limite';
import { erro, erroInterno } from '@/lib/api/respostas';
import { buscarHistoricoPrecos } from '@/lib/dados/historico-precos';
import { SEMANAS_MAXIMO, SEMANAS_PADRAO } from '@/lib/historico-precos';
import { clientePublico } from '@/lib/supabase/servidor';
import { ehUf, normalizarNome } from '@/lib/ufs';

export async function GET(request: NextRequest) {
	const bloqueio = limitar(request, LEITURA);
	if (bloqueio) return bloqueio;
	const parametros = request.nextUrl.searchParams;
	const uf = (parametros.get('uf') ?? '').toUpperCase();
	const municipio = parametros.get('municipio');
	const textoSemanas = parametros.get('semanas');
	if (!ehUf(uf)) return erro(400, 'uf_invalida', 'Informe uma UF válida, por exemplo uf=SP.');
	const semanas = textoSemanas === null || textoSemanas === '' ? SEMANAS_PADRAO : Number(textoSemanas);
	if (!Number.isInteger(semanas) || semanas < 1 || semanas > SEMANAS_MAXIMO) {
		return erro(400, 'semanas_invalidas', `Informe semanas entre 1 e ${SEMANAS_MAXIMO}.`);
	}

	try {
		const historico = await buscarHistoricoPrecos(clientePublico(), uf, municipio ? normalizarNome(municipio) : null, semanas);
		if (!historico) return erro(404, 'sem_dados', 'Ainda não há preços importados da ANP.');
		return Response.json(historico);
	} catch (e) {
		return erroInterno(e);
	}
}
