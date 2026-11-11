export type Chamada = { metodo: string; args: unknown[] };

export type Consulta = {
	tabela: string;
	chamadas: Chamada[];
	usou: (metodo: string) => Chamada | undefined;
};

export type RespostaFalsa = { data: unknown; error: unknown };

export type Resolvedor = (consulta: Consulta) => RespostaFalsa;

function construtor(consulta: Consulta, resolver: Resolvedor): unknown {
	const proxy: unknown = new Proxy(
		{},
		{
			get(_, prop) {
				if (prop === 'then') {
					return (ok: (v: RespostaFalsa) => unknown, falha: (e: unknown) => unknown) =>
						Promise.resolve()
							.then(() => resolver(consulta))
							.then(ok, falha);
				}
				return (...args: unknown[]) => {
					consulta.chamadas.push({ metodo: String(prop), args });
					return proxy;
				};
			},
		}
	);
	return proxy;
}

export function criarSupabaseFalso(resolver: Resolvedor, usuarioId: string | null = 'usuario-1') {
	const consultas: Consulta[] = [];
	const cliente = {
		auth: {
			getUser: async () =>
				usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: new Error('token inválido') },
		},
		from(tabela: string) {
			const consulta: Consulta = { tabela, chamadas: [], usou: metodo => consulta.chamadas.find(c => c.metodo === metodo) };
			consultas.push(consulta);
			return construtor(consulta, resolver);
		},
	};
	return { cliente, consultas };
}
