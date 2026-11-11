'use client';

import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { autenticacaoDisponivel, supabaseNavegador } from '@/lib/supabase/navegador';

type ContextoSessao = {
	sessao: Session | null;
	carregando: boolean;
	disponivel: boolean;
	sair: () => Promise<void>;
};

const Contexto = createContext<ContextoSessao | null>(null);

export function ProvedorSessao({ children }: { children: ReactNode }) {
	const [sessao, setSessao] = useState<Session | null>(null);
	const [carregando, setCarregando] = useState(autenticacaoDisponivel);

	useEffect(() => {
		const supabase = supabaseNavegador();
		if (!supabase) return;
		supabase.auth.getSession().then(({ data }) => {
			setSessao(data.session);
			setCarregando(false);
		});
		const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
			setSessao(novaSessao);
			setCarregando(false);
		});
		return () => data.subscription.unsubscribe();
	}, []);

	async function sair() {
		await supabaseNavegador()?.auth.signOut();
	}

	return <Contexto value={{ sessao, carregando, disponivel: autenticacaoDisponivel, sair }}>{children}</Contexto>;
}

export function useSessao(): ContextoSessao {
	const contexto = use(Contexto);
	if (!contexto) throw new Error('useSessao precisa estar dentro de ProvedorSessao.');
	return contexto;
}
