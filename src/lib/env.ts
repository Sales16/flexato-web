function obrigatoria(nome: string, valor: string | undefined): string {
	if (!valor) throw new Error(`Variável de ambiente ${nome} não configurada. Veja .env.example.`);
	return valor;
}

export function supabaseUrl(): string {
	return obrigatoria('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabasePublishableKey(): string {
	return obrigatoria('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function supabaseSecretKey(): string {
	return obrigatoria('SUPABASE_SECRET_KEY', process.env.SUPABASE_SECRET_KEY);
}

export function cronSecret(): string {
	return obrigatoria('CRON_SECRET', process.env.CRON_SECRET);
}
