const FORMATO_SAO_PAULO = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });

export function hojeEmSaoPaulo(agora: Date = new Date()): string {
	const partes = Object.fromEntries(FORMATO_SAO_PAULO.formatToParts(agora).map(p => [p.type, p.value]));
	return `${partes.year}-${partes.month}-${partes.day}`;
}

export function somarDias(iso: string, dias: number): string {
	const d = new Date(`${iso}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + dias);
	return d.toISOString().slice(0, 10);
}

export function dataNoFuturo(iso: string, agora: Date = new Date(), toleranciaDias = 0): boolean {
	return iso > somarDias(hojeEmSaoPaulo(agora), toleranciaDias);
}
