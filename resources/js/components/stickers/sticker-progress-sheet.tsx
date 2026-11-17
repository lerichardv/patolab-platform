import {
	Printer,
	Download,
	CheckCircle2,
	AlertCircle,
	Loader2,
	QrCode,
	RefreshCw,
	ExternalLink,
	Plus,
	Building2,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet';
import type {
	LaboratoryItem,
	StickerProgressSheetProps,
	StickerType,
} from './types';

export default function StickerProgressSheet({
	open,
	onOpenChange,
	initialType = 'muestra',
	specimenIds = [],
	cuttingIds = [],
	cuttingsAvailable = [],
	previewSpecimens = [],
	previewCuttings = [],
	title,
	description,
	autoStart = false,
}: StickerProgressSheetProps) {
	const resolvedInitialType: StickerType =
		initialType === 'frasco' || initialType === 'corte'
			? 'muestra'
			: initialType;

	const [selectedType, setSelectedType] =
		useState<StickerType>(resolvedInitialType);
	const [selectedCuttingCode, setSelectedCuttingCode] =
		useState<string>('none');
	const [status, setStatus] = useState<
		'idle' | 'generating' | 'completed' | 'error'
	>('idle');
	const [progress, setProgress] = useState(0);
	const [progressLabel, setProgressLabel] = useState('');
	const [errorMessage, setErrorMessage] = useState('');
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const iframeRef = useRef<HTMLIFrameElement | null>(null);
	const hasAutoStartedRef = useRef(false);

	// Dynamic Laboratory Management
	const [laboratories, setLaboratories] = useState<LaboratoryItem[]>([]);
	const [selectedLabId, setSelectedLabId] = useState<string>('');
	const [labsLoading, setLabsLoading] = useState(false);
	const [isAddLabOpen, setIsAddLabOpen] = useState(false);
	const [newLabName, setNewLabName] = useState('');
	const [savingLab, setSavingLab] = useState(false);
	const [addLabError, setAddLabError] = useState('');

	// Editable text fields for Specimen sticker
	const [biopsyNumber, setBiopsyNumber] = useState<string>('');
	const [markerName, setMarkerName] = useState<string>('');

	const handleCreateLaboratory = async () => {
		const trimmed = newLabName.trim();

		if (!trimmed) {
			setAddLabError('El nombre del laboratorio no puede estar vacío.');

			return;
		}

		setSavingLab(true);
		setAddLabError('');

		try {
			const csrfToken =
				(
					document.querySelector(
						'meta[name="csrf-token"]',
					) as HTMLMetaElement
				)?.content || '';

			const res = await fetch('/laboratories', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					'X-CSRF-TOKEN': csrfToken,
					'X-Requested-With': 'XMLHttpRequest',
				},
				body: JSON.stringify({ name: trimmed }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(
					data.message ||
					data.errors?.name?.[0] ||
					'Error al crear el laboratorio.',
				);
			}

			const createdLab: LaboratoryItem = data.data;
			setLaboratories((prev) => [...prev, createdLab]);
			setSelectedLabId(String(createdLab.id));
			setNewLabName('');
			setIsAddLabOpen(false);
		} catch (err: any) {
			setAddLabError(err.message || 'Error al guardar el laboratorio.');
		} finally {
			setSavingLab(false);
		}
	};

	const triggerPrint = (urlToPrint?: string) => {
		const url = urlToPrint || pdfUrl;

		if (!url) {
			return;
		}

		if (iframeRef.current) {
			iframeRef.current.src = url;
			iframeRef.current.onload = () => {
				try {
					iframeRef.current?.contentWindow?.print();
				} catch {
					window.open(url, '_blank');
				}
			};
		} else {
			window.open(url, '_blank');
		}
	};

	const handleDownload = () => {
		if (!pdfUrl) {
			return;
		}

		const a = document.createElement('a');
		a.href = pdfUrl;
		a.download = `stickers-${selectedType}-${Date.now()}.pdf`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	};

	const handleGenerate = async (typeOverride?: StickerType) => {
		const typeToUse =
			typeof typeOverride === 'string' ? typeOverride : selectedType;
		setStatus('generating');
		setProgress(15);
		setProgressLabel('Preparando datos para la impresora Zebra...');
		setErrorMessage('');

		try {
			const progressTimer = setInterval(() => {
				setProgress((prev) => {
					if (prev < 80) {
						return prev + 15;
					}

					return prev;
				});
			}, 300);

			let endpoint = '/stickers/specimens';
			let payload: Record<string, any> = {};

			const chosenLab = laboratories.find(
				(l) => String(l.id) === String(selectedLabId),
			);
			const labName = chosenLab?.name || undefined;

			if (typeToUse === 'casette') {
				endpoint = '/stickers/cuttings';

				if (previewCuttings.length > 0) {
					payload = {
						preview_data: previewCuttings.map((c) => ({
							...c,
							laboratory_name: labName ?? c.laboratory_name,
						})),
						laboratory_name: labName,
					};
				} else if (cuttingIds.length > 0) {
					payload = {
						cutting_ids: cuttingIds,
						laboratory_name: labName,
					};
				} else if (specimenIds.length > 0) {
					payload = {
						specimen_ids: specimenIds,
						laboratory_name: labName,
					};
				}
			} else {
				endpoint = '/stickers/specimens';

				const resolvedBiopsy = biopsyNumber.trim() || undefined;
				const resolvedMarker = markerName.trim() || undefined;
				const resolvedCutting =
					selectedCuttingCode !== 'none'
						? selectedCuttingCode !== 'all'
							? selectedCuttingCode
							: undefined
						: undefined;

				if (previewSpecimens.length > 0) {
					payload = {
						preview_data: previewSpecimens.map((p) => ({
							...p,
							laboratory_name: labName ?? p.laboratory_name,
							biopsy_number: resolvedBiopsy ?? p.biopsy_number,
							marker_name: resolvedMarker ?? p.marker_name,
							cutting_code:
								selectedCuttingCode !== 'none'
									? selectedCuttingCode === 'all'
										? p.cutting_code
										: selectedCuttingCode
									: undefined,
						})),
						type: 'muestra',
						laboratory_name: labName,
						biopsy_number: resolvedBiopsy,
						marker_name: resolvedMarker,
						cutting_code: resolvedCutting,
					};
				} else {
					payload = {
						specimen_ids: specimenIds,
						type: 'muestra',
						laboratory_name: labName,
						biopsy_number: resolvedBiopsy,
						marker_name: resolvedMarker,
						cutting_code: resolvedCutting,
					};
				}
			}

			setProgress(45);
			setProgressLabel('Generando códigos QR y fuentes en Base64...');

			const csrfToken =
				(
					document.querySelector(
						'meta[name="csrf-token"]',
					) as HTMLMetaElement
				)?.content || '';

			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/pdf, application/json',
					'X-CSRF-TOKEN': csrfToken,
					'X-Requested-With': 'XMLHttpRequest',
				},
				body: JSON.stringify(payload),
			});

			clearInterval(progressTimer);

			if (!response.ok) {
				const text = await response.text();
				let message = 'Error al generar los stickers en PDF.';

				try {
					const parsed = JSON.parse(text);

					if (parsed.message) {
						message = parsed.message;
					}
				} catch {
					// Ignore json parse error
				}

				throw new Error(message);
			}

			setProgress(90);
			setProgressLabel('Procesando documento PDF final...');

			const blob = await response.blob();
			const blobUrl = URL.createObjectURL(blob);
			setPdfUrl(blobUrl);

			setProgress(100);
			setProgressLabel('¡Stickers generados exitosamente!');
			setStatus('completed');

			setTimeout(() => {
				triggerPrint(blobUrl);
			}, 400);
		} catch (err: any) {
			setStatus('error');
			setErrorMessage(
				err.message || 'Ocurrió un error inesperado al generar el PDF.',
			);
		}
	};

	// Fetch laboratories on mount or open
	useEffect(() => {
		if (!open) {
			return;
		}

		const fetchLaboratories = async () => {
			setLabsLoading(true);

			try {
				const res = await fetch('/laboratories', {
					headers: { Accept: 'application/json' },
				});

				if (res.ok) {
					const json = await res.json();
					const list: LaboratoryItem[] = json.data || [];
					setLaboratories(list);

					// Set default lab if none selected
					const defaultLab =
						list.find((l) => l.is_default) || list[0];

					if (defaultLab) {
						setSelectedLabId(
							(prev) => prev || String(defaultLab.id),
						);
					}
				}
			} catch {
				// Fallback graceful degradation
			} finally {
				setLabsLoading(false);
			}
		};

		fetchLaboratories();
	}, [open]);

	// Sync type and state when opened
	useEffect(() => {
		if (open) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setSelectedType(resolvedInitialType);
			setStatus('idle');
			setProgress(0);
			setErrorMessage('');

			if (pdfUrl) {
				URL.revokeObjectURL(pdfUrl);
				setPdfUrl(null);
			}

			// Populate initial editable values
			const initialBiopsy = previewSpecimens[0]?.biopsy_number ?? '';
			const initialMarker = previewSpecimens[0]?.marker_name ?? '';
			const initialCutting =
				previewSpecimens[0]?.cutting_code ??
				(cuttingsAvailable.length > 0 ? 'all' : 'none');

			setBiopsyNumber(initialBiopsy);
			setMarkerName(initialMarker);
			setSelectedCuttingCode(initialCutting);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, resolvedInitialType]);

	// Auto-start if requested
	useEffect(() => {
		if (!open) {
			hasAutoStartedRef.current = false;

			return;
		}

		if (autoStart && !hasAutoStartedRef.current) {
			hasAutoStartedRef.current = true;
			handleGenerate(resolvedInitialType);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, autoStart, resolvedInitialType]);

	// Clean up blob URL on unmount
	useEffect(() => {
		return () => {
			if (pdfUrl) {
				URL.revokeObjectURL(pdfUrl);
			}
		};
	}, [pdfUrl]);

	const totalCount =
		selectedType === 'casette'
			? previewCuttings.length ||
			cuttingIds.length ||
			(specimenIds.length ? `${specimenIds.length} muestras` : 0)
			: previewSpecimens.length || specimenIds.length;

	return (
		<>
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent className="flex flex-col sm:max-w-md">
					<SheetHeader className="pb-2">
						<div className="flex items-center gap-2 text-primary">
							<Printer className="h-5 w-5" />
							<SheetTitle className="text-lg">
								{title || 'Impresión de Stickers (Zebra ZD620)'}
							</SheetTitle>
						</div>
						<SheetDescription className="text-xs">
							{description ||
								'Generación de etiquetas térmicas con código QR, tipografía Arial Narrow y datos editables.'}
						</SheetDescription>
					</SheetHeader>

					<div className="flex-1 space-y-4 overflow-y-auto px-5 py-2">
						{/* Template Type Selector & Form Inputs */}
						{status === 'idle' && (
							<div className="space-y-4">
								<div className="space-y-2">
									<Label className="text-xs font-semibold">
										Tipo de Plantilla de Sticker
									</Label>
									<div className="grid grid-cols-1 gap-2.5">
										<button
											type="button"
											onClick={() =>
												setSelectedType('muestra')
											}
											className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-all ${selectedType === 'muestra' ||
												selectedType === 'frasco' ||
												selectedType === 'corte'
												? 'border-primary bg-primary/5 ring-1 ring-primary'
												: 'border-border hover:bg-muted/50'
												}`}
										>
											<QrCode className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
											<div className="flex-1">
												<div className="flex items-center justify-between">
													<span className="text-xs font-bold text-foreground">
														1. Sticker de Muestra
													</span>
													<Badge
														variant="outline"
														className="text-[10px]"
													>
														0.94&quot; × 0.94&quot;
													</Badge>
												</div>
												<p className="mt-0.5 text-[11px] text-muted-foreground">
													Para frasco, lámina o corte.
													Incluye QR, laboratorio,
													biopsia, secuencia y
													marcador.
												</p>
											</div>
										</button>

										<button
											type="button"
											onClick={() =>
												setSelectedType('casette')
											}
											className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-all ${selectedType === 'casette'
												? 'border-primary bg-primary/5 ring-1 ring-primary'
												: 'border-border hover:bg-muted/50'
												}`}
										>
											<Printer className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
											<div className="flex-1">
												<div className="flex items-center justify-between">
													<span className="text-xs font-bold text-foreground">
														2. Stickers de Casette
													</span>
													<Badge
														variant="outline"
														className="text-[10px]"
													>
														0.75&quot; × 0.20&quot;
													</Badge>
												</div>
												<p className="mt-0.5 text-[11px] text-muted-foreground">
													Micro-etiqueta horizontal:
													Letra grande, laboratorio,
													código y nombre.
												</p>
											</div>
										</button>
									</div>
								</div>

								{/* Customizable Fields for Specimen Sticker */}
								{(selectedType === 'muestra' ||
									selectedType === 'frasco' ||
									selectedType === 'corte') && (
										<div className="space-y-3 rounded-lg border bg-muted/20 p-3.5">
											<div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
												<Building2 className="h-3.5 w-3.5 text-primary" />
												<span>
													Datos del Sticker (0.94&quot; ×
													0.94&quot;)
												</span>
											</div>

											{/* Line 1: Laboratorio */}
											<div className="space-y-1">
												<div className="flex items-center justify-between">
													<Label className="text-[11px] font-medium text-muted-foreground">
														1. Nombre de Laboratorio
													</Label>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => {
															setAddLabError('');
															setIsAddLabOpen(true);
														}}
														className="h-6 px-1.5 text-[10px] text-primary hover:bg-primary/10"
													>
														<Plus className="mr-0.5 h-3 w-3" />
														Nuevo
													</Button>
												</div>
												<Select
													value={selectedLabId}
													onValueChange={setSelectedLabId}
													disabled={labsLoading}
												>
													<SelectTrigger className="h-8 text-xs">
														<SelectValue placeholder="Seleccione laboratorio..." />
													</SelectTrigger>
													<SelectContent>
														{laboratories.map((lab) => (
															<SelectItem
																key={lab.id}
																value={String(
																	lab.id,
																)}
															>
																{lab.name}{' '}
																{lab.is_default &&
																	'(Predeterminado)'}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>

											{/* Line 2: Número de la Biopsia */}
											<div className="space-y-1">
												<Label className="text-[11px] font-medium text-muted-foreground">
													2. Número de la Biopsia
													(Editable)
												</Label>
												<Input
													value={biopsyNumber}
													onChange={(e) =>
														setBiopsyNumber(
															e.target.value,
														)
													}
													placeholder="ej. BX-2026-0045"
													className="h-8 text-xs"
												/>
											</div>

											{/* Line 4: Nombre del Marcador */}
											<div className="space-y-1">
												<Label className="text-[11px] font-medium text-muted-foreground">
													4. Nombre del Marcador
													(Editable)
												</Label>
												<Input
													value={markerName}
													onChange={(e) =>
														setMarkerName(
															e.target.value,
														)
													}
													placeholder="ej. HER2, CK7, Ki-67 (opcional)"
													className="h-8 text-xs"
												/>
											</div>

											{/* Cutting letter selector if cuttings available */}
											{cuttingsAvailable.length > 0 && (
												<div className="space-y-1 pt-1">
													<Label className="text-[11px] font-medium text-muted-foreground">
														Letra de Corte (Esquina
														Superior)
													</Label>
													<Select
														value={selectedCuttingCode}
														onValueChange={
															setSelectedCuttingCode
														}
													>
														<SelectTrigger className="h-8 text-xs">
															<SelectValue placeholder="Seleccione corte..." />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="none">
																Sin letra de corte
															</SelectItem>
															<SelectItem value="all">
																Primer corte
																disponible
															</SelectItem>
															{cuttingsAvailable.map(
																(c) => {
																	const codeLetter =
																		typeof c.code ===
																			'object' &&
																			c.code !==
																			null
																			? c.code
																				.code
																			: String(
																				c.code ||
																				c.id,
																			);

																	return (
																		<SelectItem
																			key={
																				c.id
																			}
																			value={
																				codeLetter
																			}
																		>
																			Corte{' '}
																			{
																				codeLetter
																			}{' '}
																			(ID #
																			{c.id})
																		</SelectItem>
																	);
																},
															)}
														</SelectContent>
													</Select>
												</div>
											)}
										</div>
									)}

								{selectedType === 'casette' && (
									<div className="space-y-3 rounded-lg border bg-muted/20 p-3.5">
										<div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
											<Building2 className="h-3.5 w-3.5 text-primary" />
											<span>
												Datos del Sticker de Casette
												(0.75&quot; × 0.20&quot;)
											</span>
										</div>

										{/* Line 1: Laboratorio */}
										<div className="space-y-1">
											<div className="flex items-center justify-between">
												<Label className="text-[11px] font-medium text-muted-foreground">
													Nombre de Laboratorio
												</Label>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => {
														setAddLabError('');
														setIsAddLabOpen(true);
													}}
													className="h-6 px-1.5 text-[10px] text-primary hover:bg-primary/10"
												>
													<Plus className="mr-0.5 h-3 w-3" />
													Nuevo
												</Button>
											</div>
											<Select
												value={selectedLabId}
												onValueChange={setSelectedLabId}
												disabled={labsLoading}
											>
												<SelectTrigger className="h-8 text-xs">
													<SelectValue placeholder="Seleccione laboratorio..." />
												</SelectTrigger>
												<SelectContent>
													{laboratories.map((lab) => (
														<SelectItem
															key={lab.id}
															value={String(
																lab.id,
															)}
														>
															{lab.name}{' '}
															{lab.is_default &&
																'(Predeterminado)'}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</div>
								)}

								{/* Target count summary */}
								<div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-xs">
									<span className="text-muted-foreground">
										Cantidad de elementos:
									</span>
									<span className="font-mono font-bold text-foreground">
										{totalCount || 1}
									</span>
								</div>
							</div>
						)}

						{/* Generating State */}
						{status === 'generating' && (
							<div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
								<div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
									<Loader2 className="h-7 w-7 animate-spin text-primary" />
								</div>
								<div className="space-y-1">
									<p className="text-sm font-semibold text-foreground">
										Generando Stickers en PDF
									</p>
									<p className="text-xs text-muted-foreground">
										{progressLabel}
									</p>
								</div>

								<div className="w-full space-y-1 pt-2">
									<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
										<div
											className="h-full bg-primary transition-all duration-300"
											style={{ width: `${progress}%` }}
										/>
									</div>
									<div className="flex justify-between text-[10px] text-muted-foreground">
										<span>Zebra ZD620</span>
										<span>{progress}%</span>
									</div>
								</div>
							</div>
						)}

						{/* Completed State */}
						{status === 'completed' && (
							<div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
								<div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
									<CheckCircle2 className="h-8 w-8" />
								</div>
								<div className="space-y-1">
									<p className="text-sm font-semibold text-foreground">
										¡Documento Listo!
									</p>
									<p className="text-xs text-muted-foreground">
										El PDF ha sido formateado a la medida
										exacta para la impresora Zebra.
									</p>
								</div>

								<div className="grid w-full grid-cols-2 gap-2 pt-2">
									<Button
										type="button"
										onClick={() => triggerPrint()}
										className="h-9 gap-1.5 text-xs font-semibold"
									>
										<Printer className="h-3.5 w-3.5" />{' '}
										Imprimir
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={handleDownload}
										className="h-9 gap-1.5 text-xs font-semibold"
									>
										<Download className="h-3.5 w-3.5" />{' '}
										Descargar PDF
									</Button>
								</div>

								{pdfUrl && (
									<a
										href={pdfUrl}
										target="_blank"
										rel="noreferrer"
										className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
									>
										<ExternalLink className="h-3 w-3" />{' '}
										Abrir PDF en pestaña nueva
									</a>
								)}
							</div>
						)}

						{/* Error State */}
						{status === 'error' && (
							<div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
								<div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
									<AlertCircle className="h-8 w-8" />
								</div>
								<div className="space-y-1">
									<p className="text-sm font-semibold text-destructive">
										Error en la Generación
									</p>
									<p className="text-xs text-muted-foreground">
										{errorMessage}
									</p>
								</div>
								<Button
									type="button"
									variant="outline"
									onClick={() => handleGenerate(selectedType)}
									className="h-8 gap-1.5 text-xs"
								>
									<RefreshCw className="h-3.5 w-3.5" />{' '}
									Reintentar
								</Button>
							</div>
						)}
					</div>

					<SheetFooter className="border-t pt-3">
						{status === 'idle' ? (
							<div className="flex w-full gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => onOpenChange(false)}
									className="flex-1 text-xs"
								>
									Cancelar
								</Button>
								<Button
									type="button"
									onClick={() => handleGenerate(selectedType)}
									className="flex-1 gap-1.5 text-xs font-semibold"
								>
									<Printer className="h-3.5 w-3.5" /> Generar
									e Imprimir
								</Button>
							</div>
						) : (
							<div className="flex w-full gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										setStatus('idle');
									}}
									className="flex-1 text-xs"
								>
									Modificar Datos
								</Button>
								<Button
									type="button"
									variant="secondary"
									onClick={() => onOpenChange(false)}
									className="flex-1 text-xs"
								>
									Cerrar
								</Button>
							</div>
						)}
					</SheetFooter>

					{/* Hidden iframe for silent printing */}
					<iframe
						ref={iframeRef}
						className="hidden"
						title="Zebra Sticker Print Frame"
					/>
				</SheetContent>
			</Sheet>

			{/* Modal to Add New Laboratory */}
			<Dialog open={isAddLabOpen} onOpenChange={setIsAddLabOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-base">
							Registrar Nuevo Laboratorio
						</DialogTitle>
						<DialogDescription className="text-xs">
							Agrega un laboratorio o centro médico para rotular
							las etiquetas térmicas.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3 py-2">
						<div className="space-y-1">
							<Label
								htmlFor="lab-name-input"
								className="text-xs font-medium"
							>
								Nombre del Laboratorio
							</Label>
							<Input
								id="lab-name-input"
								value={newLabName}
								onChange={(e) => {
									setNewLabName(e.target.value);

									if (addLabError) {
										setAddLabError('');
									}
								}}
								placeholder="ej. Centro Médico San José"
								className="text-xs"
								autoFocus
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										handleCreateLaboratory();
									}
								}}
							/>
							{addLabError && (
								<p className="text-[11px] text-destructive">
									{addLabError}
								</p>
							)}
						</div>
					</div>

					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								setNewLabName('');
								setAddLabError('');
								setIsAddLabOpen(false);
							}}
							className="text-xs"
						>
							Cancelar
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={handleCreateLaboratory}
							disabled={savingLab || !newLabName.trim()}
							className="text-xs font-semibold"
						>
							{savingLab && (
								<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
							)}
							Guardar Laboratorio
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
