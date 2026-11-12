import { connection } from 'next/server';
import { LEITURA, limitar } from '@/lib/api/limite';
import { listarLocais } from '@/lib/dados/precos';
import { erroInterno } from '@/lib/api/respostas';
import { clientePublico } from '@/lib/supabase/servidor';

export async function GET(request: Request) {
	const bloqueio = limitar(request, LEITURA);
	if (bloqueio) return bloqueio;
	await connection();
	try {
		return Response.json(await listarLocais(clientePublico()));
	} catch (e) {
		return erroInterno(e);
	}
}
