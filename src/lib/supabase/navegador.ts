import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const autenticacaoDisponivel = Boolean(url && chave);

let cliente: SupabaseClient | null = null;

export function supabaseNavegador(): SupabaseClient | null {
	if (!url || !chave || typeof window === 'undefined') return null;
	cliente ??= createClient(url, chave, {
		auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
	});
	return cliente;
}
