import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { carregarEnvOpcional } from '@/lib/env-arquivo';
import { gravarCatalogoPbev, lerPbev, urlPbevMaisRecente, type OrigemPbev } from '@/lib/pbev/importar';
import { contagemDivergente } from '@/lib/pbev/parser';
import { clienteAdmin } from '@/lib/supabase/servidor';

function argumento(nome: string): string | undefined {
	const prefixo = `--${nome}=`;
	return process.argv.find(a => a.startsWith(prefixo))?.slice(prefixo.length);
}

async function main() {
	carregarEnvOpcional('.env.local');

	const simular = process.argv.includes('--simular');
	const caminho = argumento('arquivo');
	let origem: OrigemPbev;
	if (caminho) origem = { arquivo: new Uint8Array(await readFile(caminho)), nome: basename(caminho) };
	else origem = { url: argumento('url') ?? (await urlPbevMaisRecente()) };

	console.log(`Lendo ${'url' in origem ? origem.url : origem.nome}…`);
	const { tabela } = await lerPbev(origem);

	console.log(`Edição: ${tabela.edicao}`);
	console.log(`Linhas flex no PDF: ${tabela.linhasFlex}${tabela.flexDeclarados !== null ? ` (o resumo do PDF declara ${tabela.flexDeclarados})` : ''}`);
	console.log(`Versões flex com os 4 consumos: ${tabela.veiculos.length}`);
	console.log(`Duplicadas ignoradas: ${tabela.duplicadas}`);
	if (tabela.semConsumo.length) console.log(`Sem consumo nos dois combustíveis (ignoradas): ${tabela.semConsumo.join('; ')}`);
	if (tabela.conflitantes.length) console.log(`Duplicadas com consumo diferente (mantida a primeira): ${tabela.conflitantes.join('; ')}`);
	const divergente = contagemDivergente(tabela);
	if (divergente) console.warn('Atenção: a contagem de linhas flex difere do resumo do PDF. Confira o layout antes de importar.');

	if (simular) {
		console.table(tabela.veiculos.slice(0, 10));
		console.log('Simulação: nada foi gravado.');
		return;
	}

	if (divergente && !process.argv.includes('--forcar'))
		throw new Error('Importação cancelada: nada foi gravado. Confira o PDF e rode de novo com --forcar para gravar mesmo assim.');

	const resultado = await gravarCatalogoPbev(clienteAdmin(), tabela);
	console.log(`Gravadas ${resultado.gravados} versões com fonte 'inmetro'. Removidas ${resultado.exemplosRemovidos} linhas de exemplo.`);
}

main().catch(e => {
	console.error(e instanceof Error ? e.message : e);
	process.exitCode = 1;
});
