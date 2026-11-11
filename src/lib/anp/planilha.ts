import ExcelJS from 'exceljs';
import type { Celula } from './parser';

function valorCelula(valor: ExcelJS.CellValue): Celula {
	if (valor === null || valor === undefined) return null;
	if (typeof valor === 'string' || typeof valor === 'number' || valor instanceof Date) return valor;
	if (typeof valor === 'boolean') return String(valor);
	if ('result' in valor) return valorCelula(valor.result as ExcelJS.CellValue);
	if ('richText' in valor) return valor.richText.map(parte => parte.text).join('');
	if ('text' in valor) return String(valor.text);
	return null;
}

export async function lerAbas(arquivo: ArrayBuffer, nomes: string[]): Promise<Record<string, Celula[][]>> {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(arquivo);
	const abas: Record<string, Celula[][]> = {};
	for (const nome of nomes) {
		const aba = workbook.getWorksheet(nome);
		if (!aba) throw new Error(`Aba ${nome} não encontrada na planilha da ANP.`);
		const linhas: Celula[][] = [];
		aba.eachRow({ includeEmpty: true }, (linha, numero) => {
			const valores = Array.isArray(linha.values) ? linha.values.slice(1) : [];
			linhas[numero - 1] = valores.map(v => valorCelula(v as ExcelJS.CellValue));
		});
		abas[nome] = Array.from(linhas, l => l ?? []);
	}
	return abas;
}
