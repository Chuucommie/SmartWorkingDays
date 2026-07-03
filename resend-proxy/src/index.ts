/**
 * Cloudflare Worker — Proxy per l'API Resend
 * 
 * Inoltra le richieste di invio email dal browser a Resend,
 * tenendo la API key al sicuro lato server.
 * 
 * Endpoint: POST /send-email
 * Body: { to, subject, html }
 */

export interface Env {
	RESEND_API_KEY: string;
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

			const resendResponse = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${env.RESEND_API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					from: 'SmartWorkingDays <onboarding@resend.dev>',
					to: body.to,
					subject: body.subject,
					html: body.html,
				}),
			});

			const data = await resendResponse.json();

			return new Response(JSON.stringify(data), {
				status: resendResponse.status,
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
