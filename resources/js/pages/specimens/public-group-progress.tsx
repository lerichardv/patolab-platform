import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
	Microscope,
	Layers,
	ExternalLink,
	ShieldAlert,
	User,
	Tag,
	Clock,
	ArrowRight,
	AlertCircle,
	FileText,
	ChevronDown,
	CheckCircle2,
	Loader2,
	AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import GuestLayout from '@/layouts/guest-layout';

interface Props {
	group: any;
}

const STATUS_LABELS: Record<string, string> = {
	'received': 'Recibida',
	'macroscopic_review': 'Rev. Macroscópica',
	'processing': 'En Procesamiento',
	'microscopic_review': 'Rev. Microscópica',
	'finalized': 'Finalizada',
	'delivered': 'Entregada',
	'cancelled': 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
	'received': '#3b82f6',           // blue-500
	'macroscopic_review': '#8b5cf6', // violet-500
	'processing': '#f59e0b',         // amber-500
	'microscopic_review': '#d946ef', // fuchsia-500
	'finalized': '#10b981',          // emerald-500
	'delivered': '#64748b',          // slate-500
	'cancelled': '#ef4444',          // red-500
};

const STATUS_STEPS = [
	{ key: 'received', label: 'Recibida', desc: 'Muestra ingresada en el sistema.' },
	{ key: 'macroscopic_review', label: 'Rev. Macroscópica', desc: 'Análisis físico y macroscópico de la muestra.' },
	{ key: 'processing', label: 'En procesamiento', desc: 'Procesamiento en laboratorio.' },
	{ key: 'microscopic_review', label: 'Rev. Microscópica', desc: 'Análisis microscópico por patólogo.' },
	{ key: 'finalized', label: 'Finalizada', desc: 'Diagnóstico concluido y reporte firmado.' },
	{ key: 'delivered', label: 'Entregada', desc: 'El reporte físico o digital fue entregado al paciente.' }
];

export default function PublicGroupProgress({ group }: Props) {
	const [expandedSpecimens, setExpandedSpecimens] = React.useState<Record<number, boolean>>({});

	const toggleTimeline = (specimenId: number) => {
		setExpandedSpecimens(prev => ({
			...prev,
			[specimenId]: !prev[specimenId]
		}));
	};

	if (!group) {
		return (
			<GuestLayout showLogo={true} title="Error">
				<Card className="max-w-md w-full border-destructive/20 shadow-lg bg-card/60 backdrop-blur-md">
					<CardContent className="pt-6 text-center space-y-4">
						<ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
						<h1 className="text-xl font-bold text-destructive">Error</h1>
						<p className="text-sm text-muted-foreground">Grupo de muestras no encontrado o enlace inválido.</p>
					</CardContent>
				</Card>
			</GuestLayout>
		);
	}

	const specimens = group.specimens || [];
	const formattedDate = group.created_at
		? format(new Date(group.created_at), "dd 'de' MMMM, yyyy - HH:mm", { locale: es })
		: 'N/A';

	return (
		<GuestLayout showLogo={true} title={group.name}>
			<Head title={`Progreso del Grupo ${group.name}`} />
			<div className="max-w-4xl w-full space-y-6">
				{/* Group Hero Card */}
				<Card className="overflow-hidden border-border/50 shadow-xl bg-card/60 backdrop-blur-md animate-in fade-in-50 duration-300">
					<div className="h-[4px] w-full bg-gradient-to-r from-violet-600 via-primary to-blue-600" />
					<CardHeader className="pb-4">
						<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
							<div className="space-y-1">
								<CardTitle className="text-2xl font-bold flex items-center gap-2">
									<Layers className="w-6 h-6 text-primary" /> Progreso de Grupo - {group.name}
								</CardTitle>
								<p className="text-sm text-muted-foreground">
									Registrado el {formattedDate}
								</p>
							</div>
							<div>
								<Badge className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-1 px-3 font-semibold">
									Grupo de Muestras
								</Badge>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Group Info Grid */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/40">
							<div className="space-y-1">
								<span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
									<User className="w-3.5 h-3.5" /> Cliente de Facturación
								</span>
								<p className="text-sm font-semibold text-foreground">{group.customer?.name || group.invoice?.customer?.name || 'N/A'}</p>
							</div>
							<div className="space-y-1">
								<span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
									<Microscope className="w-3.5 h-3.5" /> Muestras Agrupadas
								</span>
								<p className="text-sm font-semibold text-foreground">{specimens.length} Muestras</p>
							</div>
						</div>

						<Separator className="bg-border/40" />

						{/* Title */}
						<div className="space-y-4">
							<h3 className="text-base font-semibold flex items-center gap-2">
								<Clock className="w-4 h-4 text-primary" /> Lista de Muestras del Grupo
							</h3>

							{/* Specimen Cards list */}
							<div className="space-y-4">
								{specimens.map((specimen: any) => {
									const isCancelled = specimen.status === 'cancelled';
									return (
										<div
											key={specimen.id}
											className="relative overflow-hidden border border-border/40 shadow-sm bg-card/45 hover:bg-card/85 hover:border-primary/25 rounded-xl p-4 md:pl-6 transition-all duration-300 flex flex-col gap-4 cursor-pointer"
											onClick={() => toggleTimeline(specimen.id)}
										>
											{/* Left status vertical indicator */}
											<div
												className="absolute left-0 top-0 bottom-0 w-[4px]"
												style={{
													backgroundImage: isCancelled
														? 'linear-gradient(to bottom, #ef4444, #f43f5e)'
														: specimen.status === 'received' ? 'linear-gradient(to bottom, #3b82f6, #6366f1)'
															: specimen.status === 'macroscopic_review' ? 'linear-gradient(to bottom, #8b5cf6, #a855f7)'
																: specimen.status === 'processing' ? 'linear-gradient(to bottom, #f59e0b, #eab308)'
																	: specimen.status === 'microscopic_review' ? 'linear-gradient(to bottom, #d946ef, #ec4899)'
																		: specimen.status === 'finalized' ? 'linear-gradient(to bottom, #10b981, #14b8a6)'
																			: specimen.status === 'delivered' ? 'linear-gradient(to bottom, #64748b, #94a3b8)'
																				: 'linear-gradient(to bottom, #cbd5e1, #e2e8f0)'
												}}
											/>

											{/* Specimen main details row */}
											<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
												{/* Specimen Info */}
												<div className="space-y-2.5 flex-1">
													<div className="flex flex-wrap items-center gap-2">
														{specimen.sequence_code && (
															<span className="font-mono font-bold text-primary text-xs bg-primary/5 border border-primary/20 px-2 py-0.5 rounded">
																{specimen.sequence_code}
															</span>
														)}

														{/* Status interactive click handler */}
														<div
															className="flex items-center gap-1.5 select-none group/badge"
															title="Haga clic para ver todo el proceso"
														>
															<Badge
																className="text-white text-[10px] font-semibold py-0.5 px-2 hover:opacity-90 transition-opacity"
																style={{
																	backgroundColor: STATUS_COLORS[specimen.status] || '#cbd5e1'
																}}
															>
																{STATUS_LABELS[specimen.status] || specimen.status}
															</Badge>
															<ChevronDown
																className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${expandedSpecimens[specimen.id] ? 'rotate-180 text-primary' : 'group-hover/badge:text-foreground'}`}
															/>
														</div>

														{specimen.priority && (
															<div className="flex items-center gap-1.5 ml-1">
																<div
																	className="w-1.5 h-1.5 rounded-full"
																	style={{ backgroundColor: specimen.priority.color }}
																/>
																<span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
																	{specimen.priority.name}
																</span>
															</div>
														)}
													</div>

													<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
														<div className="space-y-0.5">
															<span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 flex items-center gap-1">
																<User className="w-3 h-3" /> Paciente
															</span>
															<p className="font-semibold text-foreground">{specimen.customer_relation?.name || 'N/A'}</p>
														</div>
														<div className="space-y-0.5">
															<span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 flex items-center gap-1">
																<Tag className="w-3 h-3" /> Examen Solicitado
															</span>
															<p className="font-semibold text-foreground">
																{specimen.type?.name} - {specimen.examination?.name}
															</p>
														</div>
													</div>
												</div>

												{/* Link to detail */}
												<div className="shrink-0 flex items-center mt-2 md:mt-0" onClick={(e) => e.stopPropagation()}>
													<Button
														asChild
														variant="outline"
														size="sm"
														className="w-full md:w-auto h-8 text-xs font-semibold gap-1.5 hover:bg-primary hover:text-primary-foreground hover:border-transparent transition-all"
													>
														<a
															href={`/specimen/${specimen.sequence_code}?token=${specimen.access_token}`}
															target="_blank"
															rel="noopener noreferrer"
														>
															Ver muestra individual <ArrowRight className="w-3.5 h-3.5" />
														</a>
													</Button>
												</div>
											</div>

											{/* Collapsible Timeline Progress */}
											{expandedSpecimens[specimen.id] && (
												<div
													className="border-t border-border/40 pt-4 mt-1 animate-in slide-in-from-top-3 duration-250 w-full space-y-4"
													onClick={(e) => e.stopPropagation()}
												>
													{isCancelled ? (
														<div className="flex flex-col items-center justify-center py-4 text-center space-y-2 border border-red-500/20 bg-red-500/5 rounded-xl">
															<AlertTriangle className="w-8 h-8 text-red-500" />
															<h4 className="text-xs font-bold text-red-700 dark:text-red-400">Análisis Cancelado</h4>
															<p className="text-[11px] text-muted-foreground max-w-sm">
																Este análisis de muestra ha sido cancelado. Por favor, póngase en contacto con el laboratorio para más información.
															</p>
														</div>
													) : (
														<div className="space-y-4 pl-2">
															<h4 className="text-xs font-bold flex items-center gap-1.5 text-foreground/80">
																<Clock className="w-3.5 h-3.5 text-primary" /> Historial de Progreso de {specimen.sequence_code}
															</h4>

															<div className="relative pl-6 space-y-5 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-border/60">
																{STATUS_STEPS.map((step, idx) => {
																	const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === specimen.status);
																	const isPastStep = idx < currentStepIndex;
																	const isCurrentStep = idx === currentStepIndex;

																	return (
																		<div key={step.key} className="relative group">
																			{/* Step Node Icon/Indicator */}
																			<div className={`absolute -left-[23px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center z-10 transition-all duration-300 border ${isPastStep
																				? 'bg-emerald-50 border-emerald-600 text-white shadow-sm'
																				: isCurrentStep
																					? 'bg-blue-600 border-blue-700 text-white ring-4 ring-blue-500/20 shadow-md scale-110'
																					: 'bg-background border-border text-muted-foreground'
																				}`}>
																				{isPastStep ? (
																					<CheckCircle2 className="w-3 h-3 text-emerald-600 stroke-[3]" />
																				) : isCurrentStep ? (
																					<Loader2 className="w-2.5 h-2.5 animate-spin" />
																				) : (
																					<span className="text-[9px] font-semibold">{idx + 1}</span>
																				)}
																			</div>

																			{/* Step Content */}
																			<div className={`transition-all duration-200 ${isCurrentStep ? 'opacity-100 translate-x-0.5' : isPastStep ? 'opacity-80' : 'opacity-40'
																				}`}>
																				<h5 className="text-xs font-bold flex items-center gap-1.5">
																					{step.label}
																					{isCurrentStep && (
																						<span className="text-[9px] px-1.5 py-0.2 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider rounded border border-blue-500/20">
																							Actual
																						</span>
																					)}
																				</h5>
																				<p className="text-[10px] text-muted-foreground mt-0.5">
																					{step.desc}
																				</p>
																			</div>
																		</div>
																	);
																})}
															</div>
														</div>
													)}
												</div>
											)}
										</div>
									);
								})}

								{specimens.length === 0 && (
									<div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl bg-muted/10">
										<Microscope className="w-10 h-10 mx-auto mb-2 text-muted-foreground/45 animate-pulse" />
										<p className="text-sm font-medium">No hay muestras registradas en este grupo.</p>
									</div>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</GuestLayout>
	);
}
