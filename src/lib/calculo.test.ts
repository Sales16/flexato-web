import { describe, expect, it } from 'vitest';
import { calcular, litrosPorKm, razaoLimiteDoCarro, validarEntrada, type EntradaCalculo } from './calculo';

const polo: EntradaCalculo['consumo'] = {
	etanol: { cidade: 8.4, estrada: 10 },
	gasolina: { cidade: 12.6, estrada: 14.8 },
};

const base: EntradaCalculo = {
	consumo: polo,
	precos: { etanol: 4.39, gasolina: 6.29 },
	percentualCidade: 50,
	tanqueLitros: 52,
	kmPorMes: 1200,
};

describe('litrosPorKm', () => {
	it('pondera o inverso do consumo e não a média dos km/l', () => {
		const litros = litrosPorKm({ cidade: 8, estrada: 14 }, 50);
		expect(1 / litros).toBeCloseTo(10.18, 2);
	});

	it('ignora a estrada quando o uso é 100% cidade', () => {
		expect(litrosPorKm({ cidade: 10, estrada: Number.NaN }, 100)).toBeCloseTo(0.1, 10);
	});

	it('ignora a cidade quando o uso é 100% estrada', () => {
		expect(litrosPorKm({ cidade: Number.NaN, estrada: 20 }, 0)).toBeCloseTo(0.05, 10);
	});
});

describe('calcular', () => {
	it('escolhe gasolina quando a regra dos 70% erraria para o carro', () => {
		const r = calcular(base);
		expect(r.razaoPrecos).toBeCloseTo(0.698, 3);
		expect(r.razaoLimite).toBeCloseTo(0.671, 3);
		expect(r.vencedor).toBe('gasolina');
		expect(r.vencedorRegraGenerica).toBe('etanol');
		expect(r.regraGenericaErra).toBe(true);
	});

	it('calcula custo por km, preço limite e economia', () => {
		const r = calcular(base);
		expect(r.custoPorKm.etanol).toBeCloseTo(0.4808, 4);
		expect(r.custoPorKm.gasolina).toBeCloseTo(0.4621, 4);
		expect(r.precoLimiteEtanol).toBeCloseTo(4.22, 2);
		expect(r.economiaPorMes).toBeCloseTo(22.45, 2);
		expect(r.kmPorTanque).toBeCloseTo(707.8, 1);
		expect(r.economiaPorTanque).toBeCloseTo(r.kmPorTanque! * r.diferencaPorKm, 10);
	});

	it('escolhe etanol quando ele é mais barato por km', () => {
		const r = calcular({ ...base, precos: { etanol: 3.99, gasolina: 6.29 } });
		expect(r.vencedor).toBe('etanol');
		expect(r.regraGenericaErra).toBe(false);
	});

	it('retorna empate quando os custos por km são iguais', () => {
		const limite = razaoLimiteDoCarro(polo, 50);
		const r = calcular({ ...base, precos: { etanol: 6 * limite, gasolina: 6 } });
		expect(r.vencedor).toBe('empate');
		expect(r.economiaPorMes).toBeNull();
		expect(r.economiaPorTanque).toBeNull();
		expect(r.regraGenericaErra).toBe(false);
	});

	it('não calcula economia sem tanque ou km por mês', () => {
		const r = calcular({ ...base, tanqueLitros: null, kmPorMes: undefined });
		expect(r.kmPorTanque).toBeNull();
		expect(r.economiaPorTanque).toBeNull();
		expect(r.economiaPorMes).toBeNull();
	});

	it('lança erro com entrada inválida', () => {
		expect(() => calcular({ ...base, precos: { etanol: 0, gasolina: 6 } })).toThrow('preço do etanol');
	});
});

describe('validarEntrada', () => {
	it('exige só os consumos do trecho usado', () => {
		const consumo = { etanol: { cidade: 9, estrada: Number.NaN }, gasolina: { cidade: 13, estrada: Number.NaN } };
		expect(validarEntrada({ ...base, consumo, percentualCidade: 100 })).toEqual([]);
		expect(validarEntrada({ ...base, consumo, percentualCidade: 50 })).toHaveLength(2);
	});

	it('rejeita percentual fora de 0 a 100', () => {
		expect(validarEntrada({ ...base, percentualCidade: 120 })).toContain('percentualCidade deve estar entre 0 e 100.');
	});
});
