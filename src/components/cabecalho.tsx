'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Marca } from './marca';
import { useAvisos } from './provedor-avisos';
import { useSessao } from './provedor-sessao';

const LINKS = [
	{ href: '/', rotulo: 'Calcular' },
	{ href: '/carros', rotulo: 'Meus carros' },
] as const;

export function Cabecalho() {
	const caminho = usePathname();
	const { sessao, carregando, sair } = useSessao();
	const avisar = useAvisos();

	async function aoSair() {
		await sair();
		avisar('Você saiu da conta');
	}

	return (
		<header className="topbar">
			<div className="wrap">
				<Link className="logo" href="/" aria-label="Flexato, início">
					<Marca />
					<strong>Flexato</strong>
				</Link>
				<nav className="nav" aria-label="Principal">
					{LINKS.map(link => (
						<Link key={link.href} href={link.href} aria-current={caminho === link.href ? 'page' : undefined}>
							{link.rotulo}
						</Link>
					))}
					{sessao ? (
						<button type="button" onClick={aoSair}>
							Sair
						</button>
					) : (
						<Link href="/entrar" className="cta" aria-current={caminho === '/entrar' ? 'page' : undefined} hidden={carregando}>
							Entrar
						</Link>
					)}
				</nav>
			</div>
		</header>
	);
}
