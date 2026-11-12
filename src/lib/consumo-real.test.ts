import { describe, expect, it } from 'vitest';
import { calcularConsumoReal, type RegistroAbastecimento } from './consumo-real';

let sequencia = 0;
function reg(parcial: Partial<RegistroAbastecimento> & Pick<RegistroAbastecimento, 'data' | 'hodometroKm' | 'litros'>): RegistroAbastecimento {
	sequencia += 1;
	return { id: `a${sequencia}`, combustivel: 'etanol', tanqueCheio: true, trecho: null, ...parcial };
}

describe('calcularConsumoReal (tanque cheio a tanque cheio)', () => {
	it('mede km entre dois enchimentos completos dividido pelos litros do segundo', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-10-01', hodometroKm: 10000, litros: 40 }),
			reg({ data: '2026-10-10', hodometroKm: 10360, litros: 40 }),
		]);
		expect(r.intervalos).toHaveLength(1);
		expect(r.intervalos[0]).toMatchObject({ km: 360, litros: 40, kmPorLitro: 9, motivoDescarte: null });
		expect(r.medicoes).toEqual([{ combustivel: 'etanol', trecho: null, km: 360, litros: 40, kmPorLitro: 9, intervalos: 1 }]);
	});

	it('o primeiro enchimento só abre a medição: os litros dele queimaram km anteriores ao registro', () => {
		const r = calcularConsumoReal([reg({ data: '2026-10-01', hodometroKm: 10000, litros: 45 })]);
		expect(r.intervalos).toEqual([]);
		expect(r.medicoes).toEqual([]);
	});

	it('soma os abastecimentos parciais do meio no intervalo que fecha com tanque cheio', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-10-01', hodometroKm: 10000, litros: 40 }),
			reg({ data: '2026-10-05', hodometroKm: 10200, litros: 15, tanqueCheio: false }),
			reg({ data: '2026-10-10', hodometroKm: 10500, litros: 35 }),
		]);
		expect(r.intervalos).toHaveLength(1);
		expect(r.intervalos[0]).toMatchObject({ km: 500, litros: 50, kmPorLitro: 10 });
	});

	it('abastecimentos parciais antes do primeiro tanque cheio são ignorados', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-09-28', hodometroKm: 9800, litros: 10, tanqueCheio: false }),
			reg({ data: '2026-10-01', hodometroKm: 10000, litros: 40 }),
			reg({ data: '2026-10-10', hodometroKm: 10400, litros: 40 }),
		]);
		expect(r.intervalos).toHaveLength(1);
		expect(r.intervalos[0]).toMatchObject({ km: 400, litros: 40, kmPorLitro: 10 });
	});

	it('ordena por data e hodômetro, independente da ordem de cadastro', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-10-10', hodometroKm: 10360, litros: 40 }),
			reg({ data: '2026-10-01', hodometroKm: 10000, litros: 40 }),
		]);
		expect(r.intervalos[0]).toMatchObject({ km: 360, kmPorLitro: 9, motivoDescarte: null });
	});

	it('separa por combustível e pondera pelos km quando há vários intervalos', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-09-01', hodometroKm: 1000, litros: 40 }),
			reg({ data: '2026-09-10', hodometroKm: 1300, litros: 30 }),
			reg({ data: '2026-09-20', hodometroKm: 1700, litros: 50 }),
			reg({ data: '2026-10-01', hodometroKm: 2300, litros: 50, combustivel: 'gasolina' }),
			reg({ data: '2026-10-10', hodometroKm: 2900, litros: 50, combustivel: 'gasolina' }),
			reg({ data: '2026-10-20', hodometroKm: 3500, litros: 50, combustivel: 'gasolina' }),
		]);
		expect(r.intervalos.map(i => i.motivoDescarte)).toEqual([null, null, null, 'combustiveis_misturados', null]);
		expect(r.medicoes).toEqual([
			{ combustivel: 'etanol', trecho: null, km: 1300, litros: 130, kmPorLitro: 10, intervalos: 3 },
			{ combustivel: 'gasolina', trecho: null, km: 600, litros: 50, kmPorLitro: 12, intervalos: 1 },
		]);
	});

	it('o combustível que fecha o intervalo não importa: os litros dele repõem o que foi queimado do tanque anterior', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-10-01', hodometroKm: 1000, litros: 40, combustivel: 'gasolina' }),
			reg({ data: '2026-10-10', hodometroKm: 1500, litros: 45, combustivel: 'etanol' }),
		]);
		expect(r.intervalos[0]).toMatchObject({ combustivel: 'gasolina', motivoDescarte: null, kmPorLitro: 11.11 });
	});

	it('descarta o primeiro tanque depois da troca de combustível: o resto do tanque anterior se mistura', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-10-01', hodometroKm: 1000, litros: 40, combustivel: 'gasolina' }),
			reg({ data: '2026-10-10', hodometroKm: 1500, litros: 45, combustivel: 'etanol' }),
			reg({ data: '2026-10-20', hodometroKm: 1860, litros: 40, combustivel: 'etanol' }),
		]);
		expect(r.intervalos.map(i => i.motivoDescarte)).toEqual([null, 'combustiveis_misturados']);
		expect(r.intervalos[1].combustivel).toBeNull();
		expect(r.medicoes).toEqual([{ combustivel: 'gasolina', trecho: null, km: 500, litros: 45, kmPorLitro: 11.11, intervalos: 1 }]);
	});

	it('descarta intervalo com parcial de outro combustível no meio', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-10-01', hodometroKm: 1000, litros: 40 }),
			reg({ data: '2026-10-05', hodometroKm: 1200, litros: 10, combustivel: 'gasolina', tanqueCheio: false }),
			reg({ data: '2026-10-10', hodometroKm: 1500, litros: 30 }),
		]);
		expect(r.intervalos[0].motivoDescarte).toBe('combustiveis_misturados');
		expect(r.medicoes).toEqual([]);
	});

	it('o resto de um tanque misturado contamina o intervalo seguinte, mesmo com o registro anterior do mesmo combustível', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-10-01', hodometroKm: 1000, litros: 40, combustivel: 'gasolina' }),
			reg({ data: '2026-10-05', hodometroKm: 1200, litros: 10, tanqueCheio: false }),
			reg({ data: '2026-10-10', hodometroKm: 1500, litros: 30 }),
			reg({ data: '2026-10-20', hodometroKm: 1860, litros: 40 }),
			reg({ data: '2026-10-30', hodometroKm: 2220, litros: 40 }),
		]);
		expect(r.intervalos.map(i => i.motivoDescarte)).toEqual(['combustiveis_misturados', 'combustiveis_misturados', null]);
		expect(r.intervalos.map(i => i.combustivel)).toEqual([null, null, 'etanol']);
		expect(r.medicoes).toEqual([{ combustivel: 'etanol', trecho: null, km: 360, litros: 40, kmPorLitro: 9, intervalos: 1 }]);
	});

	it('propaga a mistura mesmo quando o intervalo da troca foi descartado por outro motivo', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-10-01', hodometroKm: 10000, litros: 40 }),
			reg({ data: '2026-10-10', hodometroKm: 9900, litros: 40, combustivel: 'gasolina' }),
			reg({ data: '2026-10-20', hodometroKm: 10400, litros: 40, combustivel: 'gasolina' }),
			reg({ data: '2026-10-30', hodometroKm: 10880, litros: 40, combustivel: 'gasolina' }),
		]);
		expect(r.intervalos.map(i => i.motivoDescarte)).toEqual(['hodometro_inconsistente', 'combustiveis_misturados', null]);
		expect(r.medicoes).toEqual([{ combustivel: 'gasolina', trecho: null, km: 480, litros: 40, kmPorLitro: 12, intervalos: 1 }]);
	});

	it('parcial de outro combustível antes do primeiro tanque cheio deixa a abertura misturada', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-09-28', hodometroKm: 9800, litros: 10, combustivel: 'gasolina', tanqueCheio: false }),
			reg({ data: '2026-10-01', hodometroKm: 10000, litros: 40 }),
			reg({ data: '2026-10-10', hodometroKm: 10400, litros: 40 }),
		]);
		expect(r.intervalos[0].motivoDescarte).toBe('combustiveis_misturados');
	});

	it('descarta o trecho em que o hodômetro volta: algum valor foi digitado errado e não dá para saber qual', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-10-01', hodometroKm: 10000, litros: 40 }),
			reg({ data: '2026-10-10', hodometroKm: 9900, litros: 40 }),
		]);
		expect(r.intervalos[0]).toMatchObject({ km: -100, kmPorLitro: null, motivoDescarte: 'hodometro_inconsistente' });
		expect(r.medicoes).toEqual([]);
	});

	it('descarta quando um parcial do meio tem hodômetro menor que o anterior', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-10-01', hodometroKm: 10000, litros: 40 }),
			reg({ data: '2026-10-03', hodometroKm: 10300, litros: 10, tanqueCheio: false }),
			reg({ data: '2026-10-05', hodometroKm: 10100, litros: 10, tanqueCheio: false }),
			reg({ data: '2026-10-10', hodometroKm: 10400, litros: 20 }),
		]);
		expect(r.intervalos[0].motivoDescarte).toBe('hodometro_inconsistente');
	});

	it('descarta intervalo sem km rodados (dois enchimentos no mesmo hodômetro)', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-10-01', hodometroKm: 10000, litros: 40 }),
			reg({ data: '2026-10-01', hodometroKm: 10000, litros: 2 }),
		]);
		expect(r.intervalos[0].motivoDescarte).toBe('hodometro_inconsistente');
	});

	it('descarta intervalo com litros zero: não há como dividir', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-10-01', hodometroKm: 10000, litros: 40 }),
			reg({ data: '2026-10-10', hodometroKm: 10300, litros: 0 }),
		]);
		expect(r.intervalos[0]).toMatchObject({ kmPorLitro: null, motivoDescarte: 'litros_invalidos' });
	});

	it('descarta consumo fora de 2 a 40 km/l: sinal de abastecimento não registrado ou hodômetro errado', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-10-01', hodometroKm: 10000, litros: 40 }),
			reg({ data: '2026-10-10', hodometroKm: 11000, litros: 20 }),
			reg({ data: '2026-10-20', hodometroKm: 11050, litros: 40 }),
		]);
		expect(r.intervalos.map(i => i.motivoDescarte)).toEqual(['consumo_implausivel', 'consumo_implausivel']);
		expect(r.medicoes).toEqual([]);
	});

	it('um intervalo descartado não contamina o seguinte: o tanque cheio que fecha também reabre', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-10-01', hodometroKm: 10000, litros: 40 }),
			reg({ data: '2026-10-10', hodometroKm: 10300, litros: 0 }),
			reg({ data: '2026-10-20', hodometroKm: 10660, litros: 40 }),
		]);
		expect(r.intervalos.map(i => i.motivoDescarte)).toEqual(['litros_invalidos', null]);
		expect(r.medicoes[0]).toMatchObject({ km: 360, kmPorLitro: 9 });
	});

	it('atribui o trecho ao intervalo só quando todos os abastecimentos que o fecham marcam o mesmo trecho', () => {
		const r = calcularConsumoReal([
			reg({ data: '2026-09-01', hodometroKm: 1000, litros: 40 }),
			reg({ data: '2026-09-10', hodometroKm: 1320, litros: 40, trecho: 'cidade' }),
			reg({ data: '2026-09-20', hodometroKm: 1820, litros: 40, trecho: 'estrada' }),
			reg({ data: '2026-09-25', hodometroKm: 1900, litros: 5, trecho: 'cidade', tanqueCheio: false }),
			reg({ data: '2026-09-30', hodometroKm: 2200, litros: 35, trecho: 'estrada' }),
			reg({ data: '2026-10-10', hodometroKm: 2600, litros: 40, trecho: 'misto' }),
		]);
		expect(r.intervalos.map(i => i.trecho)).toEqual(['cidade', 'estrada', null, null]);
		expect(r.medicoes).toEqual([
			{ combustivel: 'etanol', trecho: 'cidade', km: 320, litros: 40, kmPorLitro: 8, intervalos: 1 },
			{ combustivel: 'etanol', trecho: 'estrada', km: 500, litros: 40, kmPorLitro: 12.5, intervalos: 1 },
			{ combustivel: 'etanol', trecho: null, km: 780, litros: 80, kmPorLitro: 9.75, intervalos: 2 },
		]);
	});
});
