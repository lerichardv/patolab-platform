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

// Environment variable configuration for paths
const WHISPER_DIR = process.env.WHISPER_PATH || '/opt/homebrew/var/www/whisper.cpp';
const WHISPER_MODEL = path.join(WHISPER_DIR, 'models/ggml-medium.bin');
const WHISPER_EXECUTABLE = path.join(WHISPER_DIR, 'build/bin/whisper-cli');

const LLAMA_DIR = process.env.LLAMA_PATH || '/opt/homebrew/var/www/llama.cpp';
const LLAMA_MODEL = path.join(LLAMA_DIR, 'models/Llama-3.2-3B-Instruct-Q4_K_M.gguf');
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LLAMA_EXECUTABLE = path.join(LLAMA_DIR, 'build/bin/llama-cli');

app.post('/api/dictate-chunk', upload.single('audio'), (req, res) => {
	if (!req.file) {
		return res.status(400).json({ error: 'Missing audio payload slice' });
	}

	const { reportId, docName } = req.body;
	const inputPath = req.file.path;
	const outputPath = `${inputPath}.wav`;

	let ffmpegProcess = null;
	let whisperProcess = null;
	let responseSent = false;

	const cleanupFiles = () => {
		fs.unlink(inputPath, () => { });
		fs.unlink(outputPath, () => { });
	};

	const terminateProcesses = () => {
		if (ffmpegProcess && ffmpegProcess.exitCode === null) {
			console.log('[Dictate] Killing running ffmpeg process due to abort/error');
			ffmpegProcess.kill('SIGKILL');
		}

		if (whisperProcess && whisperProcess.exitCode === null) {
			console.log('[Dictate] Killing running whisper process due to abort/error');
			whisperProcess.kill('SIGKILL');
		}
	};

	// Listen to client disconnect
	req.on('close', () => {
		if (!responseSent) {
			console.log('[Dictate] Client connection closed prematurely. Terminating processes.');
			responseSent = true;
			terminateProcesses();
			cleanupFiles();
		}
	});

	// 1. Convert incoming browser Opus stream to uncompressed 16kHz PCM WAV format using spawn
	ffmpegProcess = spawn('ffmpeg', [
		'-y',
		'-i', inputPath,
		'-c:a', 'pcm_s16le',
		'-ar', '16000',
		'-ac', '1',
		outputPath
	], {
		stdio: ['ignore', 'ignore', 'pipe'] // Pipe stderr to catch errors, ignore stdout
	});

	let ffmpegStderr = '';
	ffmpegProcess.stderr.on('data', (chunk) => {
		if (ffmpegStderr.length < 50000) {
			ffmpegStderr += chunk.toString();
		}
	});

	ffmpegProcess.on('error', (err) => {
		console.error('[Dictate] ffmpeg spawn error:', err);

		if (!responseSent) {
			responseSent = true;
			terminateProcesses();
			cleanupFiles();
			res.status(500).json({ error: 'Failed to start audio conversion' });
		}
	});

	ffmpegProcess.on('close', (code) => {
		ffmpegProcess = null;

		if (responseSent) {
			cleanupFiles();

			return;
		}

		if (code !== 0) {
			console.error('[FFmpeg Error]: Exit code', code, ffmpegStderr);
			responseSent = true;
			cleanupFiles();

			return res.status(500).json({ error: 'Audio upscaling process failed' });
		}

		// 2. Execute whisper-cli to extract text tokens instantly
		whisperProcess = spawn(WHISPER_EXECUTABLE, [
			'-m', WHISPER_MODEL,
			'-f', outputPath,
			'-nt',
			'-t', '2',   // Allocates 1 CPU thread
			'-l', 'es'   // Hard-locks Spanish to speed up language detection execution
		], {
			stdio: ['ignore', 'pipe', 'ignore'] // stdout needed for text, stderr ignored
		});

		let textResult = '';
		whisperProcess.stdout.on('data', (data) => {
			if (!responseSent) {
				textResult += data.toString();
			}
		});

		whisperProcess.on('error', (err) => {
			console.error('[Dictate] Whisper spawn error:', err);

			if (!responseSent) {
				responseSent = true;
				terminateProcesses();
				cleanupFiles();
				res.status(500).json({ error: 'Failed to start Whisper process' });
			}
		});

		whisperProcess.on('close', (whisperCode) => {
			whisperProcess = null;

			if (responseSent) {
				cleanupFiles();

				return;
			}

			responseSent = true;
			cleanupFiles();

			if (whisperCode !== 0) {
				console.error(`[Whisper Error] Process exited with code ${whisperCode}`);

				return res.status(500).json({ error: 'Whisper binary failure execution' });
			}

			// Strip bracketed/parenthesized tags like [MÚSICA], (risas), [BLANK_AUDIO]
			const cleanText = textResult
				.replace(/\[[^\]]*\]/g, '')
				.replace(/\([^)]*\)/g, '')
				.replace(/\s+/g, ' ')
				.trim();

			// 3. Hallucination Guard: Stop empty loops from writing junk artifacts when user remains quiet
			const lowerText = cleanText.toLowerCase();
			const isHallucination = cleanText.length <= 1 ||
				lowerText.includes('subtítulos') ||
				lowerText.includes('subtítulo') ||
				lowerText.includes('gracias por') ||
				lowerText.includes('suscríbete') ||
				lowerText.includes('suscribete') ||
				lowerText.includes('suscribirse') ||
				lowerText.includes('canal') ||
				lowerText.includes('subscribe');

			if (!isHallucination) {
				// Matches the dynamic document string schema: report-15-microscopy
				const targetRoom = `report-${reportId}-${docName}`;

				// 4. Access the active Hocuspocus shared room document pool
				const activeDoc = hocuspocus.documents.get(targetRoom);

				if (activeDoc) {
					activeDoc.transact(() => {
						const xmlFragment = activeDoc.getXmlFragment('content');
						let inserted = false;

						if (xmlFragment.length > 0) {
							const lastChild = xmlFragment.get(xmlFragment.length - 1);

							if (lastChild instanceof Y.XmlElement && lastChild.nodeName === 'paragraph') {
								let textNode = null;

								for (let i = lastChild.length - 1; i >= 0; i--) {
									const c = lastChild.get(i);

									if (c instanceof Y.XmlText) {
										textNode = c;
										break;
									}
								}

								if (textNode) {
									const oldLength = textNode.length;
									const insertText = oldLength > 0 ? ` ${cleanText}` : cleanText;
									textNode.insert(oldLength, insertText);
									textNode.format(oldLength, insertText.length, { highlight: { color: '#DBEDEE' } });
									inserted = true;
								}
							}
						}

						if (!inserted) {
							const paragraph = new Y.XmlElement('paragraph');
							const textNode = new Y.XmlText();
							textNode.insert(0, cleanText);
							textNode.format(0, cleanText.length, { highlight: { color: '#DBEDEE' } });
							paragraph.insert(0, [textNode]);
							xmlFragment.insert(xmlFragment.length, [paragraph]);
						}
					});
				}
			}

			// Always respond instantly to prevent pipeline starvation loops
			res.json({ success: true });
		});
	});
});

app.post('/api/fix-grammar', express.json(), (req, res) => {
	const { text, reportId, docName } = req.body;

	if (!text || text.trim() === '') {
		return res.status(400).json({ error: 'No se proporcionó texto para corregir.' });
	}

	if (text.length > 3000) {
		return res.status(400).json({ error: 'El texto no debe superar los 3000 caracteres.' });
	}

	const systemPrompt = "Eres un corrector gramatical experto en informes médicos. Corrige la ortografía y la gramática en español del texto provisto. Conserva y respeta la estructura original de párrafos y saltos de línea. Devuelve ÚNICAMENTE el texto completamente corregido, manteniendo los mismos saltos de línea y párrafos que el texto original. No agregues introducciones, no expliques los cambios, no uses viñetas ni bloques de código. Tu respuesta debe ser exclusivamente el texto corregido. Respond with ONLY the corrected text. Do not add explanations. Keep the original paragraphs and line breaks. End immediately after the correction.";

	// We format using standard chatml blocks, but notice we point llama-cli to process it as a raw execution payload
	const formattedPrompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${text}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;

	console.log('[Llama.cpp] Launching strict single-shot completion pipeline...');

	// Switch this path back to the core llama-cli binary if it was changed
	const BINDING_EXECUTABLE = path.join(LLAMA_DIR, 'build/bin/llama-completion');

	const llamaProcess = spawn(BINDING_EXECUTABLE, [
		'-m', LLAMA_MODEL,
		'-p', formattedPrompt,
		'--chat-template', 'llama3',
		'--predict', '3000',                // Strict limit for completion length
		'--threads', '1',                   // Pin CPU context
		'--temp', '0.01',                   // Deterministic greedy parsing
		'--repeat-penalty', '1.3',
		'--no-display-prompt'               // Completely silences the prompt echo
	], {
		stdio: ['ignore', 'pipe', 'pipe']
	});

	let modelOutput = '';
	let errorOutput = '';
	let consecutiveNewlines = 0;
	let fallbackTextWindow = '';
	let initialResponseSent = false;

	const maxRuntime = setTimeout(() => {
		console.log('[Llama.cpp Watchdog] Llama timeout reached. Halting execution...');
		terminateAndSendResult();
	}, 60000);

	const terminateAndSendResult = () => {
		if (initialResponseSent) {
			return;
		}

		initialResponseSent = true;

		clearTimeout(maxRuntime);

		if (llamaProcess && llamaProcess.exitCode === null) {
			llamaProcess.kill('SIGKILL');
		}

		// Clean out prompt artifacts if any spilled through to stdout
		let correctedText = modelOutput;

		const structuralTags = ['<|eot_id|>', '<|end_of_text|>', '█', '▄▄', 'available commands:', '>'];

		for (const tag of structuralTags) {
			const index = correctedText.indexOf(tag);

			if (index !== -1) {
				correctedText = correctedText.substring(0, index);
			}
		}

		// Final sanity strip to remove terminal metric blocks like "[ Prompt: ... ]"
		correctedText = correctedText.replace(/\[\s*Prompt:[\s\S]*?\]/gi, '');
		correctedText = correctedText.trim();

		console.log(`[Llama.cpp] Pipeline complete. Clean Output: "${correctedText}"`);

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
				console.error(`[Llama.cpp] Error updating Yjs document:`, err);
			}
		}

		return res.json({ success: true, text: correctedText, injected: false });
	};

	res.on('close', () => {
		if (!initialResponseSent) {
			console.log('[Llama.cpp] Client request closed/aborted. Terminating llama process.');
			initialResponseSent = true;
			clearTimeout(maxRuntime);

			if (llamaProcess && llamaProcess.exitCode === null) {
				llamaProcess.kill('SIGKILL');
			}
		}
	});

	llamaProcess.stdout.on('data', (chunk) => {
		if (initialResponseSent) {
			return;
		}

		const dataString = chunk.toString();

		// Ignore the terminal greeting strings completely to keep our buffer uncontaminated
		if (dataString.includes('available commands:') || dataString.includes('██') || dataString.includes('build      :')) {
			return;
		}

		modelOutput += dataString;

		// 1. Precise stop sequence validation
		if (dataString.includes('<|eot_id|>') || dataString.includes('<|end_of_text|>')) {
			terminateAndSendResult();

			return;
		}

		// 2. Sliding evaluation window
		fallbackTextWindow += dataString;

		if (fallbackTextWindow.length > 300) {
			fallbackTextWindow = fallbackTextWindow.slice(-300);
		}

		// 3. Newline Guard
		for (let i = 0; i < dataString.length; i++) {
			if (dataString[i] === '\n') {
				consecutiveNewlines++;
			} else if (dataString[i].trim() !== '') {
				consecutiveNewlines = 0;
			}

			if (consecutiveNewlines >= 4) {
				console.log('[Llama.cpp Watchdog] Infinite newline loop intercepted.');
				terminateAndSendResult();

				return;
			}
		}

		// 4. Repetition Filter Layer
		const words = fallbackTextWindow.toLowerCase().replace(/[\r\n]/g, ' ').split(/\s+/).filter(Boolean);

		if (words.length >= 12) {
			const lastNWords = words.slice(-12);
			const uniqueWords = new Set(lastNWords);

			if (uniqueWords.size <= 2) {
				console.log('[Llama.cpp Watchdog] Phrase repetition loop detected.');
				terminateAndSendResult();

				return;
			}

			let alternatingPatternMatch = true;

			for (let i = 0; i < lastNWords.length - 2; i++) {
				if (lastNWords[i] !== lastNWords[i + 2]) {
					alternatingPatternMatch = false;
					break;
				}
			}

			if (alternatingPatternMatch) {
				console.log('[Llama.cpp Watchdog] Alternating sequence loop detected.');
				terminateAndSendResult();

				return;
			}
		}
	});

	llamaProcess.stderr.on('data', (data) => {
		if (initialResponseSent) {
			return;
		}

		errorOutput += data.toString();
	});

	llamaProcess.on('error', (err) => {
		console.error('[Llama.cpp] process error:', err);

		if (!initialResponseSent) {
			initialResponseSent = true;
			clearTimeout(maxRuntime);

			if (llamaProcess && llamaProcess.exitCode === null) {
				llamaProcess.kill('SIGKILL');
			}

			res.status(500).json({ error: 'Llama process error occurred' });
		}
	});

	llamaProcess.on('close', (code) => {
		clearTimeout(maxRuntime);

		if (code !== 0 && errorOutput) {
			console.error(`[Llama.cpp] process exited with code ${code}. Stderr:`, errorOutput);
		}

		if (!initialResponseSent) {
			terminateAndSendResult();
		}
	});
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