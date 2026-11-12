import { describe, expect, it } from 'vitest';
import { edicaoDaTabela, lerTabelaPbev, urlTabelaMaisRecente, type ItemPdf } from './parser';

const PAGINA = 'https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular';

const X = {
	categoria: 185,
	marca: 218.5,
	modelo: 249.5,
	versao: 282.8,
	motor: 305,
	propulsao: 319.8,
	transmissao: 336.6,
	ar: 350.3,
	direcao: 363.5,
	combustivel: 380.4,
	nmog: 396.3,
	etanol: [476.7, 486.6, 499.3],
	gasolina: [511.1, 521, 533.5],
	eletrico: 546.4,
};

function item(texto: string, centro: number, y: number, largura = 6): ItemPdf {
	return { texto, x: centro - largura / 2, y, largura };
}

function resumo(opcoes: { ano?: string; atualizacao?: string; flex?: string } = {}): ItemPdf[] {
	const itens = [item('PROGRAMA BRASILEIRO DE ETIQUETAGEM VEICULAR - PBEV', 280, 538.6, 80)];
	if (opcoes.ano !== undefined) itens.push(item('Tabela Ano', 220, 535.1, 10), item(opcoes.ano, 249, 535.1, 5));
	if (opcoes.atualizacao !== undefined) itens.push(item('ATUALIZAÇÃO', 220, 522.6, 12), item(opcoes.atualizacao, 248, 522.6, 8));
	if (opcoes.flex !== undefined) itens.push(item('Flex', 283, 519.2, 4), item(opcoes.flex, 306, 519.2, 4), item('Modelos', 316, 519.2, 7));
	return itens;
}

function cabecalho(opcoes: { transmissao?: string; semGrupoEtanol?: boolean } = {}): ItemPdf[] {
	return [
		item('Categoria', X.categoria, 478.2, 10),
		item('Marca', X.marca, 478.2),
		item('Modelo', X.modelo, 478.2),
		item('Versão', X.versao, 478.2),
		item('Motor', X.motor, 478.2),
		item(opcoes.transmissao ?? 'Transmissão', X.transmissao, 494.4, 10),
		item('Combustível', X.combustivel, 492.1, 10),
		item('Etanol', X.combustivel, 482.7),
		item('Flex', X.combustivel, 473.6),
		item('Quilometragem por Litro', 505, 488.7, 27),
		item(opcoes.semGrupoEtanol ? 'Álcool' : 'Etanol', 489.4, 477.9),
		item('Gasolina', 523.6, 480.2),
		item('ou', 523.6, 477.9, 2),
		item('Diesel', 523.6, 475.7),
		...[...X.etanol, ...X.gasolina].flatMap(x => [item('Cidade', x, 468.1), item('(km/l)', x, 465.8, 4.6)]),
		item('Cidade', X.eletrico, 470.4),
		item('Gasolina', X.eletrico, 463.5),
	];
}

type Linha = {
	marca: string;
	modelo: string;
	versao?: string;
	motor?: string;
	transmissao?: string;
	combustivel: string;
	etanol?: [string, string, string];
	gasolina?: [string, string, string];
};

function linha(y: number, l: Linha): ItemPdf[] {
	const consumos = (valores: [string, string, string] | undefined, xs: number[]) => xs.map((x, i) => item(valores?.[i] ?? '\\', x, y, 4));
	return [
		item('Médio', X.categoria, y, 6),
		item(l.marca, X.marca, y, l.marca.length * 1.4),
		item(l.modelo, X.modelo, y, l.modelo.length * 1.4),
		...(l.versao ? [item(l.versao, X.versao, y, l.versao.length * 1.4)] : []),
		item(l.motor ?? '1.0-12V', X.motor, y, 8),
		item('Combustão', X.propulsao, y, 10),
		item(l.transmissao ?? 'M-5', X.transmissao, y, 4),
		item('S', X.ar, y, 1),
		item('E', X.direcao, y, 1),
		item(l.combustivel, X.combustivel, y, 1.5),
		item('32', X.nmog, y, 2),
		item('B', 430.6, y + 0.4, 1.5),
		...consumos(l.etanol, X.etanol),
		...consumos(l.gasolina, X.gasolina),
		item('\\', X.eletrico, y, 1),
	];
}

function pagina(linhas: Linha[], extras: ItemPdf[] = cabecalho()): ItemPdf[] {
	return [...extras, ...linhas.flatMap((l, i) => linha(458 - i * 3.2, l))];
}

const ONIX: Linha = {
	marca: 'CHEVROLET',
	modelo: 'ONIX',
	versao: 'LTZ',
	motor: '1.0T - 12V',
	transmissao: 'A-6',
	combustivel: 'F',
	etanol: ['8,6', '10,9', '9,5'],
	gasolina: ['12,1', '15,3', '13,4'],
};

describe('lerTabelaPbev', () => {
	it('lê só os carros flex e monta a versão com motor e transmissão', () => {
		const tabela = lerTabelaPbev([
			[
				...resumo({ ano: '2026', atualizacao: '14/ago/26', flex: '2' }),
				...pagina([
					ONIX,
					{ marca: 'MINI', modelo: 'Cooper', versao: 'S', combustivel: 'G', gasolina: ['11,5', '14,1', '12,6'] },
					{ marca: 'BYD', modelo: 'DOLPHIN', versao: 'GS', combustivel: 'E' },
					{
						marca: 'VW',
						modelo: 'POLO',
						versao: 'TRACK',
						motor: '1.0-12 V',
						transmissao: 'M - 5',
						combustivel: 'F',
						etanol: ['9,1', '10,2', '9,6'],
						gasolina: ['13.0', '14,6', '13,7'],
					},
				]),
			],
		]);

		expect(tabela.edicao).toBe('2026, atualização de 14/08/2026');
		expect(tabela.flexDeclarados).toBe(2);
		expect(tabela.linhasFlex).toBe(2);
		expect(tabela.veiculos).toEqual([
			{
				marca: 'Chevrolet',
				modelo: 'ONIX',
				versao: 'LTZ 1.0T-12V A-6',
				etanol_cidade: 8.6,
				etanol_estrada: 10.9,
				gasolina_cidade: 12.1,
				gasolina_estrada: 15.3,
				edicao_pbev: '2026, atualização de 14/08/2026',
			},
			{
				marca: 'Volkswagen',
				modelo: 'POLO',
				versao: 'TRACK 1.0-12V M-5',
				etanol_cidade: 9.1,
				etanol_estrada: 10.2,
				gasolina_cidade: 13,
				gasolina_estrada: 14.6,
				edicao_pbev: '2026, atualização de 14/08/2026',
			},
		]);
	});

	it('junta páginas e normaliza nomes de marca com ou sem espaço', () => {
		const tabela = lerTabelaPbev([
			[...resumo({ ano: '2026' }), ...pagina([{ ...ONIX, marca: 'CAOA CHANGAN', modelo: 'UNI-T' }])],
			pagina([
				{ ...ONIX, marca: 'CAOACHANGAN', modelo: 'CS55' },
				{ ...ONIX, marca: 'Hyundai', modelo: 'HB20' },
			]),
		]);
		expect(tabela.veiculos.map(v => `${v.marca} ${v.modelo}`)).toEqual(['CAOA Changan UNI-T', 'CAOA Changan CS55', 'Hyundai HB20']);
		expect(tabela.flexDeclarados).toBeNull();
	});

	it('mantém marcas desconhecidas como estão no PDF', () => {
		const tabela = lerTabelaPbev([[...resumo({ ano: '2026' }), ...pagina([{ ...ONIX, marca: 'NOVA MARCA' }])]]);
		expect(tabela.veiculos[0].marca).toBe('NOVA MARCA');
	});

	it('separa flex sem consumo nos dois combustíveis', () => {
		const tabela = lerTabelaPbev([
			[
				...resumo({ ano: '2026' }),
				...pagina([{ ...ONIX, versao: 'TRACK', etanol: undefined }, { ...ONIX, versao: 'ROBUST', gasolina: ['ND', '15,3', '13,4'] }, ONIX]),
			],
		]);
		expect(tabela.linhasFlex).toBe(3);
		expect(tabela.veiculos).toHaveLength(1);
		expect(tabela.semConsumo).toEqual(['Chevrolet ONIX TRACK 1.0T-12V A-6', 'Chevrolet ONIX ROBUST 1.0T-12V A-6']);
	});

	it('ignora duplicadas e aponta as que têm consumo diferente, mantendo a primeira', () => {
		const tabela = lerTabelaPbev([
			[...resumo({ ano: '2026' }), ...pagina([ONIX, ONIX, { ...ONIX, etanol: ['8,0', '10,0', '9,0'] }, { ...ONIX, marca: 'Chevrolet' }])],
		]);
		expect(tabela.veiculos).toHaveLength(1);
		expect(tabela.veiculos[0].etanol_cidade).toBe(8.6);
		expect(tabela.duplicadas).toBe(3);
		expect(tabela.conflitantes).toEqual(['Chevrolet ONIX LTZ 1.0T-12V A-6']);
	});

	it('aceita cabeçalho de transmissão colado ao de velocidades', () => {
		const tabela = lerTabelaPbev([[...resumo({ ano: '2026' }), ...pagina([ONIX], cabecalho({ transmissao: 'TransmissãoVelocidades(nº)' }))]]);
		expect(tabela.veiculos[0].versao).toBe('LTZ 1.0T-12V A-6');
	});

	it('pula páginas sem a tabela', () => {
		const tabela = lerTabelaPbev([[...resumo({ ano: '2026' }), ...pagina([ONIX])], [item('Notas', 300, 300)]]);
		expect(tabela.veiculos).toHaveLength(1);
	});

	it('falha quando nenhuma página tem o cabeçalho da tabela', () => {
		expect(() => lerTabelaPbev([resumo({ ano: '2026' })])).toThrow(/cabeçalho da tabela/);
	});

	it('falha quando não reconhece os grupos de consumo', () => {
		expect(() => lerTabelaPbev([[...resumo({ ano: '2026' }), ...pagina([ONIX], cabecalho({ semGrupoEtanol: true }))]])).toThrow(/Layout desconhecido/);
	});
});

describe('edicaoDaTabela', () => {
	it('usa só o ano quando não há data de atualização', () => {
		expect(edicaoDaTabela(resumo({ ano: '2025' }))).toBe('2025');
	});

	it('ignora data de atualização em formato desconhecido', () => {
		expect(edicaoDaTabela(resumo({ ano: '2026', atualizacao: 'agosto' }))).toBe('2026');
	});

	it('falha sem o ano da tabela', () => {
		expect(() => edicaoDaTabela(resumo({ atualizacao: '14/ago/26' }))).toThrow(/Tabela Ano/);
	});
});

describe('urlTabelaMaisRecente', () => {
	it('escolhe a tabela do ano mais recente e ignora etiquetas de elétricos e híbridos', () => {
		const html = `
			<a href="${PAGINA}/pbe-veicular-vehp-flex-2027.pdf/@@download/file">a</a>
			<a href="${PAGINA}/mascara-pbev-2025-mar-11.pdf/view">b</a>
			<a href="${PAGINA}/mascara-pbev-2026_19_jan-rev01.pdf/view">c</a>
			<a href="${PAGINA}/mascara-pbev-2026_19_jan-rev01.pdf/@@download/file">c</a>
			<a href="${PAGINA}/ence-pbev-veic-eletricos-2027.pdf/@@download/file">d</a>
			<a href="${PAGINA}/pbev-hibridos-2027.pdf/@@download/file">h</a>
			<a href="${PAGINA}/pbe-veicular-2024-1.pdf/@@download/file">e</a>
			<a href="${PAGINA}/veiculos-leves-2021/@@download/file">f</a>`;
		expect(urlTabelaMaisRecente(html, PAGINA)).toBe(`${PAGINA}/mascara-pbev-2026_19_jan-rev01.pdf/@@download/file`);
	});

	it('resolve links relativos e mantém links diretos para o PDF', () => {
		expect(urlTabelaMaisRecente('<a href="arquivos/pbe-veicular-2027.pdf">x</a>', `${PAGINA}/`)).toBe(`${PAGINA}/arquivos/pbe-veicular-2027.pdf`);
	});

	it('falha quando a página não tem a tabela', () => {
		expect(() => urlTabelaMaisRecente('<a href="/outro.pdf">x</a>', PAGINA)).toThrow(/Nenhum PDF/);
	});
});
