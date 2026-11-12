import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/server', async importOriginal => ({ ...(await importOriginal<typeof import('next/server')>()), connection: vi.fn(async () => {}) }));
vi.mock('@/lib/supabase/servidor', () => ({ clienteDoUsuario: vi.fn(() => ({})), clientePublico: vi.fn(() => ({})), clienteAdmin: vi.fn(() => ({})) }));
vi.mock('@/lib/api/limite', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/api/limite')>()), limitar: vi.fn() }));

const { ESCRITA, LEITURA, limitar } = await import('@/lib/api/limite');
const servidor = await import('@/lib/supabase/servidor');
const calculo = await import('./calculo/route');
const precos = await import('./precos/route');
const historico = await import('./precos/historico/route');
const catalogo = await import('./catalogo/route');
const locais = await import('./locais/route');
const localizacao = await import('./localizacao/route');
const carros = await import('./carros/route');
const carro = await import('./carros/[id]/route');
const abastecimentos = await import('./carros/[id]/abastecimentos/route');
const abastecimento = await import('./carros/[id]/abastecimentos/[abastecimentoId]/route');

type Handler = (request: NextRequest, ctx: never) => Promise<Response>;

const casos: [string, string, Handler, typeof LEITURA][] = [
	['POST', '/calculo', calculo.POST, LEITURA],
	['GET', '/precos?uf=SP', precos.GET, LEITURA],
	['GET', '/precos/historico?uf=SP', historico.GET, LEITURA],
	['GET', '/catalogo?q=onix', catalogo.GET, LEITURA],
	['GET', '/locais', locais.GET, LEITURA],
	['GET', '/localizacao?lat=-23.55&lng=-46.63', localizacao.GET, LEITURA],
	['GET', '/carros', carros.GET, LEITURA],
	['POST', '/carros', carros.POST, ESCRITA],
	['PATCH', '/carros/{id}', carro.PATCH, ESCRITA],
	['DELETE', '/carros/{id}', carro.DELETE, ESCRITA],
	['GET', '/carros/{id}/abastecimentos', abastecimentos.GET, LEITURA],
	['POST', '/carros/{id}/abastecimentos', abastecimentos.POST, ESCRITA],
	['DELETE', '/carros/{id}/abastecimentos/{abastecimentoId}', abastecimento.DELETE, ESCRITA],
];

const ID = '0b6f8a52-8a4f-4a8e-9a39-0e4f3f6d7c11';
const ctx = { params: Promise.resolve({ id: ID, abastecimentoId: ID }) } as never;

function contarLimitar(pasta: string): number {
	return readdirSync(pasta, { recursive: true, encoding: 'utf8' })
		.filter(arquivo => /(^|[\\/])route\.ts$/.test(arquivo))
		.reduce((total, arquivo) => total + (readFileSync(join(pasta, arquivo), 'utf8').match(/\blimitar\(/g)?.length ?? 0), 0);
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('limite de requisições nas rotas da API', () => {
	it('cobre todos os handlers que chamam limitar', () => {
		expect(contarLimitar(fileURLToPath(new URL('.', import.meta.url)))).toBe(casos.length);
	});

	it.each(casos)('%s %s devolve o 429 do limitador com a regra certa, antes de tocar no banco', async (metodo, rota, handler, regra) => {
		const bloqueio = new Response(null, { status: 429 });
		vi.mocked(limitar).mockReturnValue(bloqueio);
		const request = new NextRequest(`http://localhost/api/v1${rota.replaceAll('{id}', ID).replace('{abastecimentoId}', ID)}`, {
			method: metodo,
			headers: { authorization: 'Bearer token' },
		});

		const resposta = await handler(request, ctx);

		expect(resposta).toBe(bloqueio);
		expect(limitar).toHaveBeenCalledExactlyOnceWith(request, regra);
		expect(servidor.clienteDoUsuario).not.toHaveBeenCalled();
		expect(servidor.clientePublico).not.toHaveBeenCalled();
		expect(servidor.clienteAdmin).not.toHaveBeenCalled();
	});
});
