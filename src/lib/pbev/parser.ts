export type ItemPdf = { texto: string; x: number; y: number; largura: number };

export type VeiculoPbev = {
	marca: string;
	modelo: string;
	versao: string;
	etanol_cidade: number;
	etanol_estrada: number;
	gasolina_cidade: number;
	gasolina_estrada: number;
	edicao_pbev: string;
};

export type TabelaPbev = {
	edicao: string;
	flexDeclarados: number | null;
	linhasFlex: number;
	veiculos: VeiculoPbev[];
	semConsumo: string[];
	duplicadas: number;
	conflitantes: string[];
};

type Coluna = 'marca' | 'modelo' | 'versao' | 'motor' | 'transmissao' | 'combustivel' | 'etanolCidade' | 'etanolEstrada' | 'gasolinaCidade' | 'gasolinaEstrada';

const TOLERANCIA_COLUNA = 3;
const TOLERANCIA_LINHA = 1;
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const MARCAS: Record<string, string> = {
	AUDI: 'Audi',
	BMW: 'BMW',
	BYD: 'BYD',
	CAOACHANGAN: 'CAOA Changan',
	CAOACHERY: 'CAOA Chery',
	CHEVROLET: 'Chevrolet',
	CITROEN: 'Citroën',
	FIAT: 'Fiat',
	FORD: 'Ford',
	GWM: 'GWM',
	HONDA: 'Honda',
	HYUNDAI: 'Hyundai',
	JAC: 'JAC',
	JEEP: 'Jeep',
	KIA: 'Kia',
	LANDROVER: 'Land Rover',
	MITSUBISHI: 'Mitsubishi',
	NISSAN: 'Nissan',
	PEUGEOT: 'Peugeot',
	RAM: 'RAM',
	RENAULT: 'Renault',
	TOYOTA: 'Toyota',
	VOLKSWAGEN: 'Volkswagen',
	VW: 'Volkswagen',
};

function limpar(texto: string): string {
	return texto.replace(/\s+/g, ' ').trim();
}

function semAcento(texto: string): string {
	return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function centro(item: ItemPdf): number {
	return item.x + item.largura / 2;
}

function nomeMarca(texto: string): string {
	const chave = semAcento(texto)
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '');
	return MARCAS[chave] ?? limpar(texto);
}

function juntarHifens(texto: string): string {
	return limpar(texto)
		.replace(/\s*-\s*/g, '-')
		.replace(/(\d)\s+V\b/g, '$1V');
}

function consumo(texto: string | undefined): number | null {
	const t = limpar(texto ?? '');
	if (!/^\d{1,2}([.,]\d{1,2})?$/.test(t)) return null;
	const valor = Number(t.replace(',', '.'));
	return valor > 0 ? valor : null;
}

function agruparLinhas(itens: ItemPdf[]): ItemPdf[][] {
	const ordenados = [...itens].sort((a, b) => b.y - a.y || a.x - b.x);
	const linhas: { y: number; itens: ItemPdf[] }[] = [];
	for (const item of ordenados) {
		const ultima = linhas.at(-1);
		if (ultima && ultima.y - item.y <= TOLERANCIA_LINHA) ultima.itens.push(item);
		else linhas.push({ y: item.y, itens: [item] });
	}
	return linhas.map(l => l.itens.sort((a, b) => a.x - b.x));
}

function achar(itens: ItemPdf[], texto: string): ItemPdf[] {
	return itens.filter(i => limpar(i.texto) === texto);
}

function vizinhoADireita(itens: ItemPdf[], rotulo: string): string | null {
	const alvo = itens.find(i => limpar(i.texto).toUpperCase() === rotulo);
	if (!alvo) return null;
	const direita = itens.filter(i => Math.abs(i.y - alvo.y) <= TOLERANCIA_LINHA && i.x > alvo.x).sort((a, b) => a.x - b.x);
	return direita[0] ? limpar(direita[0].texto) : null;
}

function dataAtualizacao(texto: string | null): string | null {
	const m = texto?.match(/^(\d{1,2})\/([a-zç]{3})\/(\d{2}|\d{4})$/i);
	if (!m) return null;
	const mes = MESES.indexOf(m[2].toLowerCase());
	if (mes < 0) return null;
	const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
	return `${m[1].padStart(2, '0')}/${String(mes + 1).padStart(2, '0')}/${ano}`;
}

export function edicaoDaTabela(itens: ItemPdf[]): string {
	const ano = vizinhoADireita(itens, 'TABELA ANO');
	if (!ano || !/^\d{4}$/.test(ano)) throw new Error('Não encontrei o ano da tabela PBEV ("Tabela Ano") no PDF.');
	const atualizacao = dataAtualizacao(vizinhoADireita(itens, 'ATUALIZAÇÃO'));
	return atualizacao ? `${ano}, atualização de ${atualizacao}` : ano;
}

function flexDeclarados(itens: ItemPdf[]): number | null {
	const flex = itens.find(i => limpar(i.texto) === 'Flex' && itens.some(j => limpar(j.texto) === 'Modelos' && Math.abs(j.y - i.y) <= TOLERANCIA_LINHA));
	if (!flex) return null;
	const numero = itens.find(i => Math.abs(i.y - flex.y) <= TOLERANCIA_LINHA && i.x > flex.x && /^\d+$/.test(limpar(i.texto)));
	return numero ? Number(limpar(numero.texto)) : null;
}

function colunasDaPagina(itens: ItemPdf[]): { colunas: Record<Coluna, number>; topoDados: number } | null {
	const marca = achar(itens, 'Marca').find(m => ['Modelo', 'Versão', 'Motor'].every(r => achar(itens, r).some(i => Math.abs(i.y - m.y) <= TOLERANCIA_LINHA)));
	if (!marca) return null;
	const naLinha = (rotulo: string) => achar(itens, rotulo).find(i => Math.abs(i.y - marca.y) <= TOLERANCIA_LINHA)!;
	const noCabecalho = (rotulo: string) => {
		const candidatos = itens.filter(i => limpar(i.texto).startsWith(rotulo) && Math.abs(i.y - marca.y) <= 30);
		if (candidatos.length !== 1) throw new Error(`Cabeçalho "${rotulo}" não encontrado de forma única no PDF da PBEV.`);
		return candidatos[0];
	};
	const kml = achar(itens, '(km/l)')
		.filter(i => i.y < marca.y && marca.y - i.y <= 30)
		.sort((a, b) => a.x - b.x);
	if (kml.length !== 6) throw new Error(`Esperava 6 colunas "(km/l)" no cabeçalho da PBEV, encontrei ${kml.length}.`);
	const grupo = (rotulo: string, inicio: ItemPdf, fim: ItemPdf) =>
		achar(itens, rotulo).some(i => i.y > kml[0].y && i.y < marca.y + 15 && centro(i) >= centro(inicio) - 2 && centro(i) <= centro(fim) + 2);
	if (!grupo('Etanol', kml[0], kml[2]) || !grupo('Gasolina', kml[3], kml[5]))
		throw new Error('Layout desconhecido: não reconheci os grupos de consumo Etanol e Gasolina no cabeçalho da PBEV.');
	return {
		colunas: {
			marca: centro(naLinha('Marca')),
			modelo: centro(naLinha('Modelo')),
			versao: centro(naLinha('Versão')),
			motor: centro(naLinha('Motor')),
			transmissao: centro(noCabecalho('Transmissão')),
			combustivel: centro(noCabecalho('Combustível')),
			etanolCidade: centro(kml[0]),
			etanolEstrada: centro(kml[1]),
			gasolinaCidade: centro(kml[3]),
			gasolinaEstrada: centro(kml[4]),
		},
		topoDados: Math.min(...kml.map(k => k.y)) - TOLERANCIA_LINHA,
	};
}

function celulas(linha: ItemPdf[], colunas: Record<Coluna, number>): Partial<Record<Coluna, string>> {
	const resultado: Partial<Record<Coluna, string>> = {};
	for (const item of linha) {
		let melhor: Coluna | null = null;
		let distancia = TOLERANCIA_COLUNA;
		for (const [nome, x] of Object.entries(colunas) as [Coluna, number][]) {
			const d = Math.abs(centro(item) - x);
			if (d <= distancia) {
				melhor = nome;
				distancia = d;
			}
		}
		if (melhor) resultado[melhor] = limpar(`${resultado[melhor] ?? ''} ${item.texto}`);
	}
	return resultado;
}

export function lerTabelaPbev(paginas: ItemPdf[][]): TabelaPbev {
	const todos = paginas.flat();
	const edicao = edicaoDaTabela(paginas[0] ?? []);
	const veiculos = new Map<string, VeiculoPbev>();
	const semConsumo: string[] = [];
	const conflitantes: string[] = [];
	let linhasFlex = 0;
	let duplicadas = 0;
	let paginasComTabela = 0;

	for (const pagina of paginas) {
		const layout = colunasDaPagina(pagina);
		if (!layout) continue;
		paginasComTabela++;
		for (const linha of agruparLinhas(pagina.filter(i => i.y < layout.topoDados))) {
			const c = celulas(linha, layout.colunas);
			if (c.combustivel !== 'F' || !c.marca || !c.modelo) continue;
			linhasFlex++;
			const marca = nomeMarca(c.marca);
			const modelo = limpar(c.modelo);
			const versao = [c.versao, c.motor, c.transmissao]
				.map(v => juntarHifens(v ?? ''))
				.filter(Boolean)
				.join(' ');
			const descricao = `${marca} ${modelo} ${versao}`.trim();
			const ec = consumo(c.etanolCidade);
			const ee = consumo(c.etanolEstrada);
			const gc = consumo(c.gasolinaCidade);
			const ge = consumo(c.gasolinaEstrada);
			if (ec === null || ee === null || gc === null || ge === null || !versao) {
				semConsumo.push(descricao);
				continue;
			}
			const veiculo: VeiculoPbev = {
				marca,
				modelo,
				versao,
				etanol_cidade: ec,
				etanol_estrada: ee,
				gasolina_cidade: gc,
				gasolina_estrada: ge,
				edicao_pbev: edicao,
			};
			const chave = semAcento(`${marca}|${modelo}|${versao}`).toUpperCase();
			const existente = veiculos.get(chave);
			if (!existente) {
				veiculos.set(chave, veiculo);
				continue;
			}
			duplicadas++;
			const mesmoConsumo = (['etanol_cidade', 'etanol_estrada', 'gasolina_cidade', 'gasolina_estrada'] as const).every(k => existente[k] === veiculo[k]);
			if (!mesmoConsumo) conflitantes.push(descricao);
		}
	}

	if (!paginasComTabela) throw new Error('Não encontrei o cabeçalho da tabela (Marca, Modelo, Versão, Motor) no PDF da PBEV.');

	return { edicao, flexDeclarados: flexDeclarados(todos), linhasFlex, veiculos: [...veiculos.values()], semConsumo, duplicadas, conflitantes };
}

export function urlTabelaMaisRecente(html: string, paginaUrl: string): string {
	const candidatos: { ano: number; ordem: number; url: string; download: string }[] = [];
	let ordem = 0;
	for (const match of html.matchAll(/href="([^"]+\.pdf)(\/(?:@@download\/file|view))?"/gi)) {
		const url = new URL(match[1].replace(/&amp;/g, '&'), paginaUrl).toString();
		const arquivo = decodeURIComponent(url.split('/').at(-1) ?? '').toLowerCase();
		if (!arquivo.includes('pbe') || /vehp|ence|eletric|hibrid/.test(arquivo)) continue;
		const ano = arquivo.match(/20\d{2}/);
		if (!ano || candidatos.some(c => c.url === url)) continue;
		candidatos.push({ ano: Number(ano[0]), ordem: ordem++, url, download: match[2] ? `${url}/@@download/file` : url });
	}
	if (!candidatos.length) throw new Error('Nenhum PDF da tabela PBEV encontrado na página do Inmetro.');
	candidatos.sort((a, b) => b.ano - a.ano || a.ordem - b.ordem);
	return candidatos[0].download;
}
