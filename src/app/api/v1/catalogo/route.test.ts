import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VeiculoCatalogoApi } from '@/lib/tipos-api';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/servidor', () => ({ clientePublico: vi.fn(() => ({})) }));
vi.mock('@/lib/dados/catalogo', () => ({ buscarCatalogo: vi.fn() }));

const { buscarCatalogo } = await import('@/lib/dados/catalogo');
const { GET } = await import('./route');

const requisicao = (consulta: string) => new NextRequest(`http://localhost/api/v1/catalogo${consulta}`);

const veiculo: VeiculoCatalogoApi = {
	id: 1,
	marca: 'CHEVROLET',
	modelo: 'ONIX',
	versao: '1.0',
	fonte: 'exemplo',
	edicaoPbev: null,
	consumo: { etanol: { cidade: 8.9, estrada: 10.4 }, gasolina: { cidade: 12.8, estrada: 14.9 } },
};

beforeEach(() => {
	vi.mocked(buscarCatalogo).mockReset();
	vi.mocked(buscarCatalogo).mockResolvedValue([veiculo]);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/v1/catalogo', () => {
	it('retorna os itens encontrados', async () => {
		const resposta = await GET(requisicao('?q=onix&limite=10'));
		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toEqual({ itens: [veiculo] });
		expect(buscarCatalogo).toHaveBeenCalledWith(expect.anything(), 'onix', 10);
	});

	it.each([
		['', 50],
		['?limite=abc', 50],
		['?limite=0', 50],
		['?limite=-5', 1],
		['?limite=999', 200],
		['?limite=7.9', 7],
	])('normaliza o limite (%s)', async (consulta, limite) => {
		await GET(requisicao(consulta));
		expect(buscarCatalogo).toHaveBeenCalledWith(expect.anything(), '', limite);
	});

	it('corta termos longos em 80 caracteres', async () => {
		await GET(requisicao(`?q=${'a'.repeat(200)}`));
		expect(vi.mocked(buscarCatalogo).mock.calls[0][1]).toHaveLength(80);
	});

	it('retorna 500 no formato padrão quando o banco falha', async () => {
		vi.mocked(buscarCatalogo).mockRejectedValue(new Error('falhou'));
		const resposta = await GET(requisicao('?q=onix'));
		expect(resposta.status).toBe(500);
		expect((await resposta.json()).erro.codigo).toBe('erro_interno');
	});
});
