import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { ItemPdf } from './parser';

export async function lerItensPdf(dados: Uint8Array): Promise<ItemPdf[][]> {
	const tarefa = getDocument({ data: dados, verbosity: 0 });
	try {
		const documento = await tarefa.promise;
		const paginas: ItemPdf[][] = [];
		for (let numero = 1; numero <= documento.numPages; numero++) {
			const pagina = await documento.getPage(numero);
			const conteudo = await pagina.getTextContent();
			paginas.push(
				conteudo.items
					.filter((item): item is TextItem => 'str' in item && item.str.trim() !== '')
					.map(item => ({ texto: item.str, x: item.transform[4], y: item.transform[5], largura: item.width }))
			);
			pagina.cleanup();
		}
		return paginas;
	} finally {
		await tarefa.destroy();
	}
}
