import type { Metadata } from 'next';
import { Entrar } from '@/components/entrar';

export const metadata: Metadata = { title: 'Entrar' };

export default function PaginaEntrar() {
	return (
		<section className="wrap">
			<Entrar />
		</section>
	);
}
