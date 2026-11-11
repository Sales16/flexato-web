import type { ZodError } from 'zod';

export type CorpoErro = { erro: { codigo: string; mensagem: string; detalhes?: string[] } };

export function erro(status: number, codigo: string, mensagem: string, detalhes?: string[]): Response {
	const corpo: CorpoErro = { erro: { codigo, mensagem, ...(detalhes?.length ? { detalhes } : {}) } };
	return Response.json(corpo, { status });
}

export function erroValidacao(e: ZodError): Response {
	return erro(
		422,
		'dados_invalidos',
		'Os dados enviados são inválidos.',
		e.issues.map(i => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
	);
}

export function erroInterno(e: unknown): Response {
	console.error(e);
	return erro(500, 'erro_interno', 'Não foi possível concluir a operação. Tente novamente.');
}

export async function lerJson(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		return undefined;
	}
}
