export const UFS = {
	AC: 'Acre',
	AL: 'Alagoas',
	AP: 'Amapá',
	AM: 'Amazonas',
	BA: 'Bahia',
	CE: 'Ceará',
	DF: 'Distrito Federal',
	ES: 'Espírito Santo',
	GO: 'Goiás',
	MA: 'Maranhão',
	MT: 'Mato Grosso',
	MS: 'Mato Grosso do Sul',
	MG: 'Minas Gerais',
	PA: 'Pará',
	PB: 'Paraíba',
	PR: 'Paraná',
	PE: 'Pernambuco',
	PI: 'Piauí',
	RJ: 'Rio de Janeiro',
	RN: 'Rio Grande do Norte',
	RS: 'Rio Grande do Sul',
	RO: 'Rondônia',
	RR: 'Roraima',
	SC: 'Santa Catarina',
	SP: 'São Paulo',
	SE: 'Sergipe',
	TO: 'Tocantins',
} as const;

export type Uf = keyof typeof UFS;

export const SIGLAS_UF = Object.keys(UFS) as Uf[];

export function ehUf(valor: string): valor is Uf {
	return Object.hasOwn(UFS, valor);
}

export function normalizarNome(texto: string): string {
	return texto.normalize('NFD').replace(/\p{M}/gu, '').replace(/[’`´]/g, "'").replace(/\s+/g, ' ').trim().toUpperCase();
}

const UF_POR_NOME = new Map(SIGLAS_UF.map(sigla => [normalizarNome(UFS[sigla]), sigla]));

export function ufPorNome(nome: string): Uf | null {
	return UF_POR_NOME.get(normalizarNome(nome)) ?? null;
}
