import { describe, expect, it } from 'vitest';
import { POST } from './route';

function requisicao(corpo: unknown) {
	return new Request('http://localhost/api/v1/calculo', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
	});
}

const valido = {
	consumo: { etanol: { cidade: 8.4, estrada: 10 }, gasolina: { cidade: 12.6, estrada: 14.8 } },
	precos: { etanol: 4.39, gasolina: 6.29 },
	percentualCidade: 50,
	kmPorMes: 1200,
};

describe('POST /api/v1/calculo', () => {
	it('retorna o resultado do cálculo', async () => {
		const resposta = await POST(requisicao(valido));
		expect(resposta.status).toBe(200);
		const corpo = await resposta.json();
		expect(corpo.vencedor).toBe('gasolina');
		expect(corpo.regraGenericaErra).toBe(true);
		expect(corpo.economiaPorMes).toBeCloseTo(22.45, 2);
	});

	it('aceita consumo nulo no trecho que não é usado', async () => {
		const resposta = await POST(
			requisicao({ ...valido, percentualCidade: 100, consumo: { etanol: { cidade: 8.4, estrada: null }, gasolina: { cidade: 12.6, estrada: null } } })
		);
		expect(resposta.status).toBe(200);
	});

	it('retorna 422 quando falta consumo do trecho usado', async () => {
		const resposta = await POST(requisicao({ ...valido, consumo: { etanol: { cidade: 8.4, estrada: null }, gasolina: { cidade: 12.6, estrada: 14.8 } } }));
		expect(resposta.status).toBe(422);
		const corpo = await resposta.json();
		expect(corpo.erro.codigo).toBe('dados_invalidos');
		expect(corpo.erro.detalhes).toContain('Informe o consumo de etanol na estrada.');
	});

	it('retorna 422 para JSON inválido', async () => {
		const resposta = await POST(requisicao('{nao é json'));
		expect(resposta.status).toBe(422);
	});

	it('retorna 422 para preço negativo', async () => {
		const resposta = await POST(requisicao({ ...valido, precos: { etanol: -1, gasolina: 6 } }));
		expect(resposta.status).toBe(422);
		expect((await resposta.json()).erro.detalhes[0]).toMatch(/^precos\.etanol/);
	});
});
