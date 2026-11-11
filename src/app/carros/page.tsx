import type { Metadata } from 'next';
import { Garagem } from '@/components/garagem';

export const metadata: Metadata = { title: 'Meus carros' };

export default function PaginaCarros() {
	return (
		<section className="wrap">
			<Garagem />
		</section>
	);
}
