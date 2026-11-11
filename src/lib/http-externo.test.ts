import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscar, emLotes } from './http-externo';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('buscar', () => {
	it('envia o User-Agent do Flexato sem cache e devolve a resposta', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);

		const resposta = await buscar('https://exemplo.gov.br/dados');

		expect(await resposta.text()).toBe('ok');
		expect(fetchMock).toHaveBeenCalledWith('https://exemplo.gov.br/dados', {
			headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Flexato/1.0)' },
			cache: 'no-store',
		});
	});

	it('falha com a URL e o status quando a resposta não é ok', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('erro', { status: 503 })));

		await expect(buscar('https://exemplo.gov.br/dados')).rejects.toThrow('Falha ao baixar https://exemplo.gov.br/dados: HTTP 503');
	});
});

describe('emLotes', () => {
	it('divide a lista em lotes do tamanho pedido', () => {
		expect(emLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
		expect(emLotes([1, 2], 500)).toEqual([[1, 2]]);
		expect(emLotes([], 3)).toEqual([]);
	});

	it('recusa tamanho inválido', () => {
		expect(() => emLotes([1], 0)).toThrow();
		expect(() => emLotes([1], 1.5)).toThrow();
	});
});
