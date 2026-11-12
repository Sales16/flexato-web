import type { NextConfig } from 'next';
import { jobPrecosAnpHabilitado, loginAppleHabilitado, loginGoogleHabilitado } from './src/lib/env.ts';

loginGoogleHabilitado();
loginAppleHabilitado();
jobPrecosAnpHabilitado();

const desenvolvimento = process.env.NODE_ENV === 'development';

function origemSupabase(): string {
	const valor = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
	const url = URL.canParse(valor) ? new URL(valor) : null;
	if (url?.protocol === 'https:' || url?.protocol === 'http:') return url.origin;
	if (process.env.VERCEL_ENV === 'production') throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente ou inválida: a CSP bloquearia as chamadas ao Supabase.');
	return '';
}

const politicaConteudo = [
	"default-src 'self'",
	`script-src 'self' 'unsafe-inline'${desenvolvimento ? " 'unsafe-eval'" : ''}`,
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' blob: data:",
	"font-src 'self'",
	`connect-src 'self' ${origemSupabase()}`.trim(),
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'",
].join('; ');

const cabecalhosSeguranca = [
	{ key: 'Content-Security-Policy', value: politicaConteudo },
	{ key: 'Strict-Transport-Security', value: 'max-age=63072000' },
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'X-Frame-Options', value: 'DENY' },
	{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
	{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)' },
];

const nextConfig: NextConfig = {
	/* config options here */
	cacheComponents: true,
	partialPrefetching: true,
	poweredByHeader: false,
	turbopack: {
		rules: {
			'*.css': {
				loaders: ['@tailwindcss/turbopack'],
				as: '*.css',
			},
		},
	},
	async headers() {
		return [{ source: '/:path*', headers: cabecalhosSeguranca }];
	},
};

export default nextConfig;
