import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/servidor', () => ({ clienteDoUsuario: vi.fn() }));
vi.mock('@/lib/dados/carros', () => ({ alterarCarro: vi.fn(), removerCarro: vi.fn() }));

const { clienteDoUsuario } = await import('@/lib/supabase/servidor');
const { alterarCarro, removerCarro } = await import('@/lib/dados/carros');
const { DELETE, PATCH } = await import('./route');

const ID = '0b6f8a52-8a4f-4a8e-9a39-0e4f3f6d7c11';
const consumo = { etanol: { cidade: 8.4, estrada: 10 }, gasolina: { cidade: 12.6, estrada: 14.8 } };
const carro = { id: ID, nome: 'Onix', catalogoId: null, consumo, criadoEm: '2026-11-11T00:00:00Z', atualizadoEm: '2026-11-11T00:00:00Z' };
const getUser = vi.fn();
const supabase = { auth: { getUser } };

function requisicao(metodo: string, { token = 'token-valido', corpo }: { token?: string | null; corpo?: unknown } = {}) {
	const headers = new Headers({ 'content-type': 'application/json', 'x-forwarded-for': randomUUID() });
	if (token) headers.set('authorization', `Bearer ${token}`);
	return new Request(`http://localhost/api/v1/carros/${ID}`, {
		method: metodo,
		headers,
		body: corpo === undefined ? undefined : typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
	});
}

const contexto = (id = ID) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
	vi.resetAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.mocked(clienteDoUsuario).mockReturnValue(supabase as never);
	getUser.mockImplementation(async (token: string) =>
		token === 'token-valido' ? { data: { user: { id: 'usuario-1' } }, error: null } : { data: { user: null }, error: new Error('jwt inválido') }
	);
});

describe('PATCH /api/v1/carros/[id]', () => {
	it('altera o carro', async () => {
		vi.mocked(alterarCarro).mockResolvedValue({ ...carro, nome: 'Onix LT' });
		const resposta = await PATCH(requisicao('PATCH', { corpo: { nome: 'Onix LT' } }), contexto());
		expect(resposta.status).toBe(200);
		expect((await resposta.json()).nome).toBe('Onix LT');
		expect(alterarCarro).toHaveBeenCalledWith(supabase, ID, { nome: 'Onix LT' });
	});

	it('retorna 401 sem token válido', async () => {
		const resposta = await PATCH(requisicao('PATCH', { token: 'token-invalido', corpo: { nome: 'x' } }), contexto());
		expect(resposta.status).toBe(401);
		expect((await resposta.json()).erro.codigo).toBe('nao_autenticado');
	});

	it('retorna 404 para id que não é UUID', async () => {
		const resposta = await PATCH(requisicao('PATCH', { corpo: { nome: 'x' } }), contexto('123'));
		expect(resposta.status).toBe(404);
		expect((await resposta.json()).erro.codigo).toBe('carro_nao_encontrado');
		expect(alterarCarro).not.toHaveBeenCalled();
	});

	it('retorna 404 quando o carro não é do usuário', async () => {
		vi.mocked(alterarCarro).mockResolvedValue(null);
		const resposta = await PATCH(requisicao('PATCH', { corpo: { nome: 'x' } }), contexto());
		expect(resposta.status).toBe(404);
	});

	it.each([{}, { nome: '' }, { consumo: { etanol: { cidade: 1 } } }])('retorna 422 para corpo inválido (%j)', async corpo => {
		const resposta = await PATCH(requisicao('PATCH', { corpo }), contexto());
		expect(resposta.status).toBe(422);
		const json = await resposta.json();
		expect(json.erro.codigo).toBe('dados_invalidos');
		expect(json.erro.detalhes.length).toBeGreaterThan(0);
	});

	it('retorna 500 no formato padrão quando o banco falha', async () => {
		vi.mocked(alterarCarro).mockRejectedValue(new Error('falhou'));
		const resposta = await PATCH(requisicao('PATCH', { corpo: { nome: 'x' } }), contexto());
		expect(resposta.status).toBe(500);
		expect((await resposta.json()).erro.codigo).toBe('erro_interno');
	});
});

describe('DELETE /api/v1/carros/[id]', () => {
	it('remove o carro e retorna 204 sem corpo', async () => {
		vi.mocked(removerCarro).mockResolvedValue(true);
		const resposta = await DELETE(requisicao('DELETE'), contexto());
		expect(resposta.status).toBe(204);
		expect(await resposta.text()).toBe('');
		expect(removerCarro).toHaveBeenCalledWith(supabase, ID);
	});

	it('retorna 401 sem token', async () => {
		const resposta = await DELETE(requisicao('DELETE', { token: null }), contexto());
		expect(resposta.status).toBe(401);
	});

	it('retorna 404 quando nada foi removido', async () => {
		vi.mocked(removerCarro).mockResolvedValue(false);
		const resposta = await DELETE(requisicao('DELETE'), contexto());
		expect(resposta.status).toBe(404);
		expect((await resposta.json()).erro.codigo).toBe('carro_nao_encontrado');
	});

	it('retorna 404 para id que não é UUID', async () => {
		const resposta = await DELETE(requisicao('DELETE'), contexto('abc'));
		expect(resposta.status).toBe(404);
		expect(removerCarro).not.toHaveBeenCalled();
	});

	it('retorna 500 no formato padrão quando o banco falha', async () => {
		vi.mocked(removerCarro).mockRejectedValue(new Error('falhou'));
		const resposta = await DELETE(requisicao('DELETE'), contexto());
		expect(resposta.status).toBe(500);
		expect((await resposta.json()).erro.codigo).toBe('erro_interno');
	});
});
