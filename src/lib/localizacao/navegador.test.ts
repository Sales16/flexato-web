import { describe, expect, it, vi } from 'vitest';
import { FalhaLocalizacao, motivoDoCodigo, obterPosicao } from './navegador';

function geolocalizacao(acao: (sucesso: PositionCallback, erro: PositionErrorCallback) => void): Geolocation {
	return { getCurrentPosition: vi.fn((s, e) => acao(s, e!)), watchPosition: vi.fn(), clearWatch: vi.fn() } as unknown as Geolocation;
}

describe('motivoDoCodigo', () => {
	it('traduz os códigos do GeolocationPositionError', () => {
		expect(motivoDoCodigo(1)).toBe('negada');
		expect(motivoDoCodigo(2)).toBe('indisponivel');
		expect(motivoDoCodigo(3)).toBe('tempo_esgotado');
	});
});

describe('obterPosicao', () => {
	it('devolve latitude e longitude', async () => {
		const geo = geolocalizacao(s => s({ coords: { latitude: -23.55, longitude: -46.63 } } as GeolocationPosition));
		await expect(obterPosicao(geo)).resolves.toEqual({ lat: -23.55, lng: -46.63 });
		expect(geo.getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), expect.objectContaining({ timeout: 15000 }));
	});

	it('falha com sem_suporte quando o navegador não tem geolocalização', async () => {
		await expect(obterPosicao(undefined)).rejects.toMatchObject({ motivo: 'sem_suporte' });
	});

	it.each([
		[1, 'negada'],
		[2, 'indisponivel'],
		[3, 'tempo_esgotado'],
	])('falha com o motivo do código %i', async (codigo, motivo) => {
		const geo = geolocalizacao((_, e) => e({ code: codigo } as GeolocationPositionError));
		const falha = await obterPosicao(geo).catch(e => e);
		expect(falha).toBeInstanceOf(FalhaLocalizacao);
		expect(falha.motivo).toBe(motivo);
		expect(falha.message).not.toBe('');
	});
});
