import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { montarSeries, type LinhaPrecoSemanal } from '@/lib/historico-precos';
import type { HistoricoPrecosApi, MunicipioApi, Semana } from '@/lib/tipos-api';
import type { Uf } from '@/lib/ufs';

const COLUNAS = 'semana_fim, produto, preco_medio, preco_min, preco_max';

export async function buscarHistoricoPrecos(
	supabase: SupabaseClient,
	uf: Uf,
	municipioChave: string | null,
	quantidade: number
): Promise<HistoricoPrecosApi | null> {
	const { data: importacoes, error: erroSemanas } = await supabase
		.from('importacoes_precos')
		.select('semana_inicio, semana_fim')
		.order('semana_fim', { ascending: false })
		.limit(quantidade);
	if (erroSemanas) throw erroSemanas;
	if (!importacoes.length) return null;
	const semanas: Semana[] = importacoes.map(s => ({ inicio: s.semana_inicio, fim: s.semana_fim }));
	const fins = semanas.map(s => s.fim);

	const [respostaUf, respostaMunicipio] = await Promise.all([
		supabase.from('precos_uf').select(COLUNAS).eq('uf', uf).in('semana_fim', fins),
		municipioChave
			? supabase
					.from('precos_municipio')
					.select(`${COLUNAS}, municipio_nome`)
					.eq('uf', uf)
					.eq('municipio_chave', municipioChave)
					.in('semana_fim', fins)
					.order('semana_fim', { ascending: false })
			: null,
	]);
	if (respostaUf.error) throw respostaUf.error;
	const linhasUf = respostaUf.data;

	let municipio: MunicipioApi | null = null;
	let linhasMunicipio: LinhaPrecoSemanal[] = [];
	if (municipioChave && respostaMunicipio) {
		if (respostaMunicipio.error) throw respostaMunicipio.error;
		const data = respostaMunicipio.data;
		linhasMunicipio = data as LinhaPrecoSemanal[];
		if (data.length) municipio = { chave: municipioChave, nome: data[0].municipio_nome };
	}

	return { uf, municipio, series: montarSeries(semanas, linhasUf as LinhaPrecoSemanal[], linhasMunicipio) };
}
