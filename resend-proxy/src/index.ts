/**
 * Cloudflare Worker — Proxy per l'API Brevo (ex Sendinblue)
 * 
 * Inoltra le richieste di invio email dal browser a Brevo,
 * tenendo la API key al sicuro lato server.
 * 
 * Brevo: 300 email/giorno gratis, verifica Gmail come mittente.
 * 
 * Endpoint: POST /send-email
 * Body: { to, subject, html }
 */

export interface Env {
	BREVO_API_KEY: string;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		// Solo POST su /send-email
		const url = new URL(request.url);
		if (request.method !== 'POST' || url.pathname !== '/send-email') {
			return new Response('Not Found', { status: 404 });
		}

		try {
			const body: { to: string; subject: string; html: string } = await request.json();

			if (!body.to || !body.subject || !body.html) {
				return new Response(
					JSON.stringify({ error: 'Campi mancanti: to, subject, html' }),
					{ status: 400, headers: { 'Content-Type': 'application/json' } }
				);
			}

			const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
				method: 'POST',
				headers: {
					'api-key': env.BREVO_API_KEY,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					sender: {
						name: 'EOS Smart Working',
						email: 'salazar.ricardo0509@gmail.com',
					},
					to: [{ email: body.to }],
					subject: body.subject,
					htmlContent: body.html,
				}),
			});

			const data = await brevoResponse.json();

			return new Response(JSON.stringify(data), {
				status: brevoResponse.status,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		} catch (err: any) {
			return new Response(
				JSON.stringify({ error: err.message || 'Errore interno' }),
				{
					status: 500,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				}
			);
		}
	},
};
