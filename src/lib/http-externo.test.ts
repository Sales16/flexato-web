import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscar, emLotes, TEMPO_LIMITE_PADRAO_MS } from './http-externo';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
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
			signal: expect.any(AbortSignal),
		});
	});

	it('usa o tempo limite padrão quando a chamada não define outro', async () => {
		const timeout = vi.spyOn(AbortSignal, 'timeout');
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok')));

		await buscar('https://exemplo.gov.br/dados');

		expect(TEMPO_LIMITE_PADRAO_MS).toBe(60_000);
		expect(timeout).toHaveBeenCalledWith(TEMPO_LIMITE_PADRAO_MS);
	});

	it('aceita tempo limite por chamada e aborta o download que passa dele', async () => {
		const fetchMock = vi.fn(
			(_url: string, init: RequestInit) =>
				new Promise<Response>((_resolver, rejeitar) => {
					init.signal?.addEventListener('abort', () => rejeitar(init.signal?.reason));
				})
		);
		vi.stubGlobal('fetch', fetchMock);

		await expect(buscar('https://exemplo.gov.br/lento', { tempoLimiteMs: 10 })).rejects.toThrow();
		expect((fetchMock.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
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
