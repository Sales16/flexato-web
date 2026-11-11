import { calcular, validarEntrada } from '@/lib/calculo';
import { erro, erroValidacao, lerJson } from '@/lib/api/respostas';
import { calculoSchema } from '@/lib/esquemas';

const ouNaN = (v: number | null | undefined) => v ?? Number.NaN;

export async function POST(request: Request) {
	const entrada = calculoSchema.safeParse(await lerJson(request));
	if (!entrada.success) return erroValidacao(entrada.error);
	const { consumo, ...resto } = entrada.data;
	const dados = {
		...resto,
		consumo: {
			etanol: { cidade: ouNaN(consumo.etanol.cidade), estrada: ouNaN(consumo.etanol.estrada) },
			gasolina: { cidade: ouNaN(consumo.gasolina.cidade), estrada: ouNaN(consumo.gasolina.estrada) },
		},
	};
	const erros = validarEntrada(dados);
	if (erros.length) return erro(422, 'dados_invalidos', 'Os dados enviados são inválidos.', erros);
	return Response.json(calcular(dados));
}
