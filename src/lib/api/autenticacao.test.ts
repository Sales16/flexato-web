import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/servidor', () => ({ clienteDoUsuario: vi.fn() }));

const { clienteDoUsuario } = await import('@/lib/supabase/servidor');
const { autenticar, tokenBearer } = await import('./autenticacao');

const getUser = vi.fn();
const supabase = { auth: { getUser } };

const requisicao = (authorization?: string) => new Request('http://localhost', { headers: authorization ? { authorization } : {} });

beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(clienteDoUsuario).mockReturnValue(supabase as never);
});

describe('tokenBearer', () => {
	it('extrai o token do header Authorization', () => {
		expect(tokenBearer(requisicao('Bearer  abc '))).toBe('abc');
		expect(tokenBearer(requisicao('Basic abc'))).toBeNull();
		expect(tokenBearer(requisicao())).toBeNull();
	});
});

describe('autenticar', () => {
	it('devolve o usuário e o cliente autenticado com token válido', async () => {
		getUser.mockResolvedValue({ data: { user: { id: 'usuario-1' } }, error: null });
		expect(await autenticar(requisicao('Bearer abc'))).toEqual({ usuario: { id: 'usuario-1' }, supabase });
		expect(clienteDoUsuario).toHaveBeenCalledWith('abc');
		expect(getUser).toHaveBeenCalledWith('abc');
	});

	it('devolve null sem token, sem consultar o Auth', async () => {
		expect(await autenticar(requisicao())).toBeNull();
		expect(getUser).not.toHaveBeenCalled();
	});

	it('devolve null quando o Auth recusa o token', async () => {
		getUser.mockResolvedValue({ data: { user: null }, error: new AuthApiError('invalid JWT', 401, 'bad_jwt') });
		expect(await autenticar(requisicao('Bearer abc'))).toBeNull();
	});

	it.each([
		['fora do ar', new AuthRetryableFetchError('fetch failed', 0)],
		['com erro 5xx', new AuthRetryableFetchError('Service Unavailable', 503)],
	])('lança quando o Auth está %s, para não confundir indisponibilidade com token inválido', async (_, error) => {
		getUser.mockResolvedValue({ data: { user: null }, error });
		await expect(autenticar(requisicao('Bearer abc'))).rejects.toBe(error);
	});
});
