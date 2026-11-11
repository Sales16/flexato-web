import 'server-only';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { clienteDoUsuario } from '@/lib/supabase/servidor';

export type Autenticado = { usuario: User; supabase: SupabaseClient };

export function tokenBearer(request: Request): string | null {
	const cabecalho = request.headers.get('authorization') ?? '';
	const match = /^Bearer\s+(.+)$/i.exec(cabecalho);
	return match ? match[1].trim() : null;
}

export async function autenticar(request: Request): Promise<Autenticado | null> {
	const token = tokenBearer(request);
	if (!token) return null;
	const supabase = clienteDoUsuario(token);
	const { data, error } = await supabase.auth.getUser(token);
	if (error || !data.user) return null;
	return { usuario: data.user, supabase };
}
