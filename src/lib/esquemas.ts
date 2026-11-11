import { z } from 'zod';

const kmPorLitro = z.number().positive('deve ser maior que zero').max(99.9, 'deve ser menor que 100');
const kmPorLitroOpcional = z.number().positive('deve ser maior que zero').max(99.9, 'deve ser menor que 100').nullable().optional();

export const consumoSchema = z.object({
	etanol: z.object({ cidade: kmPorLitro, estrada: kmPorLitro }),
	gasolina: z.object({ cidade: kmPorLitro, estrada: kmPorLitro }),
});

export const carroCriarSchema = z.object({
	nome: z.string().trim().min(1, 'informe um nome').max(60, 'use até 60 caracteres'),
	catalogoId: z.number().int().positive().nullable().optional(),
	consumo: consumoSchema,
});

export const carroAlterarSchema = z
	.object({
		nome: z.string().trim().min(1, 'informe um nome').max(60, 'use até 60 caracteres').optional(),
		consumo: consumoSchema.optional(),
	})
	.refine(v => v.nome !== undefined || v.consumo !== undefined, 'envie nome ou consumo');

export const calculoSchema = z.object({
	consumo: z.object({
		etanol: z.object({ cidade: kmPorLitroOpcional, estrada: kmPorLitroOpcional }),
		gasolina: z.object({ cidade: kmPorLitroOpcional, estrada: kmPorLitroOpcional }),
	}),
	precos: z.object({
		etanol: z.number().positive('deve ser maior que zero').max(50),
		gasolina: z.number().positive('deve ser maior que zero').max(50),
	}),
	percentualCidade: z.number().min(0).max(100),
	tanqueLitros: z.number().positive().max(500).nullable().optional(),
	kmPorMes: z.number().positive().max(100000).nullable().optional(),
});

export type CarroCriar = z.infer<typeof carroCriarSchema>;
export type CarroAlterar = z.infer<typeof carroAlterarSchema>;

export const abastecimentoCriarSchema = z.object({
	data: z.iso.date('use o formato AAAA-MM-DD'),
	combustivel: z.enum(['etanol', 'gasolina'], 'use etanol ou gasolina'),
	litros: z.number().positive('deve ser maior que zero').max(999.99, 'deve ser menor que 1000'),
	hodometroKm: z.number().int('use um número inteiro de km').min(0, 'não pode ser negativo').max(9999999, 'deve ser menor que 10.000.000'),
	precoLitro: z.number().positive('deve ser maior que zero').max(99.999, 'deve ser menor que 100').nullable().optional(),
	tanqueCheio: z.boolean('informe se encheu o tanque'),
	trecho: z.enum(['cidade', 'estrada', 'misto'], 'use cidade, estrada ou misto').nullable().optional(),
});

export type AbastecimentoCriar = z.infer<typeof abastecimentoCriarSchema>;
