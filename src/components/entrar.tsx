'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { supabaseNavegador } from '@/lib/supabase/navegador';
import { useSessao } from './provedor-sessao';

type Provedor = 'google' | 'apple';

function destino(): string {
	return `${window.location.origin}/carros`;
}

export function Entrar() {
	const { sessao, carregando, disponivel } = useSessao();
	const [email, setEmail] = useState('');
	const [enviado, setEnviado] = useState<string | null>(null);
	const [erro, setErro] = useState<string | null>(null);
	const [ocupado, setOcupado] = useState(false);

	async function entrarCom(provedor: Provedor) {
		const supabase = supabaseNavegador();
		if (!supabase) return;
		setErro(null);
		const { error } = await supabase.auth.signInWithOAuth({ provider: provedor, options: { redirectTo: destino() } });
		if (error) setErro('Não foi possível iniciar o login. Tente novamente.');
	}

	async function enviarLink(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const supabase = supabaseNavegador();
		if (!supabase) return;
		const endereco = email.trim();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(endereco)) {
			setErro('Informe um e-mail válido.');
			return;
		}
		setOcupado(true);
		setErro(null);
		const { error } = await supabase.auth.signInWithOtp({ email: endereco, options: { emailRedirectTo: destino() } });
		setOcupado(false);
		if (error) setErro('Não foi possível enviar o link. Confira o e-mail e tente de novo.');
		else setEnviado(endereco);
	}

	return (
		<div className="auth">
			<div className="panel">
				<div className="field">
					<p className="eyebrow">Conta Flexato</p>
					<h1>{sessao ? 'Você já entrou' : 'Entre para salvar seus carros'}</h1>
				</div>

				{!disponivel ? (
					<p className="hint erro">O login ainda não foi configurado neste ambiente. Veja as variáveis em .env.example.</p>
				) : carregando ? (
					<p className="hint">Carregando…</p>
				) : sessao ? (
					<>
						<p className="hint">Conectado como {sessao.user.email}.</p>
						<Link className="btn primary block" href="/carros">
							Ir para meus carros
						</Link>
					</>
				) : enviado ? (
					<>
						<p>
							Enviamos um link de acesso para <b>{enviado}</b>.
						</p>
						<p className="hint">Abra o e-mail neste dispositivo e toque no link para entrar.</p>
						<button type="button" className="btn ghost small" onClick={() => setEnviado(null)}>
							Usar outro e-mail
						</button>
					</>
				) : (
					<>
						<p className="hint">Seus carros ficam disponíveis no site e no aplicativo. O cálculo continua funcionando sem conta.</p>
						<button type="button" className="btn block" onClick={() => entrarCom('google')}>
							Continuar com Google
						</button>
						<button type="button" className="btn block" onClick={() => entrarCom('apple')}>
							Continuar com Apple
						</button>
						<div className="or">ou</div>
						<form className="form-stack" onSubmit={enviarLink} noValidate>
							<div className="field">
								<label htmlFor="email-login">E-mail</label>
								<input
									id="email-login"
									className="entrada"
									type="email"
									autoComplete="email"
									placeholder="voce@exemplo.com"
									value={email}
									onChange={e => setEmail(e.target.value)}
								/>
							</div>
							<button type="submit" className="btn primary block" disabled={ocupado}>
								{ocupado ? 'Enviando…' : 'Receber link de acesso'}
							</button>
						</form>
					</>
				)}
				{erro && <p className="hint erro">{erro}</p>}
			</div>
		</div>
	);
}
