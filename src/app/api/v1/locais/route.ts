import { connection } from 'next/server';
import { listarLocais } from '@/lib/dados/precos';
import { erroInterno } from '@/lib/api/respostas';
import { clientePublico } from '@/lib/supabase/servidor';

export async function GET() {
	await connection();
	try {
		return Response.json(await listarLocais(clientePublico()));
	} catch (e) {
		return erroInterno(e);
	}
}
