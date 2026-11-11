import { describe, expect, it } from 'vitest';
import { criarLimitador, ESCRITA, ipDoCliente, limitar, type Regra } from './limite';

const regra: Regra = { nome: 'teste', limite: 3, janelaMs: 10_000 };

function relogio(inicio = 0) {
	let agora = inicio;
	return { agora: () => agora, avancar: (ms: number) => (agora += ms) };
}

describe('criarLimitador', () => {
	it('permite até o limite e bloqueia a seguinte com o tempo de espera em segundos', () => {
		const r = relogio();
		const consumir = criarLimitador(r.agora);
		expect([consumir(regra, 'a'), consumir(regra, 'a'), consumir(regra, 'a')]).toEqual([null, null, null]);
		r.avancar(2_500);
		expect(consumir(regra, 'a')).toBe(8);
	});

	it('libera quando a janela expira', () => {
		const r = relogio();
		const consumir = criarLimitador(r.agora);
		for (let i = 0; i < 4; i++) consumir(regra, 'a');
		r.avancar(10_000);
		expect(consumir(regra, 'a')).toBeNull();
	});

	it('conta cada cliente e cada regra separadamente', () => {
		const consumir = criarLimitador(relogio().agora);
		for (let i = 0; i < 3; i++) consumir(regra, 'a');
		expect(consumir(regra, 'b')).toBeNull();
		expect(consumir({ ...regra, nome: 'outra' }, 'a')).toBeNull();
		expect(consumir(regra, 'a')).not.toBeNull();
	});

	it('nunca pede menos de 1 segundo de espera', () => {
		const r = relogio();
		const consumir = criarLimitador(r.agora);
		for (let i = 0; i < 3; i++) consumir(regra, 'a');
		r.avancar(9_999);
		expect(consumir(regra, 'a')).toBe(1);
	});

	it('mantém a memória limitada descartando as chaves mais antigas', () => {
		const consumir = criarLimitador(relogio().agora, 2);
		for (let i = 0; i < 4; i++) consumir(regra, 'a');
		consumir(regra, 'b');
		consumir(regra, 'c');
		expect(consumir(regra, 'a')).toBeNull();
	});
});

describe('ipDoCliente', () => {
	const req = (headers: Record<string, string>) => new Request('http://localhost', { headers });

	it('usa x-real-ip, depois o primeiro x-forwarded-for', () => {
		expect(ipDoCliente(req({ 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' }))).toBe('1.1.1.1');
		expect(ipDoCliente(req({ 'x-forwarded-for': ' 2.2.2.2 , 3.3.3.3' }))).toBe('2.2.2.2');
		expect(ipDoCliente(req({}))).toBe('desconhecido');
	});
});

describe('limitar', () => {
	it('responde 429 no formato padrão com Retry-After depois do limite', async () => {
		const request = new Request('http://localhost', { headers: { 'x-forwarded-for': '203.0.113.50' } });
		for (let i = 0; i < ESCRITA.limite; i++) expect(limitar(request, ESCRITA)).toBeNull();
		const resposta = limitar(request, ESCRITA);
		expect(resposta?.status).toBe(429);
		expect(Number(resposta?.headers.get('Retry-After'))).toBeGreaterThan(0);
		expect(await resposta?.json()).toEqual({ erro: { codigo: 'muitas_requisicoes', mensagem: expect.any(String) } });
	});
});
