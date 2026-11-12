export type ProvedorLogin = 'google' | 'apple';

const PROVEDORES: { id: ProvedorLogin; rotulo: string }[] = [
	{ id: 'google', rotulo: 'Continuar com Google' },
	{ id: 'apple', rotulo: 'Continuar com Apple' },
];

export function provedoresLogin(habilitados: Record<ProvedorLogin, boolean>): { id: ProvedorLogin; rotulo: string }[] {
	return PROVEDORES.filter(p => habilitados[p.id]);
}
