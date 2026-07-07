import { usePage } from '@inertiajs/react';
import { Send, X, Trash2 } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { chat as chatAction } from '@/actions/App/Http/Controllers/AiAssistantController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message {
	role: 'user' | 'assistant';
	content: string;
}

export default function AiAssistant() {
	const { auth } = usePage<any>().props;
	const [isOpen, setIsOpen] = useState(false);
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Load chat history from sessionStorage
	useEffect(() => {
		const savedHistory = sessionStorage.getItem('patolab_ai_chat_history');
		if (savedHistory) {
			try {
				setMessages(JSON.parse(savedHistory));
			} catch (e) {
				console.error(
					'Error parsing chat history from session storage',
					e,
				);
			}
		} else {
			// Default welcome message
			const welcomeMessage: Message = {
				role: 'assistant',
				content: `¡Hola ${auth?.user?.name || ''}! Soy el Asistente de IA de PatoLab. ¿En qué te puedo colaborar hoy? Puedo ayudarte a resolver dudas del sistema, procesos de laboratorio o asistencia general.`,
			};
			setMessages([welcomeMessage]);
			sessionStorage.setItem(
				'patolab_ai_chat_history',
				JSON.stringify([welcomeMessage]),
			);
		}
	}, [auth]);

	// Scroll to bottom on new messages
	useEffect(() => {
		if (messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
		}
	}, [messages, isOpen]);

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedInput = input.trim();
		if (!trimmedInput || isLoading) return;

		const newMessages: Message[] = [
			...messages,
			{ role: 'user', content: trimmedInput },
		];
		setMessages(newMessages);
		setInput('');
		setIsLoading(true);

		sessionStorage.setItem(
			'patolab_ai_chat_history',
			JSON.stringify(newMessages),
		);

		const csrfToken = document
			.querySelector('meta[name="csrf-token"]')
			?.getAttribute('content');

		try {
			const response = await fetch(chatAction().url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRF-TOKEN': csrfToken || '',
					Accept: 'application/json',
				},
				body: JSON.stringify({ messages: newMessages }),
			});

			const data = await response.json();

			if (response.ok && data.reply) {
				const finalMessages: Message[] = [
					...newMessages,
					{ role: 'assistant', content: data.reply },
				];
				setMessages(finalMessages);
				sessionStorage.setItem(
					'patolab_ai_chat_history',
					JSON.stringify(finalMessages),
				);
			} else {
				const errorMessage =
					data.error || 'Ocurrió un error al procesar tu solicitud.';
				const finalMessages: Message[] = [
					...newMessages,
					{ role: 'assistant', content: `⚠️ Error: ${errorMessage}` },
				];
				setMessages(finalMessages);
				sessionStorage.setItem(
					'patolab_ai_chat_history',
					JSON.stringify(finalMessages),
				);
			}
		} catch (error) {
			console.error('Error connecting to AI chat API', error);
			const finalMessages: Message[] = [
				...newMessages,
				{
					role: 'assistant',
					content: '⚠️ Error: No se pudo conectar con el servidor.',
				},
			];
			setMessages(finalMessages);
			sessionStorage.setItem(
				'patolab_ai_chat_history',
				JSON.stringify(finalMessages),
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleClearChat = () => {
		if (
			window.confirm(
				'¿Estás seguro de que deseas limpiar la conversación actual?',
			)
		) {
			const welcomeMessage: Message = {
				role: 'assistant',
				content: `Conversación reiniciada. ¿En qué más te puedo colaborar hoy?`,
			};
			setMessages([welcomeMessage]);
			sessionStorage.setItem(
				'patolab_ai_chat_history',
				JSON.stringify([welcomeMessage]),
			);
		}
	};

	return (
		<div className="fixed right-6 bottom-6 z-50 flex flex-col items-end">
			{/* Chat Panel */}
			{isOpen && (
				<div className="mb-4 flex h-[520px] w-[350px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-2xl transition-all duration-300 ease-in-out sm:w-[400px]">
					{/* Header */}
					<div className="flex items-center justify-between bg-gradient-to-r from-accent to-primary px-4 py-4 text-white shadow-md">
						<div className="flex items-center gap-2.5">
							<div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/90 p-1.5 shadow-sm">
								<img
									src="/images/patolab-isotipo.png"
									alt="PatoLab Isotipo"
									className="h-full w-full object-contain"
								/>
								<span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
							</div>
							<div>
								<h3 className="text-sm font-semibold tracking-wide flex items-center gap-1">
									<span>PatoLab</span>
									<span className="text-white/80 font-normal">AI</span>
								</h3>
								<p className="text-[10px] font-medium text-white/70">
									Asistente Inteligente
								</p>
							</div>
						</div>
						<div className="flex items-center gap-1.5">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 rounded-lg text-white hover:bg-white/15"
								onClick={handleClearChat}
								title="Limpiar chat"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 rounded-lg text-white hover:bg-white/15"
								onClick={() => setIsOpen(false)}
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
					</div>

					{/* Messages Body */}
					<div className="flex-1 space-y-4 overflow-y-auto bg-muted/20 p-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
						{messages.map((message, index) => (
							<div
								key={index}
								className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
							>
								{message.role === 'assistant' && (
									<div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-white border border-border/60 p-1 shadow-sm self-start">
										<img
											src="/images/patolab-isotipo.png"
											alt="AI"
											className="h-full w-full object-contain"
										/>
									</div>
								)}
								<div
									className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed whitespace-pre-line ${message.role === 'user'
										? 'rounded-tr-none bg-primary text-primary-foreground font-medium'
										: 'rounded-tl-none border border-border/60 bg-card text-card-foreground'
										}`}
								>
									{message.content}
								</div>
							</div>
						))}

						{/* Loading pulse bubble */}
						{isLoading && (
							<div className="flex gap-2 justify-start">
								<div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-white border border-border/60 p-1 shadow-sm self-start">
									<img
										src="/images/patolab-isotipo.png"
										alt="AI"
										className="h-full w-full object-contain animate-pulse"
									/>
								</div>
								<div className="flex max-w-[78%] items-center gap-1.5 rounded-2xl rounded-tl-none border border-border/60 bg-card px-4 py-3.5 text-sm shadow-sm">
									<span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.3s]" />
									<span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
									<span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" />
								</div>
							</div>
						)}
						<div ref={messagesEndRef} />
					</div>

					{/* Footer Input */}
					<form
						onSubmit={handleSend}
						className="border-t bg-card p-3"
					>
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center gap-2">
								<Input
									value={input}
									onChange={(
										e: React.ChangeEvent<HTMLInputElement>,
									) => setInput(e.target.value)}
									placeholder="Escribe un mensaje..."
									disabled={isLoading}
									className="flex-1 border-none bg-muted/40 shadow-none focus-visible:ring-1 focus-visible:ring-primary text-sm rounded-xl py-2 px-3 h-9"
								/>
								<Button
									type="submit"
									size="icon"
									className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-tr from-accent to-primary hover:opacity-90 active:scale-95 transition-all text-white shadow-md shadow-indigo-500/10"
									disabled={!input.trim() || isLoading}
								>
									<Send className="h-4 w-4" />
								</Button>
							</div>
							<div className="text-[9px] text-center text-muted-foreground/75 mt-0.5 font-light">
								Asistente PatoLab AI • La información puede ser inexacta.
							</div>
						</div>
					</form>
				</div>
			)}

			{/* Toggle Button */}
			<Button
				onClick={() => setIsOpen(!isOpen)}
				size="icon"
				className={`h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none ${isOpen
					? 'bg-card border border-border text-foreground hover:bg-muted'
					: 'bg-gradient-to-tr from-accent to-primary text-white shadow-indigo-500/20 hover:shadow-indigo-500/30'
					}`}
			>
				{isOpen ? (
					<X className="h-6 w-6 text-foreground transition-transform duration-300" />
				) : (
					<div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white p-1 shadow-sm">
						<img
							src="/images/patolab-isotipo.png"
							alt="PatoLab Isotipo"
							className="h-full w-full object-contain"
						/>
						<span className="absolute -right-0.5 -bottom-0.5 flex h-3.5 w-3.5">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
							<span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500"></span>
						</span>
					</div>
				)}
			</Button>
		</div>
	);
}
