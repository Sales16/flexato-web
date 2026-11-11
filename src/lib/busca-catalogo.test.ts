import { describe, expect, it } from 'vitest';
import { normalizarBusca, ordenarPorRelevancia, palavrasDaBusca } from './busca-catalogo';

const carro = (marca: string, modelo: string, versao: string) => ({ marca, modelo, versao });

describe('normalizarBusca', () => {
	it('remove acentos, cedilha e caixa alta', () => {
		expect(normalizarBusca('  Citroën  CAÇA  ')).toBe('citroen caca');
	});
});

describe('palavrasDaBusca', () => {
	it('separa palavras e descarta curingas e caracteres do PostgREST', () => {
		expect(palavrasDaBusca('Hyundai  HB20 (1.0)%_*,\\')).toEqual(['hyundai', 'hb20', '1.0']);
	});

	it('devolve lista vazia para busca em branco', () => {
		expect(palavrasDaBusca('  % ')).toEqual([]);
	});
});

describe('ordenarPorRelevancia', () => {
	const itens = [
		carro('Chevrolet', 'MONTANA', 'LTZ 1.2T-12V A-6'),
		carro('Chevrolet', 'ONIX PLUS', 'LTZ 1.0T-12V A-6'),
		carro('Chevrolet', 'ONIX', 'LTZ 1.0T-12V A-6'),
		carro('Chevrolet', 'TRACKER', 'ONIX 1.0T-12V A-6'),
	];

	it('põe o modelo exato antes de modelos que só começam com o termo', () => {
		expect(ordenarPorRelevancia(itens, 'onix').map(i => i.modelo)).toEqual(['ONIX', 'ONIX PLUS', 'TRACKER', 'MONTANA']);
	});

	it('valoriza o modelo acima da marca e da versão', () => {
		const lista = [carro('Fiat', 'ARGO', 'DRIVE 1.0'), carro('Hyundai', 'HB20', 'Comfort 1.0-12V'), carro('Hyundai', 'CRETA', 'HB20 1.0')];
		expect(ordenarPorRelevancia(lista, 'hb20').map(i => i.modelo)).toEqual(['HB20', 'CRETA', 'ARGO']);
	});

	it('ignora acentos e mantém a ordem original no empate', () => {
		const lista = [carro('Citroën', 'C3', 'Feel 1.0'), carro('Citroën', 'BASALT', 'Shine 1.0T'), carro('Fiat', 'MOBI', 'LIKE')];
		expect(ordenarPorRelevancia(lista, 'citroen').map(i => i.modelo)).toEqual(['C3', 'BASALT', 'MOBI']);
	});

	it('soma a pontuação de várias palavras', () => {
		const lista = [carro('Toyota', 'COROLLA', 'GLI HEV 1.8 16V CVT'), carro('Toyota', 'COROLLA CROSS', 'XRX HYBRID 1.8-16V CVT')];
		expect(ordenarPorRelevancia(lista, 'corolla cross').map(i => i.modelo)).toEqual(['COROLLA CROSS', 'COROLLA']);
		expect(ordenarPorRelevancia(lista, 'corolla hev').map(i => i.modelo)).toEqual(['COROLLA', 'COROLLA CROSS']);
	});

	it('não reordena quando a busca está vazia', () => {
		expect(ordenarPorRelevancia(itens, '')).toBe(itens);
	});
});
