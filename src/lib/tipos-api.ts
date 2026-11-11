import type { Combustivel, Consumo } from '@/lib/calculo';
import type { ConsumoReal, Trecho } from '@/lib/consumo-real';
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

export type AbastecimentoApi = {
	id: string;
	carroId: string;
	data: string;
	combustivel: Combustivel;
	litros: number;
	hodometroKm: number;
	precoLitro: number | null;
	tanqueCheio: boolean;
	trecho: Trecho | null;
	criadoEm: string;
};

export type AbastecimentosApi = {
	itens: AbastecimentoApi[];
	consumoReal: ConsumoReal;
};

export type PontoHistoricoApi = {
	semana: Semana;
	precoMedio: number;
	precoMin: number | null;
	precoMax: number | null;
	fonte: FontePreco;
};

export type HistoricoPrecosApi = {
	uf: Uf;
	municipio: MunicipioApi | null;
	series: Record<Combustivel, PontoHistoricoApi[]>;
};
