/* global process, Buffer */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { Hocuspocus } from '@hocuspocus/server';
import { TiptapTransformer } from '@hocuspocus/transformer';
import { mergeAttributes } from '@tiptap/core';
import Highlight from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { generateJSON, generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import cors from 'cors';
import crossws from 'crossws/adapters/node';
import express from 'express';
import multer from 'multer';
import * as Y from 'yjs';

const CustomImage = Image.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			alignment: {
				default: 'center',
				parseHTML: element => {
					const align = element.getAttribute('data-align');

					if (align) {
						return align;
					}

					const classes = element.getAttribute('class') || '';

					if (classes.includes('align-left')) {
						return 'left';
					}

					if (classes.includes('align-center')) {
						return 'center';
					}

					if (classes.includes('align-right')) {
						return 'right';
					}

					if (classes.includes('align-justify')) {
						return 'justify';
					}

					const style = element.getAttribute('style') || '';

					if (style.includes('margin-left: 0') || style.includes('margin-right: auto')) {
						return 'left';
					}

					if (style.includes('margin-left: auto') && style.includes('margin-right: auto')) {
						return 'center';
					}

					if (style.includes('margin-left: auto') && style.includes('margin-right: 0')) {
						return 'right';
					}

					return 'center';
				},
				renderHTML: attributes => {
					const isLeft = attributes.alignment === 'left';
					const isRight = attributes.alignment === 'right';
					const marginLeft = isLeft ? '0' : 'auto';
					const marginRight = isRight ? '0' : 'auto';

					return {
						'data-align': attributes.alignment,
						class: `align-${attributes.alignment}`,
						style: `display: block; margin-left: ${marginLeft}; margin-right: ${marginRight};`
					};
				},
			},
			width: {
				default: null,
				parseHTML: element => {
					const width = element.getAttribute('width') || element.style.width;

					return width ? parseInt(width, 10) : null;
				},
			},
			height: {
				default: null,
				parseHTML: element => {
					const height = element.getAttribute('height') || element.style.height;

					return height ? parseInt(height, 10) : null;
				},
			},
		};
	},

	renderHTML({ HTMLAttributes }) {
		const isLeft = HTMLAttributes.alignment === 'left';
		const isRight = HTMLAttributes.alignment === 'right';
		const marginLeft = isLeft ? '0' : 'auto';
		const marginRight = isRight ? '0' : 'auto';

		const styles = [`display: block`, `margin-left: ${marginLeft}`, `margin-right: ${marginRight}`];

		if (HTMLAttributes.width) {
			styles.push(`width: ${HTMLAttributes.width}px`);
		}

		if (HTMLAttributes.height) {
			styles.push(`height: ${HTMLAttributes.height}px`);
		}

		return [
			'img',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				'data-align': HTMLAttributes.alignment || 'center',
				class: `align-${HTMLAttributes.alignment || 'center'}`,
				style: styles.join('; ') + ';'
			})
		];
	},
});

const extensions = [
	StarterKit.configure({ undoRedo: false }),
	CustomImage.configure({
		allowBase64: false,
		resize: {
			enabled: true,
			alwaysPreserveAspectRatio: true,
		},
	}),
	TableKit.configure({
		table: { resizable: true },
	}),
	TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }),
	Highlight.configure({ multicolor: true }),
];

const webhookUrl = process.env.WEBHOOK_URL || 'http://127.0.0.1:8000/api/collaboration';

const pendingSaves = new Map();

const updateSaveStatus = (instance, reportId, status) => {
	const docName = `report-${reportId}-save-status`;
	const doc = instance.documents.get(docName);

	if (doc) {
		const ytext = doc.getText('content');
		doc.transact(() => {
			ytext.delete(0, ytext.length);
			ytext.insert(0, status);
		});
	}
};

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
			let isLoaded = false;

			if (savedStateBase64) {
				console.log(`[webhook:onLoadDocument] Restoring document from saved binary state`);
				const binaryState = Buffer.from(savedStateBase64, 'base64');
				Y.applyUpdate(data.document, binaryState);

				if (data.documentName.endsWith('-report_date') || data.documentName.endsWith('-status') || data.documentName.endsWith('-save-status')) {
					const text = data.document.getText('content').toString();

					if (text && text.trim() !== '') {
						isLoaded = true;
					}
				} else {
					isLoaded = true;
				}
			}

			if (!isLoaded) {

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

					if (data.documentName.endsWith('-report_date') || data.documentName.endsWith('-status') || data.documentName.endsWith('-save-status')) {
						// Seed with plain text
						const ytext = data.document.getText('content');
						ytext.insert(0, htmlContent);
					} else {
						// Parse HTML into ProseMirror JSON using Tiptap
						const docJson = generateJSON(htmlContent, extensions);
						// Convert ProseMirror JSON to Yjs Ydoc update
						const initialYdoc = TiptapTransformer.toYdoc(docJson, 'content', extensions);
						// Merge it into the document
						data.document.merge(initialYdoc);
					}
				} else {
					console.log(`[webhook:onLoadDocument] Document starts empty`);
				}
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

				if (data.documentName.endsWith('-report_date') || data.documentName.endsWith('-status') || data.documentName.endsWith('-save-status')) {
					htmlContent = data.document.getText('content').toString();
				} else {
					try {
						const xmlFragment = data.document.getXmlFragment('content');
						console.log(`[webhook:onChange] xmlFragment content types:`, xmlFragment.toArray().map(item => item?.constructor?.name || typeof item));
						const json = TiptapTransformer.fromYdoc(data.document, 'content');

						if (json) {
							htmlContent = generateHTML(json, extensions);
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

		// Extract report ID to check if it's one of the report editors or the date
		const match = data.documentName.match(/^report-(\d+)-(macroscopy|microscopy|diagnosis|report_date)$/);

		if (match) {
			const reportId = match[1];

			if (!pendingSaves.has(reportId)) {
				pendingSaves.set(reportId, {
					timeout: null,
					documents: new Map()
				});
			}

			const entry = pendingSaves.get(reportId);
			entry.documents.set(data.documentName, save);

			if (entry.timeout) {
				clearTimeout(entry.timeout);
			}

			entry.timeout = setTimeout(async () => {
				let docsToSave;

				try {
					if (pendingSaves.has(reportId)) {
						const currentEntry = pendingSaves.get(reportId);

						if (currentEntry) {
							docsToSave = new Map(currentEntry.documents);
							currentEntry.documents.clear();
						}
					}
				} catch (err) {
					console.error(`[pendingSaves] Error preparing documents to save for report ${reportId}:`, err);
				} finally {
					pendingSaves.delete(reportId);
				}

				if (!docsToSave || docsToSave.size === 0) {
					return;
				}

				updateSaveStatus(data.instance, reportId, 'saving');

				let hasError = false;

				for (const [docName, saveFn] of docsToSave.entries()) {
					try {
						await saveFn();
					} catch (err) {
						console.error(`Error executing deferred save for ${docName}:`, err);
						hasError = true;
					}
				}

				try {
					if (hasError) {
						updateSaveStatus(data.instance, reportId, 'idle');
					} else {
						updateSaveStatus(data.instance, reportId, 'saved');
						setTimeout(() => {
							try {
								updateSaveStatus(data.instance, reportId, 'idle');
							} catch (err) {
								console.error(`Error resetting save status for report ${reportId}:`, err);
							}
						}, 1300);
					}
				} catch (err) {
					console.error(`Error updating save status for report ${reportId}:`, err);
				}
			}, 1000);
		} else {
			// For non-report editors or date (like status/save-status), use standard debouncer (1s)
			const debounceTime = 1000;
			const maxDebounceTime = 10000;
			await data.instance.debouncer.debounce(
				`save-${data.documentName}`,
				save,
				debounceTime,
				maxDebounceTime
			);
		}
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

app.use(cors());

// Configure short-term upload folder in os temp dir
const uploadDir = path.join(os.tmpdir(), 'whisper-chunks');

if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

app.post('/api/dictate-chunk', upload.single('audio'), async (req, res) => {
	if (!req.file) {
		return res.status(400).json({ error: 'No se recibió ningún archivo de audio.' });
	}

	const inputPath = req.file.path;

	try {
		console.log('[Grok Dictate] Sending audio file to Grok STT API:', inputPath);

		const fileBuffer = fs.readFileSync(inputPath);
		const fileBlob = new Blob([fileBuffer]);

		const formData = new FormData();
		formData.append("format", "true");
		formData.append("language", "es");
		formData.append("keyterm", "biopsia, macroscopía, microscopía, diagnóstico");
		formData.append("file", fileBlob, req.file.originalname || "audio.webm");

		const response = await fetch("https://api.x.ai/v1/stt", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${process.env.GROK_API_KEY}`,
			},
			body: formData,
		});

		if (!response.ok) {
			const errText = await response.text();

			throw new Error(`STT error ${response.status}: ${errText}`);
		}

		const result = await response.json();
		const cleanText = (result.text || '').trim();

		console.log('[Grok Dictate] Transcribed text:', cleanText);

		// Clean up files
		fs.unlink(inputPath, () => {});

		return res.json({ success: true, text: cleanText });
	} catch (error) {
		console.error('Error en Grok Dictado:', error);
		// Clean up files
		fs.unlink(inputPath, () => {});

		return res.status(500).json({
			error: 'Error procesando la transcripción de audio.',
			details: error.message
		});
	}
});

app.post('/api/fix-grammar', express.json(), async (req, res) => {
	const { text, reportId, docName } = req.body;

	if (!text || text.trim() === '') {
		return res.status(400).json({ error: 'No se proporcionó texto para corregir.' });
	}

	if (text.length > 3000) {
		return res.status(400).json({ error: 'El texto no debe superar los 3000 caracteres.' });
	}

	try {
		console.log('[Grok Grammar] Sending request to Grok API...');

		const response = await fetch("https://api.x.ai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.GROK_API_KEY}`,
			},
			body: JSON.stringify({
				model: "grok-4.3",
				messages: [
					{
						role: "system",
						content: "Eres un corrector gramatical experto en informes médicos y patológicos. Corrige la ortografía, puntuación y coherencia técnica en español. Mantén estrictamente el vocabulario médico original y la estructura de párrafos y saltos de línea del texto original. Devuelve ÚNICAMENTE el texto completamente corregido, manteniendo los mismos saltos de línea y párrafos. No agregues introducciones, no expliques los cambios, no uses viñetas ni bloques de código. Tu respuesta debe ser exclusivamente el texto corregido."
					},
					{ role: "user", content: text }
				],
				temperature: 0.1
			})
		});

		if (!response.ok) {
			const errText = await response.text();

			throw new Error(`Grok grammar correction error ${response.status}: ${errText}`);
		}

		const resData = await response.json();
		const correctedText = resData.choices[0].message.content.trim();

		console.log('[Grok Grammar] Corrected text successfully.');

		if (reportId && docName) {
			const targetRoom = `report-${reportId}-${docName}`;

			try {
				const activeDoc = hocuspocus.documents.get(targetRoom);

				if (activeDoc && correctedText.length > 0) {
					activeDoc.transact(() => {
						const ytext = activeDoc.getText('content');
						ytext.delete(0, ytext.length);
						ytext.insert(0, correctedText);
					});

					return res.json({ success: true, text: correctedText, injected: true });
				}
			} catch (err) {
				console.error(`[Grok Grammar] Error updating Yjs document:`, err);
			}
		}

		return res.json({ success: true, text: correctedText, injected: false });
	} catch (error) {
		console.error('Error en Grok Corrector:', error);

		return res.status(500).json({ error: 'Error en el servidor de optimización de texto', details: error.message });
	}
});

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