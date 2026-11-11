import { describe, expect, it } from 'vitest';
import { lerAbaEstados, lerAbaMunicipios, urlResumoMaisRecente, type Celula } from './parser';

const PAGINA =
	'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas';
const BASE = 'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/2026';

const cabecalhoTopo: Celula[][] = [
	['AGÊNCIA NACIONAL DO PETRÓLEO, GÁS NATURAL E BIOCOMBUSTÍVEIS - ANP'],
	['LEVANTAMENTO DE PREÇOS DE COMBUSTÍVEIS'],
	[],
	['TIPO RELATÓRIO: ESTADOS'],
	[],
];

describe('urlResumoMaisRecente', () => {
	it('escolhe a semana mais recente aceitando hífen ou underline nas datas', () => {
		const html = `
			<a href="${BASE}/resumo_semanal_lpc_2026-10-04_2026-10-10.xlsx">a</a>
			<a href="${BASE}/resumo_semanal_lpc_2026_11_01-2026_11_07.xlsx">b</a>
			<a href="${BASE}/revendas_lpc_2026_11_08-2026_11_14.xlsx">c</a>
			<a href="${BASE}/resumo_semanal_lpc_2026_10_25-2026_10_31.xlsx">d</a>`;
		expect(urlResumoMaisRecente(html, PAGINA)).toBe(`${BASE}/resumo_semanal_lpc_2026_11_01-2026_11_07.xlsx`);
	});

	it('resolve links relativos e ignora outros hosts', () => {
		const html = `
			<a href="https://exemplo.com/resumo_semanal_lpc_2026-12-01_2026-12-07.xlsx">x</a>
			<a href="arquivos-lpc/2026/resumo_semanal_lpc_2026-11-01_2026-11-07.xlsx">y</a>`;
		expect(urlResumoMaisRecente(html, PAGINA)).toBe(
			'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/2026/resumo_semanal_lpc_2026-11-01_2026-11-07.xlsx'
		);
	});

	it('falha quando não há arquivo de resumo', () => {
		expect(() => urlResumoMaisRecente('<a href="x.pdf">x</a>', PAGINA)).toThrow('resumo_semanal_lpc');
	});
});

describe('lerAbaEstados', () => {
	it('lê etanol e gasolina comum por UF e ignora outros produtos', () => {
		const linhas: Celula[][] = [
			...cabecalhoTopo,
			[
				'DATA INICIAL',
				'DATA FINAL',
				'REGIAO',
				'ESTADOS',
				'PRODUTO',
				'NÚMERO DE POSTOS PESQUISADOS',
				'UNIDADE DE MEDIDA',
				'PREÇO MÉDIO REVENDA',
				'DESVIO PADRÃO REVENDA',
				'PREÇO MÍNIMO REVENDA',
				'PREÇO MÁXIMO REVENDA',
				'COEF DE VARIAÇÃO REVENDA',
			],
			[
				new Date('2026-11-01T00:00:00Z'),
				new Date('2026-11-07T00:00:00Z'),
				'SUDESTE',
				'SAO PAULO',
				'ETANOL HIDRATADO',
				1200,
				'R$/l',
				3.95,
				0.2,
				3.29,
				5.49,
				0.05,
			],
			['2026-11-01', '2026-11-07', 'SUDESTE', 'SAO PAULO', 'GASOLINA COMUM', 1300, 'R$/l', 6.19, 0.2, 5.59, 7.99, 0.03],
			['2026-11-01', '2026-11-07', 'SUDESTE', 'SAO PAULO', 'GASOLINA ADITIVADA', 900, 'R$/l', 6.39, 0.2, 5.79, 8.19, 0.03],
			['2026-11-01', '2026-11-07', 'NORDESTE', 'PIAUI', 'ETANOL HIDRATADO', 80, 'R$/l', 4.79, 0.2, 4.29, 5.49, 0.05],
			['2026-11-01', '2026-11-07', 'X', 'ESTADO INEXISTENTE', 'ETANOL HIDRATADO', 1, 'R$/l', 4.79, 0, 4.79, 4.79, 0],
		];
		expect(lerAbaEstados(linhas)).toEqual([
			{
				semanaInicio: '2026-11-01',
				semanaFim: '2026-11-07',
				uf: 'SP',
				produto: 'etanol',
				precoMedio: 3.95,
				precoMin: 3.29,
				precoMax: 5.49,
				postos: 1200,
			},
			{
				semanaInicio: '2026-11-01',
				semanaFim: '2026-11-07',
				uf: 'SP',
				produto: 'gasolina',
				precoMedio: 6.19,
				precoMin: 5.59,
				precoMax: 7.99,
				postos: 1300,
			},
			{ semanaInicio: '2026-11-01', semanaFim: '2026-11-07', uf: 'PI', produto: 'etanol', precoMedio: 4.79, precoMin: 4.29, precoMax: 5.49, postos: 80 },
		]);
	});

	it('falha quando o cabeçalho não existe', () => {
		expect(() => lerAbaEstados([['nada aqui']])).toThrow('Cabeçalho');
	});
});

describe('lerAbaMunicipios', () => {
	it('lê o município normalizado e aceita datas no formato brasileiro', () => {
		const linhas: Celula[][] = [
			[
				'DATA INICIAL',
				'DATA FINAL',
				'ESTADO',
				'MUNICÍPIO',
				'PRODUTO',
				'NÚMERO DE POSTOS PESQUISADOS',
				'UNIDADE DE MEDIDA',
				'PREÇO MÉDIO REVENDA',
				'DESVIO PADRÃO REVENDA',
				'PREÇO MÍNIMO REVENDA',
				'PREÇO MÁXIMO REVENDA',
			],
			['01/11/2026', '07/11/2026', 'MINAS GERAIS', 'Belo  Horizonte', 'ETANOL HIDRATADO', 40, 'R$/l', '4,46', 0.1, 3.99, 4.69],
			['01/11/2026', '07/11/2026', 'MINAS GERAIS', '', 'ETANOL HIDRATADO', 40, 'R$/l', 4.46, 0.1, 3.99, 4.69],
		];
		expect(lerAbaMunicipios(linhas)).toEqual([
			{
				semanaInicio: '2026-11-01',
				semanaFim: '2026-11-07',
				uf: 'MG',
				municipioChave: 'BELO HORIZONTE',
				produto: 'etanol',
				precoMedio: 4.46,
				precoMin: 3.99,
				precoMax: 4.69,
				postos: 40,
			},
		]);
	});
});
