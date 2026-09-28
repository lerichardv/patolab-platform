import { router } from '@inertiajs/react';
import axios from 'axios';
import debounce from 'lodash/debounce';
import {
	ArrowRight,
	Search,
	Loader2,
	CheckCircle2,
	AlertTriangle,
	Layers,
	FileText,
	GitMerge,
	Check,
	X,
	FolderMinus,
	CreditCard,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { merge as mergeGroupAction } from '@/actions/App/Http/Controllers/SpecimenGroupController';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface GroupSpecimenItem {
	id: number;
	sequence_code: string;
	status: string;
	status_color?: string;
	customer_name?: string;
	type_name?: string;
	examination_name?: string;
}

export interface GroupInvoiceInfo {
	id: number;
	invoice_number: string | null;
	full_invoice_number: string | null;
	has_invoice_number: boolean;
	payment_type: string;
	amount: number;
	discount: number;
	subtotal: number;
	total: number;
	total_paid: number;
	invoice_file?: string | null;
	invoice_file_url?: string | null;
}

export interface GroupCreditInfo {
	id: number;
	credit_amount: number;
	amount_paid: number;
	amount_remaining: number;
	status: string;
	created_at?: string;
}

export interface MergeGroupData {
	id: number;
	name: string;
	customer_id: number;
	customer: {
		id: number;
		name: string;
		id_number?: string;
		type?: string;
	} | null;
	specimens_count: number;
	specimens: GroupSpecimenItem[];
	invoice: GroupInvoiceInfo | null;
	credit: GroupCreditInfo | null;
	invoice_specimens_count: number;
}

export interface CandidateGroupItem {
	id: number;
	name: string;
	customer_name: string;
	full_invoice_number: string | null;
	has_invoice_number: boolean;
	payment_type: string;
	has_credit?: boolean;
	is_compatible?: boolean;
	total: number;
	specimens_count: number;
	specimen_codes: string[];
}

interface Props {
	targetGroup: MergeGroupData;
	onSuccess?: () => void;
	onCancel?: () => void;
}

export default function SpecimenGroupMergeForm({
	targetGroup,
	onSuccess,
	onCancel,
}: Props) {
	const [search, setSearch] = useState('');
	const [candidates, setCandidates] = useState<CandidateGroupItem[]>([]);
	const [loadingCandidates, setLoadingCandidates] = useState(true);
	const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);

	const [selectedOriginGroup, setSelectedOriginGroup] = useState<MergeGroupData | null>(null);
	const [loadingOriginDetails, setLoadingOriginDetails] = useState(false);

	// Invoice selection: 'target' | 'origin'
	const [selectedInvoiceToKeep, setSelectedInvoiceToKeep] = useState<'target' | 'origin'>('target');

	// Credit selection: 'target' | 'origin'
	const [selectedCreditToKeep, setSelectedCreditToKeep] = useState<'target' | 'origin'>('target');

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

	const abortControllerRef = useRef<AbortController | null>(null);

	// Fetch candidate groups
	const fetchCandidates = useCallback(async (query: string) => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		abortControllerRef.current = new AbortController();

		try {
			const response = await axios.get('/specimen-groups/search-merge-candidates', {
				params: {
					exclude_id: targetGroup.id,
					q: query,
				},
				signal: abortControllerRef.current.signal,
			});

			setCandidates(response.data.data || []);
		} catch (error: any) {
			if (axios.isCancel(error) || error.name === 'CanceledError') {
				return;
			}

			console.error('Error fetching merge candidate groups:', error);
		} finally {
			if (!abortControllerRef.current?.signal.aborted) {
				setLoadingCandidates(false);
			}
		}
	}, [targetGroup.id]);

	const debouncedFetchRef = useRef<ReturnType<typeof debounce> | null>(null);

	useEffect(() => {
		debouncedFetchRef.current = debounce((query: string) => {
			fetchCandidates(query);
		}, 300);

		return () => {
			debouncedFetchRef.current?.cancel();

			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
	}, [fetchCandidates]);

	// Initial search load
	useEffect(() => {
		fetchCandidates('');
	}, [fetchCandidates]);

	// Load full details for selected candidate
	const handleSelectCandidate = async (candidateId: number) => {
		setSelectedCandidateId(candidateId);
		setLoadingOriginDetails(true);

		try {
			const response = await axios.get(`/specimen-groups/${candidateId}/merge-data`);
			const originData: MergeGroupData = response.data;
			setSelectedOriginGroup(originData);

			// Auto-determine default invoice selection
			const targetHasNum = targetGroup.invoice?.has_invoice_number ?? false;
			const originHasNum = originData.invoice?.has_invoice_number ?? false;

			if (originHasNum && !targetHasNum) {
				setSelectedInvoiceToKeep('origin');
			} else {
				setSelectedInvoiceToKeep('target');
			}

			// Default credit selection to target
			setSelectedCreditToKeep('target');
		} catch (err: any) {
			console.error('Error fetching origin group details:', err);
			toast.error('No se pudo cargar la información detallada del grupo seleccionado.');
			setSelectedCandidateId(null);
			setSelectedOriginGroup(null);
		} finally {
			setLoadingOriginDetails(false);
		}
	};

	const handleClearSelectedOrigin = () => {
		setSelectedCandidateId(null);
		setSelectedOriginGroup(null);
		setSelectedInvoiceToKeep('target');
		setSelectedCreditToKeep('target');
	};

	// Credit compatibility and status
	const targetHasCredit = targetGroup.invoice?.payment_type === 'credit' || !!targetGroup.credit;
	const originHasCredit = selectedOriginGroup?.invoice?.payment_type === 'credit' || !!selectedOriginGroup?.credit;

	const bothHaveCredit = Boolean(targetHasCredit && originHasCredit && targetGroup.credit && selectedOriginGroup?.credit);
	const isCreditMismatch = Boolean(selectedOriginGroup && ((targetHasCredit && !originHasCredit) || (!targetHasCredit && originHasCredit)));

	let chosenCreditId: number | undefined = undefined;
	let dissolvedCreditId: number | undefined = undefined;

	if (bothHaveCredit) {
		if (selectedCreditToKeep === 'origin') {
			chosenCreditId = selectedOriginGroup?.credit?.id;
			dissolvedCreditId = targetGroup.credit?.id;
		} else {
			chosenCreditId = targetGroup.credit?.id;
			dissolvedCreditId = selectedOriginGroup?.credit?.id;
		}
	} else if (targetHasCredit) {
		chosenCreditId = targetGroup.credit?.id;
	} else if (originHasCredit) {
		chosenCreditId = selectedOriginGroup?.credit?.id;
	}

	// Calculate invoice number scenarios
	const targetHasInvoiceNum = targetGroup.invoice?.has_invoice_number ?? false;
	const originHasInvoiceNum = selectedOriginGroup?.invoice?.has_invoice_number ?? false;

	const bothHaveInvoiceNum = targetHasInvoiceNum && originHasInvoiceNum;
	const onlyOneHasInvoiceNum = (targetHasInvoiceNum && !originHasInvoiceNum) || (!targetHasInvoiceNum && originHasInvoiceNum);
	const neitherHasInvoiceNum = !targetHasInvoiceNum && !originHasInvoiceNum;

	// Resulting preview calculations
	const resultingCount = targetGroup.specimens_count + (selectedOriginGroup?.specimens_count ?? 0);
	const resultingGroupName = `${targetGroup.customer?.name || 'Grupo'} - ${resultingCount} ${resultingCount === 1 ? 'Muestra' : 'Muestras'}`;

	const targetTotal = targetGroup.invoice?.total ?? 0;
	const originTotal = selectedOriginGroup?.invoice?.total ?? 0;
	const combinedTotal = targetTotal + originTotal;

	const targetPaid = (targetGroup.credit?.amount_paid ?? targetGroup.invoice?.total_paid) ?? 0;
	const originPaid = (selectedOriginGroup?.credit?.amount_paid ?? selectedOriginGroup?.invoice?.total_paid) ?? 0;
	const combinedPaid = targetPaid + originPaid;

	const targetRemaining = targetGroup.credit?.amount_remaining ?? 0;
	const originRemaining = selectedOriginGroup?.credit?.amount_remaining ?? 0;
	const combinedRemaining = bothHaveCredit
		? Math.max(0, combinedTotal - combinedPaid)
		: targetRemaining + originRemaining;

	// Resolve final invoice number label
	const targetInvoiceDisplay = targetGroup.invoice?.full_invoice_number || targetGroup.invoice?.invoice_number || 'Sin número fiscal';
	const originInvoiceDisplay = selectedOriginGroup?.invoice?.full_invoice_number || selectedOriginGroup?.invoice?.invoice_number || 'Sin número fiscal';

	let finalInvoiceNumberDisplay = 'Sin número fiscal asignado';
	let chosenInvoiceId: number | undefined = undefined;

	if (selectedOriginGroup) {
		if (bothHaveInvoiceNum) {
			if (selectedInvoiceToKeep === 'origin') {
				finalInvoiceNumberDisplay = originInvoiceDisplay;
				chosenInvoiceId = selectedOriginGroup.invoice?.id;
			} else {
				finalInvoiceNumberDisplay = targetInvoiceDisplay;
				chosenInvoiceId = targetGroup.invoice?.id;
			}
		} else if (targetHasInvoiceNum) {
			finalInvoiceNumberDisplay = targetInvoiceDisplay;
			chosenInvoiceId = targetGroup.invoice?.id;
		} else if (originHasInvoiceNum) {
			finalInvoiceNumberDisplay = originInvoiceDisplay;
			chosenInvoiceId = selectedOriginGroup.invoice?.id;
		} else {
			finalInvoiceNumberDisplay = 'Sin número fiscal asignado';
			chosenInvoiceId = targetGroup.invoice?.id;
		}
	}

	const handleIncompatibleClick = (candidate: CandidateGroupItem) => {
		const candidateHasCredit = Boolean(candidate.has_credit);
		const candidateInvoiceNum = candidate.full_invoice_number || 'sin factura fiscal asignada';
		const targetInvoiceNum = targetGroup.invoice?.full_invoice_number || targetGroup.invoice?.invoice_number || 'sin factura fiscal asignada';

		if (candidateHasCredit && !targetHasCredit) {
			toast.error(
				`Incompatibilidad de crédito y facturación: El grupo "${candidate.name}" (#${candidate.id}) es a CRÉDITO (Factura: ${candidateInvoiceNum}), mientras que el grupo destino (#${targetGroup.id}) es de ${targetGroup.invoice?.payment_type || 'contado'}. No se pueden fusionar porque si alguno de los grupos tiene un crédito asociado, ambos deben ser a crédito para poder consolidar el crédito y transferir su factura fiscal.`,
				{ duration: 7000 }
			);
		} else if (!candidateHasCredit && targetHasCredit) {
			toast.error(
				`Incompatibilidad de crédito y facturación: El grupo destino (#${targetGroup.id}) cuenta con un CRÉDITO activo (Factura: ${targetInvoiceNum}), mientras que el grupo "${candidate.name}" (#${candidate.id}) es de ${candidate.payment_type || 'contado'} (Factura: ${candidateInvoiceNum}). No se pueden fusionar porque si alguno de los grupos tiene un crédito asociado, ambos deben ser a crédito para poder consolidar sus facturas fiscales y abonos.`,
				{ duration: 7000 }
			);
		} else {
			toast.error(
				`No se pueden fusionar: El grupo "${candidate.name}" (#${candidate.id}) no cumple con los requisitos de compatibilidad de crédito o facturación con el grupo destino (#${targetGroup.id}).`,
				{ duration: 6000 }
			);
		}
	};

	const handleAttemptMerge = () => {
		if (!selectedOriginGroup) {
			toast.error('Debe seleccionar un grupo origen para fusionar.');

			return;
		}

		if (isCreditMismatch) {
			toast.error(
				targetHasCredit
					? 'No se pueden fusionar los grupos: El grupo destino tiene un crédito asociado y el grupo origen seleccionado no es a crédito. Ambos grupos deben ser a crédito para poder fusionarse.'
					: 'No se pueden fusionar los grupos: El grupo origen seleccionado tiene un crédito asociado y el grupo destino no es a crédito. Ambos grupos deben ser a crédito para poder fusionarse.'
			);

			return;
		}

		setConfirmDialogOpen(true);
	};

	const handleExecuteMerge = () => {
		if (!selectedOriginGroup) {
			toast.error('Debe seleccionar un grupo origen para fusionar.');

			return;
		}

		if (isCreditMismatch) {
			toast.error(
				targetHasCredit
					? 'No se pueden fusionar los grupos: El grupo destino tiene un crédito asociado y el grupo origen seleccionado no es a crédito. Ambos grupos deben ser a crédito para poder fusionarse.'
					: 'No se pueden fusionar los grupos: El grupo origen seleccionado tiene un crédito asociado y el grupo destino no es a crédito. Ambos grupos deben ser a crédito para poder fusionarse.'
			);

			return;
		}

		setIsSubmitting(true);
		setConfirmDialogOpen(false);

		router.post(
			mergeGroupAction(targetGroup.id).url,
			{
				origin_group_id: selectedOriginGroup.id,
				target_invoice_id: chosenInvoiceId,
				target_credit_id: chosenCreditId,
			},
			{
				preserveScroll: true,
				onSuccess: () => {
					setIsSubmitting(false);
					toast.success('Grupos de muestras fusionados con éxito.');
					onSuccess?.();
				},
				onError: (errors) => {
					setIsSubmitting(false);
					const errorMsg = Object.values(errors)[0] || 'Ocurrió un error al fusionar los grupos.';
					toast.error(String(errorMsg));
				},
			}
		);
	};

	return (
		<div className="flex flex-col gap-6 py-4 text-sm px-5" data-testid="specimen-group-merge-form">
			{/* 1. Target Group Card (Destination - Will be preserved) */}
			<div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm">
				<div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
					<div className="flex items-center gap-2">
						<span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
							🎯
						</span>
						<div>
							<span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
								Grupo Destino (Se conservará)
							</span>
							<h4 className="font-semibold text-foreground text-base">
								{targetGroup.name}
							</h4>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10">
							ID: #{targetGroup.id}
						</Badge>
						{targetHasCredit ? (
							<Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10">
								Crédito #{targetGroup.credit?.id ?? ''}
							</Badge>
						) : (
							<Badge variant="outline" className="text-muted-foreground">
								Contado / Sin crédito
							</Badge>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2 text-xs">
					<div>
						<span className="text-muted-foreground">Cliente Principal:</span>
						<p className="font-medium text-foreground">{targetGroup.customer?.name || 'Sin cliente'}</p>
					</div>
					<div>
						<span className="text-muted-foreground">Factura Actual:</span>
						<p className="font-medium text-foreground font-mono">
							{targetGroup.invoice?.full_invoice_number || targetGroup.invoice?.invoice_number || 'Sin factura fiscal asignada'}
						</p>
					</div>
					<div>
						<span className="text-muted-foreground">Monto Factura:</span>
						<p className="font-medium text-foreground">
							L. {(targetGroup.invoice?.total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
						</p>
					</div>
					{targetHasCredit && targetGroup.credit && (
						<div>
							<span className="text-muted-foreground">Saldo Pendiente:</span>
							<p className="font-medium text-amber-600 dark:text-amber-400">
								L. {(targetGroup.credit.amount_remaining ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
							</p>
						</div>
					)}
				</div>

				{/* Target Specimens Chips */}
				<div className="mt-3 pt-2 border-t border-emerald-500/10">
					<span className="text-xs text-muted-foreground font-medium">
						Muestras actuales ({targetGroup.specimens_count}):
					</span>
					<div className="mt-1.5 flex flex-wrap gap-1.5">
						{targetGroup.specimens.map((specimen) => (
							<span
								key={specimen.id}
								className="inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs font-mono border border-border/60"
							>
								<span
									className="h-2 w-2 rounded-full"
									style={{ backgroundColor: specimen.status_color || '#3b82f6' }}
								/>
								<strong>{specimen.sequence_code}</strong>
								{specimen.examination_name && (
									<span className="text-[10px] text-muted-foreground font-sans">
										({specimen.examination_name})
									</span>
								)}
							</span>
						))}
					</div>
				</div>
			</div>

			{/* 2. Candidate Selection / Search (Origin Group - Will be dissolved) */}
			{!selectedOriginGroup ? (
				<div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
					<div>
						<h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
							<Layers className="h-4 w-4 text-primary" />
							Seleccionar Grupo a Fusionar (Origen - Se disolverá)
						</h4>
						<p className="text-xs text-muted-foreground mt-0.5">
							Busque el grupo de muestras que desea incorporar dentro del grupo destino. Sus muestras se transferirán y el grupo origen se eliminará.
						</p>
					</div>

					<div className="relative">
						<Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Buscar por nombre de grupo, código de muestra (ej. B-2026), o cliente..."
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setLoadingCandidates(true);
								debouncedFetchRef.current?.(e.target.value);
							}}
							className="pl-9 text-xs"
						/>
						{loadingCandidates && (
							<Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
						)}
					</div>

					{/* Candidates List */}
					<div className="space-y-2 max-h-72 overflow-y-auto pr-1">
						{loadingCandidates && candidates.length === 0 ? (
							<div className="flex items-center justify-center p-6 text-xs text-muted-foreground gap-2">
								<Loader2 className="h-4 w-4 animate-spin" />
								Buscando grupos disponibles...
							</div>
						) : candidates.length === 0 ? (
							<div className="rounded-lg border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
								No se encontraron otros grupos de muestras disponibles para fusionar.
							</div>
						) : (
							candidates.map((candidate) => {
								const isCompatible = candidate.is_compatible !== undefined
									? candidate.is_compatible
									: (targetHasCredit === Boolean(candidate.has_credit));

								return (
									<div
										key={candidate.id}
										className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3 transition-all cursor-pointer ${
											!isCompatible
												? 'border-border/50 bg-muted/10 hover:border-destructive/40 hover:bg-destructive/5'
												: 'border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
										}`}
										onClick={() => {
											if (!isCompatible) {
												handleIncompatibleClick(candidate);
											} else {
												handleSelectCandidate(candidate.id);
											}
										}}
									>
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<span className="font-semibold text-foreground text-xs">
													{candidate.name}
												</span>
												<Badge variant="secondary" className="text-[10px] px-1.5 py-0">
													#{candidate.id}
												</Badge>
												<Badge variant="outline" className="text-[10px] px-1.5 py-0">
													{candidate.specimens_count} {candidate.specimens_count === 1 ? 'Muestra' : 'Muestras'}
												</Badge>
												{candidate.has_credit ? (
													<Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10">
														Crédito
													</Badge>
												) : (
													<Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
														{candidate.payment_type || 'Contado'}
													</Badge>
												)}
											</div>
											<div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
												<span>Cliente: <strong>{candidate.customer_name}</strong></span>
												<span>
													Factura: <strong className="font-mono">{candidate.full_invoice_number || 'Sin factura'}</strong>
												</span>
												<span>Total: <strong>L. {candidate.total.toFixed(2)}</strong></span>
											</div>
											{candidate.specimen_codes.length > 0 && (
												<div className="flex flex-wrap gap-1 pt-1">
													{candidate.specimen_codes.slice(0, 4).map((code) => (
														<span
															key={code}
															className="rounded bg-background px-1.5 py-0.5 text-[10px] font-mono border border-border/60"
														>
															{code}
														</span>
													))}
													{candidate.specimen_codes.length > 4 && (
														<span className="text-[10px] text-muted-foreground self-center">
															+{candidate.specimen_codes.length - 4} más
														</span>
													)}
												</div>
											)}
										</div>

										<Button
											size="sm"
											variant="outline"
											className={`shrink-0 text-xs self-start sm:self-center cursor-pointer transition-colors ${
												!isCompatible
													? 'border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/15 hover:border-destructive/50'
													: ''
											}`}
											disabled={loadingOriginDetails && selectedCandidateId === candidate.id}
											onClick={(e) => {
												e.stopPropagation();

												if (!isCompatible) {
													handleIncompatibleClick(candidate);
												} else {
													handleSelectCandidate(candidate.id);
												}
											}}
										>
											{!isCompatible ? (
												'Incompatible'
											) : loadingOriginDetails && selectedCandidateId === candidate.id ? (
												<>
													<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
													Cargando...
												</>
											) : (
												<>
													Seleccionar
													<ArrowRight className="ml-1 h-3.5 w-3.5" />
												</>
											)}
										</Button>
									</div>
								);
							})
						)}
					</div>
				</div>
			) : (
				/* Selected Origin Group Card */
				<div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 shadow-sm relative">
					<button
						type="button"
						onClick={handleClearSelectedOrigin}
						className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
						title="Cambiar grupo origen"
					>
						<X className="h-4 w-4" />
					</button>

					<div className="flex flex-wrap items-center gap-2 border-b border-destructive/20 pb-3 pr-8">
						<span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/20 text-destructive font-semibold text-xs">
							⚠️
						</span>
						<div>
							<span className="text-xs font-semibold uppercase tracking-wider text-destructive">
								Grupo Origen (Será disuelto y eliminado)
							</span>
							<h4 className="font-semibold text-foreground text-base">
								{selectedOriginGroup.name}
							</h4>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10">
								ID: #{selectedOriginGroup.id}
							</Badge>
							{originHasCredit ? (
								<Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10">
									Crédito #{selectedOriginGroup.credit?.id ?? ''}
								</Badge>
							) : (
								<Badge variant="outline" className="text-muted-foreground">
									Contado / Sin crédito
								</Badge>
							)}
						</div>
					</div>

					<div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2 text-xs">
						<div>
							<span className="text-muted-foreground">Cliente Principal:</span>
							<p className="font-medium text-foreground">{selectedOriginGroup.customer?.name || 'Sin cliente'}</p>
						</div>
						<div>
							<span className="text-muted-foreground">Factura Actual:</span>
							<p className="font-medium text-foreground font-mono">
								{selectedOriginGroup.invoice?.full_invoice_number || selectedOriginGroup.invoice?.invoice_number || 'Sin factura fiscal asignada'}
							</p>
						</div>
						<div>
							<span className="text-muted-foreground">Monto Factura:</span>
							<p className="font-medium text-foreground">
								L. {(selectedOriginGroup.invoice?.total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
							</p>
						</div>
						{originHasCredit && selectedOriginGroup.credit && (
							<div>
								<span className="text-muted-foreground">Saldo Pendiente:</span>
								<p className="font-medium text-amber-600 dark:text-amber-400">
									L. {(selectedOriginGroup.credit.amount_remaining ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
								</p>
							</div>
						)}
					</div>

					{/* Muestras que se transferirán */}
					<div className="mt-3 pt-2 border-t border-destructive/10">
						<span className="text-xs text-destructive font-medium flex items-center gap-1.5">
							<FolderMinus className="h-3.5 w-3.5" />
							Muestras que se transferirán al grupo destino ({selectedOriginGroup.specimens_count}):
						</span>
						<div className="mt-1.5 flex flex-wrap gap-1.5">
							{selectedOriginGroup.specimens.map((specimen) => (
								<span
									key={specimen.id}
									className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs font-mono border border-destructive/30 text-foreground"
								>
									<span
										className="h-2 w-2 rounded-full"
										style={{ backgroundColor: specimen.status_color || '#ef4444' }}
									/>
									<strong>{specimen.sequence_code}</strong>
									{specimen.examination_name && (
										<span className="text-[10px] text-muted-foreground font-sans">
											({specimen.examination_name})
										</span>
									)}
								</span>
							))}
						</div>
					</div>
				</div>
			)}

			{/* Restriction Error Callout: Credit Mismatch */}
			{isCreditMismatch && (
				<div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs flex items-start gap-3">
					<AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
					<div className="space-y-1">
						<h5 className="font-semibold text-destructive text-sm">
							Restricción: Incompatibilidad de Tipo de Pago (Crédito)
						</h5>
						<p className="text-destructive/90">
							{targetHasCredit
								? 'El grupo destino cuenta con crédito asociado, pero el grupo origen seleccionado no es a crédito. Si alguno de los grupos tiene un crédito asociado, ambos deben ser a crédito para poder fusionarse.'
								: 'El grupo origen seleccionado cuenta con crédito asociado, pero el grupo destino no es a crédito. Si alguno de los grupos tiene un crédito asociado, ambos deben ser a crédito para poder fusionarse.'}
						</p>
						<p className="text-muted-foreground pt-1">
							Por favor, elija un grupo origen compatible que cumpla con la restricción de crédito para poder proceder.
						</p>
					</div>
				</div>
			)}

			{/* 3. Invoice Resolution (Only when origin group is selected and no credit mismatch) */}
			{selectedOriginGroup && !isCreditMismatch && (
				<div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
					<div className="flex items-center gap-2">
						<FileText className="h-4 w-4 text-primary" />
						<h4 className="font-semibold text-foreground text-sm">
							Resolución de Número de Factura
						</h4>
					</div>

					{/* Case 1: Both have invoice numbers */}
					{bothHaveInvoiceNum && (
						<div className="space-y-3">
							<p className="text-xs text-muted-foreground">
								Ambos grupos cuentan con número de factura fiscal asignado. Seleccione cuál número desea conservar para el grupo resultante. La otra factura quedará vacía y se eliminará:
							</p>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
								{/* Option A: Keep Target Invoice */}
								<div
									onClick={() => setSelectedInvoiceToKeep('target')}
									className={`cursor-pointer rounded-lg border p-3 transition-all ${
										selectedInvoiceToKeep === 'target'
											? 'border-primary bg-primary/5 ring-1 ring-primary'
											: 'border-border/70 bg-muted/20 hover:border-border'
									}`}
								>
									<div className="flex items-start justify-between">
										<div className="space-y-1">
											<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
												Factura de Grupo Destino
											</span>
											<p className="font-mono font-bold text-foreground text-sm">
												{targetInvoiceDisplay}
											</p>
											<p className="text-[11px] text-muted-foreground">
												Se conservará como factura final.
											</p>
										</div>
										<div className={`flex h-5 w-5 items-center justify-center rounded-full border ${
											selectedInvoiceToKeep === 'target'
												? 'border-primary bg-primary text-primary-foreground'
												: 'border-muted-foreground/40'
										}`}>
											{selectedInvoiceToKeep === 'target' && <Check className="h-3 w-3" />}
										</div>
									</div>
								</div>

								{/* Option B: Keep Origin Invoice */}
								<div
									onClick={() => setSelectedInvoiceToKeep('origin')}
									className={`cursor-pointer rounded-lg border p-3 transition-all ${
										selectedInvoiceToKeep === 'origin'
											? 'border-primary bg-primary/5 ring-1 ring-primary'
											: 'border-border/70 bg-muted/20 hover:border-border'
									}`}
								>
									<div className="flex items-start justify-between">
										<div className="space-y-1">
											<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
												Factura de Grupo Origen
											</span>
											<p className="font-mono font-bold text-foreground text-sm">
												{originInvoiceDisplay}
											</p>
											<p className="text-[11px] text-muted-foreground">
												Se transferirá y conservará como factura final.
											</p>
										</div>
										<div className={`flex h-5 w-5 items-center justify-center rounded-full border ${
											selectedInvoiceToKeep === 'origin'
												? 'border-primary bg-primary text-primary-foreground'
												: 'border-muted-foreground/40'
										}`}>
											{selectedInvoiceToKeep === 'origin' && <Check className="h-3 w-3" />}
										</div>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Case 2: Only one has invoice number */}
					{onlyOneHasInvoiceNum && (
						<div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-xs flex items-start gap-2.5">
							<CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
							<div className="space-y-1">
								<span className="font-semibold text-foreground">
									Factura asignada automáticamente:
								</span>
								<p className="text-muted-foreground">
									Únicamente uno de los grupos cuenta con número fiscal asignado (
									<strong className="font-mono text-foreground font-bold">
										{targetHasInvoiceNum ? targetInvoiceDisplay : originInvoiceDisplay}
									</strong>
									). Este número se mantendrá automáticamente como la factura final del grupo resultante, y la factura vacía será eliminada.
								</p>
							</div>
						</div>
					)}

					{/* Case 3: Neither has invoice number */}
					{neitherHasInvoiceNum && (
						<div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
							<span>ℹ️</span>
							<span>
								Ninguno de los grupos tiene asignado un número de factura fiscal. El grupo resultante continuará sin número fiscal asignado.
							</span>
						</div>
					)}
				</div>
			)}

			{/* 3b. Credit Resolution (Only when origin group is selected, both have credits, and no mismatch) */}
			{selectedOriginGroup && !isCreditMismatch && bothHaveCredit && targetGroup.credit && selectedOriginGroup.credit && (
				<div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
					<div className="flex items-center gap-2">
						<CreditCard className="h-4 w-4 text-primary" />
						<h4 className="font-semibold text-foreground text-sm">
							Resolución de Crédito a Conservar
						</h4>
					</div>

					<p className="text-xs text-muted-foreground">
						Ambos grupos cuentan con crédito activo. Seleccione cuál registro de crédito desea conservar. El crédito seleccionado consolidará el monto total y los abonos de ambos grupos, mientras que el otro crédito será disuelto y eliminado:
					</p>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
						{/* Option A: Keep Target Credit */}
						<div
							onClick={() => setSelectedCreditToKeep('target')}
							className={`cursor-pointer rounded-lg border p-3 transition-all ${
								selectedCreditToKeep === 'target'
									? 'border-primary bg-primary/5 ring-1 ring-primary'
									: 'border-border/70 bg-muted/20 hover:border-border'
							}`}
						>
							<div className="flex items-start justify-between">
								<div className="space-y-1">
									<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
										Crédito de Grupo Destino
									</span>
									<div className="flex items-center gap-2">
										<p className="font-mono font-bold text-foreground text-sm">
											Crédito #{targetGroup.credit.id}
										</p>
										<Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/40 text-emerald-600 bg-emerald-500/10">
											Destino
										</Badge>
									</div>
									<div className="text-[11px] text-muted-foreground space-y-0.5 pt-1">
										<div>Monto original: <span className="font-medium text-foreground">L. {targetGroup.credit.credit_amount.toFixed(2)}</span></div>
										<div>Abonos previos: <span className="font-medium text-emerald-600">L. {targetGroup.credit.amount_paid.toFixed(2)}</span></div>
										<div>Saldo pendiente: <span className="font-medium text-amber-600">L. {targetGroup.credit.amount_remaining.toFixed(2)}</span></div>
									</div>
									<p className="text-[11px] text-primary/80 pt-1 font-medium">
										Se conservará este registro. El crédito #{selectedOriginGroup.credit.id} será disuelto.
									</p>
								</div>
								<div className={`flex h-5 w-5 items-center justify-center rounded-full border ${
									selectedCreditToKeep === 'target'
										? 'border-primary bg-primary text-primary-foreground'
										: 'border-muted-foreground/40'
								}`}>
									{selectedCreditToKeep === 'target' && <Check className="h-3 w-3" />}
								</div>
							</div>
						</div>

						{/* Option B: Keep Origin Credit */}
						<div
							onClick={() => setSelectedCreditToKeep('origin')}
							className={`cursor-pointer rounded-lg border p-3 transition-all ${
								selectedCreditToKeep === 'origin'
									? 'border-primary bg-primary/5 ring-1 ring-primary'
									: 'border-border/70 bg-muted/20 hover:border-border'
							}`}
						>
							<div className="flex items-start justify-between">
								<div className="space-y-1">
									<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
										Crédito de Grupo Origen
									</span>
									<div className="flex items-center gap-2">
										<p className="font-mono font-bold text-foreground text-sm">
											Crédito #{selectedOriginGroup.credit.id}
										</p>
										<Badge variant="outline" className="text-[10px] px-1.5 py-0 border-destructive/40 text-destructive bg-destructive/10">
											Origen
										</Badge>
									</div>
									<div className="text-[11px] text-muted-foreground space-y-0.5 pt-1">
										<div>Monto original: <span className="font-medium text-foreground">L. {selectedOriginGroup.credit.credit_amount.toFixed(2)}</span></div>
										<div>Abonos previos: <span className="font-medium text-emerald-600">L. {selectedOriginGroup.credit.amount_paid.toFixed(2)}</span></div>
										<div>Saldo pendiente: <span className="font-medium text-amber-600">L. {selectedOriginGroup.credit.amount_remaining.toFixed(2)}</span></div>
									</div>
									<p className="text-[11px] text-primary/80 pt-1 font-medium">
										Se transferirá y conservará este crédito. El crédito #{targetGroup.credit.id} será disuelto.
									</p>
								</div>
								<div className={`flex h-5 w-5 items-center justify-center rounded-full border ${
									selectedCreditToKeep === 'origin'
										? 'border-primary bg-primary text-primary-foreground'
										: 'border-muted-foreground/40'
								}`}>
									{selectedCreditToKeep === 'origin' && <Check className="h-3 w-3" />}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* 4. Resulting Group Summary Preview (Only when no credit mismatch) */}
			{selectedOriginGroup && !isCreditMismatch && (
				<div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm space-y-4">
					<div className="flex items-center justify-between border-b border-primary/20 pb-3">
						<div className="flex items-center gap-2">
							<GitMerge className="h-5 w-5 text-primary" />
							<div>
								<span className="text-xs font-semibold uppercase tracking-wider text-primary">
									Resultado Tras la Fusión
								</span>
								<h4 className="font-bold text-foreground text-base">
									{resultingGroupName}
								</h4>
							</div>
						</div>
						<Badge variant="default" className="text-xs">
							{resultingCount} Muestras Totales
						</Badge>
					</div>

					<div className={`grid grid-cols-1 sm:grid-cols-2 ${bothHaveCredit ? 'lg:grid-cols-4' : 'sm:grid-cols-3'} gap-3 text-xs`}>
						<div className="rounded-lg bg-background/80 p-2.5 border border-border/50">
							<span className="text-muted-foreground text-[11px]">Factura Resultante:</span>
							<p className="font-mono font-bold text-foreground mt-0.5">
								{finalInvoiceNumberDisplay}
							</p>
						</div>
						<div className="rounded-lg bg-background/80 p-2.5 border border-border/50">
							<span className="text-muted-foreground text-[11px]">Monto Total Consolidado:</span>
							<p className="font-bold text-foreground mt-0.5">
								L. {combinedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
							</p>
						</div>
						{bothHaveCredit && (
							<>
								<div className="rounded-lg bg-background/80 p-2.5 border border-border/50">
									<span className="text-muted-foreground text-[11px]">Crédito Conservado:</span>
									<p className="font-mono font-bold text-foreground mt-0.5 flex items-center gap-1.5">
										<span>Crédito #{chosenCreditId}</span>
										<Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-600">
											Conservado
										</Badge>
									</p>
									<span className="text-[10px] text-muted-foreground">
										Crédito #{dissolvedCreditId} será disuelto
									</span>
								</div>
								<div className="rounded-lg bg-background/80 p-2.5 border border-border/50">
									<span className="text-muted-foreground text-[11px]">Saldo Pendiente Consolidado:</span>
									<p className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">
										L. {combinedRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
									</p>
									<span className="text-[10px] text-muted-foreground">
										Abonos combinados: L. {combinedPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
									</span>
								</div>
							</>
						)}
						{!bothHaveCredit && combinedRemaining > 0 && (
							<div className="rounded-lg bg-background/80 p-2.5 border border-border/50">
								<span className="text-muted-foreground text-[11px]">Saldo Pendiente:</span>
								<p className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">
									L. {combinedRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
								</p>
							</div>
						)}
					</div>

					{/* Warning & Destruction Note */}
					<div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
						<AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
						<div className="space-y-1">
							<div>
								<strong>Acción Permanente:</strong> Las {selectedOriginGroup.specimens_count} muestra(s) del grupo origen (#{selectedOriginGroup.id}) se transferirán al grupo destino (#{targetGroup.id}). El grupo origen y su factura vacía se eliminarán permanentemente.
							</div>
							{bothHaveCredit && (
								<div className="text-[11px] text-amber-800 dark:text-amber-300">
									• Se conservará el <strong>Crédito #{chosenCreditId}</strong> con todos los abonos consolidados y se eliminará el <strong>Crédito #{dissolvedCreditId}</strong>.
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Bottom Form Actions */}
			<div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isSubmitting}
				>
					Cancelar
				</Button>
				<Button
					type="button"
					onClick={handleAttemptMerge}
					disabled={!selectedOriginGroup || isSubmitting}
					className="gap-2"
				>
					{isSubmitting ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" />
							Fusionando Grupos...
						</>
					) : (
						<>
							<GitMerge className="h-4 w-4" />
							Confirmar y Fusionar
						</>
					)}
				</Button>
			</div>

			{/* Confirmation Alert Dialog */}
			<AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5 text-amber-500" />
							¿Desea fusionar estos grupos de muestras?
						</AlertDialogTitle>
						<AlertDialogDescription className="space-y-2 pt-2 text-xs">
							<p>
								Se moverán todas las muestras del grupo <strong>{selectedOriginGroup?.name}</strong> al grupo destino <strong>{targetGroup.name}</strong>.
							</p>
							<p>
								La factura resultante asignada será <strong>{finalInvoiceNumberDisplay}</strong>. El grupo origen y su factura vacía quedarán eliminados.
							</p>
							{bothHaveCredit && (
								<p>
									Se conservará el <strong>Crédito #{chosenCreditId}</strong> (con saldo pendiente consolidado de L. {combinedRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}). El <strong>Crédito #{dissolvedCreditId}</strong> será disuelto y eliminado.
								</p>
							)}
							<p className="font-semibold text-foreground">
								¿Desea proceder con la fusión?
							</p>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleExecuteMerge}
							disabled={isSubmitting}
							className="bg-primary text-primary-foreground hover:bg-primary/90"
						>
							{isSubmitting ? 'Procesando...' : 'Sí, fusionar grupos'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
