import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/servidor', () => ({ clienteDoUsuario: vi.fn() }));
vi.mock('@/lib/dados/carros', () => ({ listarCarros: vi.fn(), criarCarro: vi.fn() }));

const { clienteDoUsuario } = await import('@/lib/supabase/servidor');
const { criarCarro, listarCarros } = await import('@/lib/dados/carros');
const { GET, POST } = await import('./route');
const { ESCRITA } = await import('@/lib/api/limite');

const consumo = { etanol: { cidade: 8.4, estrada: 10 }, gasolina: { cidade: 12.6, estrada: 14.8 } };
const carro = {
	id: '0b6f8a52-8a4f-4a8e-9a39-0e4f3f6d7c11',
	nome: 'Onix',
	catalogoId: 1,
	consumo,
	criadoEm: '2026-11-11T00:00:00Z',
	atualizadoEm: '2026-11-11T00:00:00Z',
};
const getUser = vi.fn();
const supabase = { auth: { getUser } };

function requisicao(metodo: string, { token = 'token-valido', corpo }: { token?: string | null; corpo?: unknown } = {}) {
	const headers = new Headers({ 'content-type': 'application/json' });
	if (token) headers.set('authorization', `Bearer ${token}`);
	return new Request('http://localhost/api/v1/carros', {
		method: metodo,
		headers,
		body: corpo === undefined ? undefined : typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
	});
}

beforeEach(() => {
	vi.resetAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.mocked(clienteDoUsuario).mockReturnValue(supabase as never);
	getUser.mockImplementation(async (token: string) =>
		token === 'token-valido' ? { data: { user: { id: 'usuario-1' } }, error: null } : { data: { user: null }, error: new Error('jwt inválido') }
	);
});

describe('GET /api/v1/carros', () => {
	it('lista os carros do usuário com o cliente autenticado', async () => {
		vi.mocked(listarCarros).mockResolvedValue([carro]);
		const resposta = await GET(requisicao('GET'));
		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toEqual({ itens: [carro] });
		expect(clienteDoUsuario).toHaveBeenCalledWith('token-valido');
		expect(listarCarros).toHaveBeenCalledWith(supabase);
	});

	it.each([null, 'token-invalido'])('retorna 401 sem token válido (%s)', async token => {
		const resposta = await GET(requisicao('GET', { token }));
		expect(resposta.status).toBe(401);
		expect(await resposta.json()).toEqual({ erro: { codigo: 'nao_autenticado', mensagem: expect.any(String) } });
		expect(listarCarros).not.toHaveBeenCalled();
	});

	it('retorna 500 no formato padrão quando o banco falha', async () => {
		vi.mocked(listarCarros).mockRejectedValue(new Error('falhou'));
		const resposta = await GET(requisicao('GET'));
		expect(resposta.status).toBe(500);
		expect((await resposta.json()).erro.codigo).toBe('erro_interno');
	});

	it('retorna 500 no formato padrão quando a autenticação falha', async () => {
		getUser.mockRejectedValue(new Error('rede'));
		const resposta = await GET(requisicao('GET'));
		expect(resposta.status).toBe(500);
		expect((await resposta.json()).erro.codigo).toBe('erro_interno');
	});

	it('retorna 429 antes de autenticar quando o IP passa do limite de escrita', async () => {
		vi.mocked(criarCarro).mockResolvedValue(carro);
		const comIp = () => {
			const r = requisicao('POST', { corpo: { nome: 'Onix', consumo } });
			r.headers.set('x-forwarded-for', '198.51.100.7');
			return r;
		};
		for (let i = 0; i < ESCRITA.limite; i++) expect((await POST(comIp())).status).toBe(201);
		getUser.mockClear();
		const resposta = await POST(comIp());
		expect(resposta.status).toBe(429);
		expect(Number(resposta.headers.get('Retry-After'))).toBeGreaterThan(0);
		expect(await resposta.json()).toEqual({ erro: { codigo: 'muitas_requisicoes', mensagem: expect.any(String) } });
		expect(getUser).not.toHaveBeenCalled();
	});
});

describe('POST /api/v1/carros', () => {
	it('cria o carro e retorna 201', async () => {
		vi.mocked(criarCarro).mockResolvedValue(carro);
		const resposta = await POST(requisicao('POST', { corpo: { nome: '  Onix  ', catalogoId: 1, consumo } }));
		expect(resposta.status).toBe(201);
		expect(await resposta.json()).toEqual(carro);
		expect(criarCarro).toHaveBeenCalledWith(supabase, { nome: 'Onix', catalogoId: 1, consumo });
	});

	it('retorna 401 antes de validar o corpo', async () => {
		const resposta = await POST(requisicao('POST', { token: null, corpo: {} }));
		expect(resposta.status).toBe(401);
	});

	it('retorna 422 com detalhes para dados inválidos', async () => {
		const resposta = await POST(requisicao('POST', { corpo: { nome: '', consumo: { ...consumo, etanol: { cidade: 0, estrada: 10 } } } }));
		expect(resposta.status).toBe(422);
		const corpo = await resposta.json();
		expect(corpo.erro.codigo).toBe('dados_invalidos');
		expect(corpo.erro.detalhes).toEqual(expect.arrayContaining(['nome: informe um nome', 'consumo.etanol.cidade: deve ser maior que zero']));
		expect(criarCarro).not.toHaveBeenCalled();
	});

	it('retorna 422 para JSON inválido', async () => {
		const resposta = await POST(requisicao('POST', { corpo: '{nao é json' }));
		expect(resposta.status).toBe(422);
		expect((await resposta.json()).erro.codigo).toBe('dados_invalidos');
	});

	it('retorna 500 no formato padrão quando o banco falha', async () => {
		vi.mocked(criarCarro).mockRejectedValue(new Error('falhou'));
		const resposta = await POST(requisicao('POST', { corpo: { nome: 'Onix', consumo } }));
		expect(resposta.status).toBe(500);
		expect((await resposta.json()).erro.codigo).toBe('erro_interno');
	});
});
