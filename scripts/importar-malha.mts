import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import {
	emLotes,
	ehQualidadeMalha,
	montarMunicipios,
	urlMalhaMunicipal,
	URL_MUNICIPIOS_IBGE,
	type ColecaoMalha,
	type MunicipioLocalidade,
} from '../src/lib/localizacao/malha.ts';

const TAMANHO_LOTE = 100;
const CABECALHOS = { 'User-Agent': 'Mozilla/5.0 (compatible; Flexato/1.0)' };

async function baixar(url: string): Promise<{ texto: string; bytes: number }> {
	const resposta = await fetch(url, { headers: CABECALHOS });
	if (!resposta.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${resposta.status}`);
	const buffer = Buffer.from(await resposta.arrayBuffer());
	return { texto: buffer.toString('utf8'), bytes: buffer.length };
}

function megabytes(bytes: number): string {
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function principal() {
	const { values } = parseArgs({
		options: {
			qualidade: { type: 'string', default: 'intermediaria' },
			simular: { type: 'boolean', default: false },
		},
	});
	if (!ehQualidadeMalha(values.qualidade)) throw new Error('Use --qualidade=minima, intermediaria ou maxima.');

	const urlMalha = urlMalhaMunicipal(values.qualidade);
	console.log(`Baixando malha municipal (${values.qualidade}): ${urlMalha}`);
	const malha = await baixar(urlMalha);
	console.log(`Malha baixada: ${megabytes(malha.bytes)}`);
	const localidades = await baixar(URL_MUNICIPIOS_IBGE);

	const { municipios, semNome, semGeometria, invalidos } = montarMunicipios(
		JSON.parse(malha.texto) as ColecaoMalha,
		JSON.parse(localidades.texto) as MunicipioLocalidade[]
	);
	console.log(`Municípios com geometria e nome: ${municipios.length}`);
	if (semNome.length) console.warn(`Na malha, mas fora da lista de localidades (ignorados): ${semNome.join(', ')}`);
	if (semGeometria.length) console.warn(`Na lista de localidades, mas sem geometria: ${semGeometria.join(', ')}`);
	if (invalidos.length) console.warn(`Feições inválidas ignoradas: ${invalidos.join(', ')}`);
	if (!municipios.length) throw new Error('Nenhum município para importar.');

	if (values.simular) {
		console.log('Simulação: nada foi gravado no banco.');
		return;
	}

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const chave = process.env.SUPABASE_SECRET_KEY;
	if (!url || !chave) throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local.');
	const supabase = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

	const lotes = emLotes(municipios, TAMANHO_LOTE);
	let gravados = 0;
	for (const [indice, lote] of lotes.entries()) {
		const { data, error } = await supabase.rpc('importar_municipios_ibge', { itens: lote });
		if (error) throw new Error(`Falha no lote ${indice + 1} de ${lotes.length}: ${error.message}`);
		gravados += Number(data);
		console.log(`Lote ${indice + 1}/${lotes.length}: ${gravados} municípios gravados`);
	}
	console.log(`Concluído: ${gravados} municípios na tabela municipios_ibge.`);
}

principal().catch(e => {
	console.error(e instanceof Error ? e.message : e);
	process.exit(1);
});
