import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Coordenadas } from '@/lib/localizacao/coordenadas';
import type { LocalizacaoApi } from '@/lib/tipos-api';
import { ehUf } from '@/lib/ufs';
import { semanaMaisRecente } from './precos';

type LinhaMunicipio = { codigo: number; nome: string; uf: string };

export async function municipioPorPonto(admin: SupabaseClient, { lat, lng }: Coordenadas): Promise<LinhaMunicipio | null> {
	const { data, error } = await admin.rpc('municipio_por_ponto', { lat, lng });
	if (error) throw error;
	const linha = (data as LinhaMunicipio[] | null)?.[0];
	return linha ?? null;
}

export async function chaveAnpDoMunicipio(publico: SupabaseClient, uf: string, ibge: number): Promise<string | null> {
	const semana = await semanaMaisRecente(publico);
	if (!semana) return null;
	const { data, error } = await publico
		.from('precos_municipio')
		.select('municipio_chave')
		.eq('semana_fim', semana.fim)
		.eq('uf', uf)
		.eq('municipio_ibge', ibge)
		.limit(1)
		.maybeSingle();
	if (error) throw error;
	return data?.municipio_chave ?? null;
}

export async function localizar(admin: SupabaseClient, publico: SupabaseClient, coordenadas: Coordenadas): Promise<LocalizacaoApi | null> {
	const municipio = await municipioPorPonto(admin, coordenadas);
	if (!municipio) return null;
	const uf = municipio.uf.trim();
	if (!ehUf(uf)) throw new Error(`UF inesperada na malha municipal: ${municipio.uf}`);
	const chave = await chaveAnpDoMunicipio(publico, uf, municipio.codigo);
	return { uf, municipio: { ibge: municipio.codigo, nome: municipio.nome, chave } };
}
