import { afterEach, describe, expect, it, vi } from 'vitest';
import { PAGINA_PBEV, urlPbevMaisRecente } from './importar';

vi.mock('server-only', () => ({}));
vi.mock('./pdf', () => ({ lerItensPdf: vi.fn() }));

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('urlPbevMaisRecente', () => {
	it('baixa a página do Inmetro com tempo limite para não travar o importador', async () => {
		const fetch = vi.fn(async () => new Response('<a href="mascara-pbev-2026.pdf">x</a>'));
		vi.stubGlobal('fetch', fetch);

		await urlPbevMaisRecente();

		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(PAGINA_PBEV);
		expect(init.signal).toBeInstanceOf(AbortSignal);
	});
});
