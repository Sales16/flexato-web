export function Marca({ tamanho = 26 }: { tamanho?: number }) {
	return (
		<svg width={tamanho} height={(tamanho * 30) / 26} viewBox="0 0 26 30" aria-hidden="true">
			<path d="M13 1 C13 1 2 13.5 2 19.5 A11 11 0 0 0 13 29 Z" fill="var(--etanol)" />
			<path d="M13 1 C13 1 24 13.5 24 19.5 A11 11 0 0 1 13 29 Z" fill="var(--gasolina)" />
		</svg>
	);
}
