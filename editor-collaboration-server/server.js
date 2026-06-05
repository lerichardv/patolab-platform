import { Hocuspocus } from '@hocuspocus/server';
import { createServer } from 'node:http';
import crossws from 'crossws/adapters/node';
import express from 'express';
import * as Y from 'yjs';
import { generateJSON, generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import { TiptapTransformer } from '@hocuspocus/transformer';

const webhookUrl = process.env.WEBHOOK_URL || 'http://127.0.0.1:8000/api/collaboration';

// Custom Webhook extension
const customWebhookExtension = {
	async onConnect(data) {
		try {
			console.log(`[webhook:onConnect] Connecting peer for room: ${data.documentName}`);
			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					event: 'onConnect',
					payload: {
						documentName: data.documentName,
						requestParameters: Object.fromEntries(data.requestParameters.entries()),
					}
				})
			});
			if (!response.ok) {
				console.error(`[webhook:onConnect] Laravel returned status ${response.status}`);
				return;
			}
			const resData = await response.json();
			return {
				documentState: resData.document || null,
			};
		} catch (error) {
			console.error(`[webhook:onConnect] Error:`, error);
		}
	},

	async onLoadDocument(data) {
		try {
			console.log(`[webhook:onLoadDocument] Loading document: ${data.documentName}`);
			
			// 1. First, check if we received a saved binary state during onConnect
			const savedStateBase64 = data.context?.documentState;
			if (savedStateBase64) {
				console.log(`[webhook:onLoadDocument] Restoring document from saved binary state`);
				const binaryState = Buffer.from(savedStateBase64, 'base64');
				Y.applyUpdate(data.document, binaryState);
				return;
			}

			// 2. If no binary state exists, fetch the initial HTML/content using the "create" event
			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					event: 'create',
					payload: {
						documentName: data.documentName,
						requestParameters: Object.fromEntries(data.requestParameters.entries()),
					}
				})
			});
			if (!response.ok) {
				console.error(`[webhook:onLoadDocument] Laravel returned status ${response.status}`);
				return;
			}
			const resData = await response.json();
			const htmlContent = resData.content;
			
			if (htmlContent) {
				console.log(`[webhook:onLoadDocument] Seeding document with initial content`);
				if (data.documentName.endsWith('-report_date') || data.documentName.endsWith('-status')) {
					// Seed with plain text
					const ytext = data.document.getText('content');
					ytext.insert(0, htmlContent);
				} else {
					// Parse HTML into ProseMirror JSON using Tiptap
					const docJson = generateJSON(htmlContent, [StarterKit]);
					// Convert ProseMirror JSON to Yjs Ydoc update
					const initialYdoc = TiptapTransformer.toYdoc(docJson, 'content');
					// Merge it into the document
					data.document.merge(initialYdoc);
				}
			} else {
				console.log(`[webhook:onLoadDocument] Document starts empty`);
			}
		} catch (error) {
			console.error(`[webhook:onLoadDocument] Error:`, error);
		}
	},

	async onChange(data) {
		const save = async () => {
			try {
				console.log(`[webhook:onChange] Saving document: ${data.documentName}`);
				
				// 1. Get binary state and encode to base64
				const binaryState = Y.encodeStateAsUpdate(data.document);
				const base64State = Buffer.from(binaryState).toString('base64');

				// 2. Convert Ydoc to ProseMirror JSON, then to HTML (or extract plain text for date/status)
				let htmlContent = '';
				if (data.documentName.endsWith('-report_date') || data.documentName.endsWith('-status')) {
					htmlContent = data.document.getText('content').toString();
				} else {
					try {
						const json = TiptapTransformer.fromYdoc(data.document, 'content');
						if (json) {
							htmlContent = generateHTML(json, [StarterKit]);
						}
					} catch (err) {
						console.warn(`[webhook:onChange] Failed to convert doc to HTML:`, err);
					}
				}

				// 3. Send to Laravel backend
				const response = await fetch(webhookUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						event: 'onChange',
						payload: {
							documentName: data.documentName,
							document: base64State,
							html: htmlContent,
						}
					})
				});
				if (!response.ok) {
					console.error(`[webhook:onChange] Failed to save document. Laravel status: ${response.status}`);
				} else {
					console.log(`[webhook:onChange] Document saved successfully`);
				}
			} catch (error) {
				console.error(`[webhook:onChange] Error:`, error);
			}
		};

		// Debounce saving to prevent spamming database on every keystroke
		const debounceTime = 2000;
		const maxDebounceTime = 10000;
		await data.instance.debouncer.debounce(
			`save-${data.documentName}`,
			save,
			debounceTime,
			maxDebounceTime
		);
	}
};

// 1. Initialize Hocuspocus WITH your Custom Webhook Extension
const hocuspocus = new Hocuspocus({
	extensions: [
		customWebhookExtension,
	],
});

// 2. Setup Express for standard HTTP routes if needed
const app = express();

app.get('/health', (req, res) => {
	res.json({ status: 'ok', service: 'Hocuspocus Express Server' });
});

// 3. Create standard HTTP Server wrapping the Express App
const server = createServer(app);

// 4. Configure crossws to intercept and stream WebSocket traffic to Hocuspocus
const ws = crossws({
	hooks: {
		open(peer) {
			console.log(`[ws:open] Peer connected: ${peer.id}`);
			try {
				// Forward connection metadata to Hocuspocus
				const clientConnection = hocuspocus.handleConnection(
					peer.websocket,
					peer.request,
					// You can seed context objects here if needed
					{}
				);
				// Attach the connection reference to the peer instance wrapper
				peer._hocuspocus = clientConnection;
				console.log(`[ws:open] Hocuspocus handled connection successfully`);
			} catch (err) {
				console.error(`[ws:open] Error in handleConnection:`, err);
			}
		},
		message(peer, message) {
			console.log(`[ws:message] Received message from peer: ${peer.id}`);
			// Forward incoming data buffers to the Yjs merge processor
			peer._hocuspocus?.handleMessage(message.uint8Array());
		},
		close(peer, event) {
			console.log(`[ws:close] Peer closed: ${peer.id}, code: ${event.code}, reason: ${event.reason}`);
			// Inform Hocuspocus that a user left (triggers final webhook saves)
			peer._hocuspocus?.handleClose({
				code: event.code,
				reason: event.reason,
			});
		},
		error(peer, error) {
			console.error(`❌ WebSocket error on peer instance [${peer.id}]:`, error);
		},
	},
});

// 5. Intercept Nginx or Browser protocol upgrade handshakes
server.on('upgrade', (request, socket, head) => {
	console.log(`[upgrade] Upgrade request for URL: ${request.url}`);
	try {
		ws.handleUpgrade(request, socket, head);
		console.log(`[upgrade] ws.handleUpgrade completed`);
	} catch (err) {
		console.error(`[upgrade] Error during ws.handleUpgrade:`, err);
	}
});

// 6. Start the server instance execution pool
const PORT = process.env.PORT || 1234;
server.listen(PORT, '0.0.0.0', () => {
	console.log(`🚀 Express + Hocuspocus v4 backend listening on http://127.0.0.1:${PORT}`);
});