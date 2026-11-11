import type { Metadata } from 'next';
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from 'next/font/google';
import { Cabecalho } from '@/components/cabecalho';
import { ProvedorAvisos } from '@/components/provedor-avisos';
import { ProvedorSessao } from '@/components/provedor-sessao';
import './globals.css';

const bricolage = Bricolage_Grotesque({ variable: '--fonte-bricolage', subsets: ['latin'], weight: ['500', '600', '700', '800'] });
const inter = Inter({ variable: '--fonte-inter', subsets: ['latin'] });
const jetbrains = JetBrains_Mono({ variable: '--fonte-jetbrains', subsets: ['latin'], weight: ['500', '600'] });

export const metadata: Metadata = {
	title: { default: 'Flexato', template: '%s · Flexato' },
	description: 'Etanol ou gasolina? A resposta certa para o seu carro, com base no consumo dele na cidade e na estrada.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html lang="pt-BR" className={`${bricolage.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}>
			<body className="flex min-h-full flex-col">
				<ProvedorSessao>
					<ProvedorAvisos>
						<Cabecalho />
						<main className="conteudo">{children}</main>
						<footer className="rodape">
							<div className="wrap">
								<span>Preços: ANP, Levantamento de Preços de Combustíveis</span>
								<span>Consumo: Inmetro, PBE Veicular</span>
								<span>Municípios: IBGE</span>
							</div>
						</footer>
					</ProvedorAvisos>
				</ProvedorSessao>
			</body>
		</html>
	);
}
