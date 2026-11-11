import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabasePublishableKey, supabaseSecretKey, supabaseUrl } from '@/lib/env';

const semSessao = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

export function clientePublico(): SupabaseClient {
	return createClient(supabaseUrl(), supabasePublishableKey(), semSessao);
}

export function clienteDoUsuario(token: string): SupabaseClient {
	return createClient(supabaseUrl(), supabasePublishableKey(), {
		...semSessao,
		global: { headers: { Authorization: `Bearer ${token}` } },
	});
}

export function clienteAdmin(): SupabaseClient {
	return createClient(supabaseUrl(), supabaseSecretKey(), semSessao);
}
