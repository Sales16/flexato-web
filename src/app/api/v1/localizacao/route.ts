import type { NextRequest } from 'next/server';
import { LEITURA, limitar } from '@/lib/api/limite';
import { localizar } from '@/lib/dados/localizacao';
import { erro, erroInterno } from '@/lib/api/respostas';
import { dentroDoBrasil, lerCoordenadas } from '@/lib/localizacao/coordenadas';
import { clienteAdmin, clientePublico } from '@/lib/supabase/servidor';

function semCache(resposta: Response): Response {
	resposta.headers.set('cache-control', 'private, no-store');
	return resposta;
}

export async function GET(request: NextRequest) {
	const bloqueio = limitar(request, LEITURA);
	if (bloqueio) return semCache(bloqueio);
	const parametros = request.nextUrl.searchParams;
	const coordenadas = lerCoordenadas(parametros.get('lat'), parametros.get('lng'));
	if (!coordenadas) return semCache(erro(400, 'coordenadas_invalidas', 'Informe lat e lng em graus decimais, por exemplo lat=-23.55&lng=-46.63.'));
	if (!dentroDoBrasil(coordenadas)) return semCache(erro(404, 'fora_do_brasil', 'Essa localização fica fora do Brasil. Escolha a cidade manualmente.'));

	try {
		const localizacao = await localizar(clienteAdmin(), clientePublico(), coordenadas);
		if (!localizacao)
			return semCache(erro(404, 'municipio_nao_encontrado', 'Não encontramos um município brasileiro nessa localização. Escolha a cidade manualmente.'));
		return semCache(Response.json(localizacao));
	} catch (e) {
		return semCache(erroInterno(e));
	}
}
