import { describe, expect, it } from 'vitest';
import { dataNoFuturo, hojeEmSaoPaulo, somarDias } from './data-local';

describe('hojeEmSaoPaulo', () => {
	it('usa o fuso de São Paulo, não o UTC', () => {
		expect(hojeEmSaoPaulo(new Date('2026-11-12T02:30:00Z'))).toBe('2026-11-11');
		expect(hojeEmSaoPaulo(new Date('2026-11-12T03:00:00Z'))).toBe('2026-11-12');
	});
});

describe('somarDias', () => {
	it('atravessa fim de mês e de ano', () => {
		expect(somarDias('2026-02-28', 1)).toBe('2026-03-01');
		expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
		expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
	});
});

describe('dataNoFuturo', () => {
	const agora = new Date('2026-11-12T02:30:00Z');

	it('compara com o dia de hoje em São Paulo', () => {
		expect(dataNoFuturo('2026-11-11', agora)).toBe(false);
		expect(dataNoFuturo('2026-11-10', agora)).toBe(false);
		expect(dataNoFuturo('2026-11-12', agora)).toBe(true);
	});

	it('aceita a tolerância em dias', () => {
		expect(dataNoFuturo('2026-11-12', agora, 1)).toBe(false);
		expect(dataNoFuturo('2026-11-13', agora, 1)).toBe(true);
	});
});
