import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import HeadingSheet from '@/components/heading-sheet';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { User, Trash2, Microscope, UserPlus, Tag, AlertCircle } from 'lucide-react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';

interface Props {
	selectedSpecimens: any[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pathologists: any[];
	onSuccess?: () => void;
}

export default function SpecimenBulkPathologistSheet({
	selectedSpecimens = [],
	open,
	onOpenChange,
	pathologists = [],
	onSuccess,
}: Props) {
	const [selectedPathologistId, setSelectedPathologistId] = useState<string>('');

	const specimenIds = useMemo(() => {
		return selectedSpecimens.map((s) => s.id);
	}, [selectedSpecimens]);

	// Pathologists that are assigned to at least one of the selected specimens
	const assignedPathologists = useMemo(() => {
		const assignedIds = new Set<number>();
		selectedSpecimens.forEach((specimen) => {
			specimen.users?.forEach((u: any) => {
				assignedIds.add(u.id);
			});
		});
		return pathologists.filter((p) => assignedIds.has(p.id));
	}, [pathologists, selectedSpecimens]);

	// Pathologists that are NOT assigned to all of the selected specimens
	const availablePathologists = useMemo(() => {
		return pathologists.filter((p) => {
			// If not assigned to at least one specimen, or if we want to show it to add to the rest
			// Let's show all pathologists that are not already assigned to *every* selected specimen
			const assignedCount = selectedSpecimens.filter((specimen) =>
				specimen.users?.some((u: any) => u.id === p.id)
			).length;
			return assignedCount < selectedSpecimens.length;
		});
	}, [pathologists, selectedSpecimens]);

	const handleAssign = (userId: string) => {
		if (!userId || specimenIds.length === 0) return;

		router.post(
			'/specimens/bulk-action',
			{
				ids: specimenIds,
				action: 'assign_pathologist',
				value: userId,
			},
			{
				preserveScroll: true,
				preserveState: true,
				onSuccess: () => {
					toast.success('Patólogo asignado en lote correctamente');
					setSelectedPathologistId('');
					if (onSuccess) onSuccess();
				},
				onError: (errors) => {
					const message = Object.values(errors)[0] || 'Error al asignar patólogo en lote';
					toast.error(message);
				},
			}
		);
	};

	const handleUnassign = (userId: number) => {
		if (specimenIds.length === 0) return;

		router.post(
			'/specimens/bulk-action',
			{
				ids: specimenIds,
				action: 'unassign_pathologist',
				value: userId,
			},
			{
				preserveScroll: true,
				preserveState: true,
				onSuccess: () => {
					toast.success('Patólogo desasignado en lote correctamente');
					if (onSuccess) onSuccess();
				},
				onError: (errors) => {
					const message = Object.values(errors)[0] || 'Error al desasignar patólogo en lote';
					toast.error(message);
				},
			}
		);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				className="w-full sm:max-w-[90vw] md:max-w-[650px] lg:max-w-[750px] overflow-y-auto"
			>
				{/* Header */}
				<div className="border-b pb-4 pr-12">
					<HeadingSheet
						title="Asignar Patólogo en Bulk"
						description="Asigne o desasigne patólogos en lote para las muestras seleccionadas."
					/>
				</div>

				<div className="flex flex-col gap-6 h-full pb-8 pr-2 px-5 mt-4">
					{/* Selected Specimens Summary */}
					<div className="bg-muted/30 border border-border/80 rounded-lg p-5 space-y-4 shadow-sm">
						<h3 className="text-sm font-semibold text-primary flex items-center gap-2 uppercase tracking-wider">
							<Microscope className="w-4 h-4 text-primary" /> Muestras Seleccionadas ({selectedSpecimens.length})
						</h3>
						<Separator className="opacity-60" />

						<div className="max-h-[150px] overflow-y-auto space-y-2 pr-2">
							{selectedSpecimens.map((specimen) => (
								<div key={specimen.id} className="flex justify-between items-center text-sm border-b border-border/40 pb-1.5 last:border-0 last:pb-0">
									<div className="flex items-center gap-2">
										<span className="font-mono font-bold text-xs bg-primary/5 text-primary border border-primary/20 px-1.5 py-0.5 rounded">
											{specimen.sequence_code || `#${specimen.id}`}
										</span>
										<span className="font-medium text-foreground">
											{specimen.customer_relation?.name || 'Paciente N/A'}
										</span>
									</div>
									<span className="text-xs text-muted-foreground">
										{specimen.type?.name}
									</span>
								</div>
							))}
						</div>
					</div>

					{/* Adder Dropdown */}
					<div className="space-y-2.5">
						<label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
							<UserPlus className="w-4 h-4 text-primary" /> Asignar Nuevo Patólogo
						</label>
						{availablePathologists.length > 0 ? (
							<Select
								value={selectedPathologistId}
								onValueChange={(val) => {
									setSelectedPathologistId(val);
									handleAssign(val);
								}}
							>
								<SelectTrigger className="w-full h-11">
									<SelectValue placeholder="Seleccione un patólogo para asignar a las muestras..." />
								</SelectTrigger>
								<SelectContent>
									{availablePathologists.map((p) => (
										<SelectItem key={p.id} value={p.id.toString()}>
											{p.name} ({p.email})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : (
							<div className="text-xs text-muted-foreground bg-muted/40 border border-dashed rounded-md p-3.5 text-center">
								Todos los patólogos disponibles ya están asignados a todas las muestras seleccionadas.
							</div>
						)}
					</div>

					{/* Assigned Pathologists List Table */}
					<div className="space-y-2.5 flex-1 flex flex-col min-h-0">
						<label className="text-sm font-semibold text-foreground">
							Patólogos Asignados (a una o más de las muestras seleccionadas)
						</label>
						<div className="border border-border/80 rounded-lg overflow-hidden bg-card shadow-sm flex-1 min-h-[180px]">
							{assignedPathologists.length > 0 ? (
								<div className="overflow-x-auto w-full">
									<table className="w-full border-collapse text-left text-sm">
										<thead>
											<tr className="bg-muted/50 border-b text-xs text-muted-foreground font-semibold uppercase tracking-wider">
												<th className="p-3.5">Nombre</th>
												<th className="p-3.5">Correo Electrónico</th>
												<th className="p-3.5 text-center">Asignaciones</th>
												<th className="p-3.5 text-right w-20">Acciones</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-border/60">
											{assignedPathologists.map((user: any) => {
												const assignedSpecimens = selectedSpecimens.filter((specimen) =>
													specimen.users?.some((u: any) => u.id === user.id)
												);
												const assignedCount = assignedSpecimens.length;

												return (
													<tr key={user.id} className="hover:bg-muted/20 transition-colors">
														<td className="p-3.5 font-medium text-foreground">
															{user.name}
														</td>
														<td className="p-3.5 text-muted-foreground">
															{user.email}
														</td>
														<td className="p-3.5 text-center font-medium">
															<div className="flex flex-col items-center gap-1.5">
																<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
																	{assignedCount} / {selectedSpecimens.length}
																</span>
																<div className="flex flex-wrap justify-center gap-1 max-w-[220px]">
																	{assignedSpecimens.map((specimen) => (
																		<span
																			key={specimen.id}
																			title={`${specimen.sequence_code || `#${specimen.id}`} - ${specimen.customer_relation?.name || 'Paciente N/A'}`}
																			className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-secondary text-secondary-foreground border border-border/60 hover:bg-secondary/80 transition-colors cursor-help"
																		>
																			{specimen.sequence_code || `#${specimen.id}`}
																		</span>
																	))}
																</div>
															</div>
														</td>
														<td className="p-3.5 text-right">
															<Button
																type="button"
																variant="ghost"
																size="icon"
																className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
																onClick={() => handleUnassign(user.id)}
																title="Eliminar asignación en todas las seleccionadas"
															>
																<Trash2 className="w-4 h-4" />
															</Button>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							) : (
								<div className="text-center py-12 px-4 space-y-2 h-full flex flex-col justify-center items-center">
									<div className="bg-muted/60 p-3 rounded-full">
										<User className="w-6 h-6 text-muted-foreground" />
									</div>
									<h4 className="font-semibold text-sm text-foreground">Sin patólogos asignados</h4>
									<p className="text-xs text-muted-foreground max-w-xs">
										Ninguno de las muestras seleccionadas tiene patólogos asignados. Utilice el selector de arriba para añadir uno.
									</p>
								</div>
							)}
						</div>
					</div>

					{/* Footer Close Button */}
					<div className="border-t pt-4 flex justify-end">
						<Button
							type="button"
							variant="secondary"
							onClick={() => onOpenChange(false)}
							className="px-6 h-10 font-medium"
						>
							Cerrar
						</Button>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
