import type { Combustivel, Consumo } from '@/lib/calculo';
import type { Uf } from '@/lib/ufs';

export type Semana = { inicio: string; fim: string };

export type MunicipioApi = { chave: string; nome: string };

export type LocaisApi = {
	semana: Semana | null;
	ufs: { sigla: Uf; nome: string; municipios: MunicipioApi[] }[];
};

export type FontePreco = 'municipio' | 'uf';

export type PrecoCombustivelApi = {
	precoMedio: number;
	precoMin: number | null;
	precoMax: number | null;
	fonte: FontePreco;
};

export type PrecosApi = {
	semana: Semana;
	uf: Uf;
	municipio: MunicipioApi | null;
	precos: Partial<Record<Combustivel, PrecoCombustivelApi>>;
};

export type FonteCatalogo = 'inmetro' | 'exemplo';

export type VeiculoCatalogoApi = {
	id: number;
	marca: string;
	modelo: string;
	versao: string;
	fonte: FonteCatalogo;
	edicaoPbev: string | null;
	consumo: Consumo;
};

export type CarroApi = {
	id: string;
	nome: string;
	catalogoId: number | null;
	consumo: Consumo;
	criadoEm: string;
	atualizadoEm: string;
};

export type MunicipioLocalizadoApi = { ibge: number; nome: string; chave: string | null };

export type LocalizacaoApi = { uf: Uf; semana: Semana | null; municipio: MunicipioLocalizadoApi };
