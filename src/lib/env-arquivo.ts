export function carregarEnvOpcional(caminho: string): void {
	try {
		process.loadEnvFile(caminho);
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
	}
}
