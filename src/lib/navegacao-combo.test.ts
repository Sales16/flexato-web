import { describe, expect, it } from 'vitest';
import { chaveAoNavegar, indiceDaChave, opcaoAoConfirmar } from './navegacao-combo';

const outro = { chave: 'outro', tipo: 'outro' };
const garagem = { chave: 'gar-1', tipo: 'garagem' };
const onix = { chave: 'cat-1', tipo: 'catalogo' };
const prisma = { chave: 'cat-2', tipo: 'catalogo' };

describe('indiceDaChave', () => {
	it('acha a posição atual do item pela chave', () => {
		expect(indiceDaChave([onix, prisma, outro], 'outro')).toBe(2);
	});

	it('devolve -1 sem chave ou quando o item saiu da lista', () => {
		expect(indiceDaChave([onix, outro], null)).toBe(-1);
		expect(indiceDaChave([onix, outro], 'cat-2')).toBe(-1);
	});
});

describe('chaveAoNavegar', () => {
	const opcoes = [garagem, onix, outro];

	it('sem item ativo, desce para o primeiro e sobe para o último', () => {
		expect(chaveAoNavegar(opcoes, null, 1)).toBe('gar-1');
		expect(chaveAoNavegar(opcoes, null, -1)).toBe('outro');
	});

	it('anda a partir da posição atual do item e dá a volta nas pontas', () => {
		expect(chaveAoNavegar(opcoes, 'cat-1', 1)).toBe('outro');
		expect(chaveAoNavegar(opcoes, 'outro', 1)).toBe('gar-1');
		expect(chaveAoNavegar(opcoes, 'gar-1', -1)).toBe('outro');
	});

	it('trata item que saiu da lista como sem item ativo', () => {
		expect(chaveAoNavegar(opcoes, 'cat-9', 1)).toBe('gar-1');
		expect(chaveAoNavegar(opcoes, 'cat-9', -1)).toBe('outro');
	});

	it('devolve null com lista vazia', () => {
		expect(chaveAoNavegar([], null, 1)).toBeNull();
	});
});

describe('opcaoAoConfirmar', () => {
	it('mantém o item destacado mesmo depois que os resultados do catálogo mudam a ordem', () => {
		const antes = [outro];
		const destacado = chaveAoNavegar(antes, null, 1);
		expect(opcaoAoConfirmar([onix, prisma, outro], destacado, 'onix')).toBe(outro);
	});

	it('sem item ativo, escolhe o primeiro quando há termo', () => {
		expect(opcaoAoConfirmar([onix, outro], null, 'onix')).toBe(onix);
	});

	it('sem item ativo, não escolhe "Outro carro" antes de o catálogo responder', () => {
		expect(opcaoAoConfirmar([outro], null, 'onix')).toBeUndefined();
	});

	it('sem item ativo e sem termo, não escolhe nada', () => {
		expect(opcaoAoConfirmar([onix, outro], null, '')).toBeUndefined();
	});

	it('com item ativo que saiu da lista, cai na regra sem item ativo', () => {
		expect(opcaoAoConfirmar([prisma, outro], 'cat-1', 'pri')).toBe(prisma);
	});
});
