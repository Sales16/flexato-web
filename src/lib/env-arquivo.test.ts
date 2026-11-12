import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { carregarEnvOpcional } from './env-arquivo';

describe('carregarEnvOpcional', () => {
	const pasta = mkdtempSync(join(tmpdir(), 'flexato-env-'));
	afterAll(() => rmSync(pasta, { recursive: true, force: true }));

	it('carrega as variáveis quando o arquivo existe', () => {
		const arquivo = join(pasta, '.env.teste');
		writeFileSync(arquivo, 'FLEXATO_TESTE_ENV_ARQUIVO=ok\n');
		carregarEnvOpcional(arquivo);
		expect(process.env.FLEXATO_TESTE_ENV_ARQUIVO).toBe('ok');
		delete process.env.FLEXATO_TESTE_ENV_ARQUIVO;
	});

	it('segue em frente quando o arquivo não existe', () => {
		expect(() => carregarEnvOpcional(join(pasta, 'nao-existe'))).not.toThrow();
	});

	it('repassa outros erros de leitura em vez de engolir', () => {
		expect(() => carregarEnvOpcional(pasta)).toThrow();
	});
});
