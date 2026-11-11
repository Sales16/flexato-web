'use client';

import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

const DURACAO_MS = 2600;

const Contexto = createContext<((mensagem: string) => void) | null>(null);

export function ProvedorAvisos({ children }: { children: ReactNode }) {
	const [mensagem, setMensagem] = useState<string | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const avisar = useCallback((texto: string) => {
		setMensagem(texto);
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setMensagem(null), DURACAO_MS);
	}, []);

	useEffect(() => () => clearTimeout(timer.current), []);

	return (
		<Contexto value={avisar}>
			{children}
			<div className="toast" role="status" hidden={!mensagem}>
				{mensagem}
			</div>
		</Contexto>
	);
}

export function useAvisos(): (mensagem: string) => void {
	const avisar = use(Contexto);
	if (!avisar) throw new Error('useAvisos precisa estar dentro de ProvedorAvisos.');
	return avisar;
}
