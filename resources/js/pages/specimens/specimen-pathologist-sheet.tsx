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
import { User, Trash2, Microscope, UserPlus, Tag, AlertCircle, Clock } from 'lucide-react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';

interface Props {
	specimen: any | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pathologists: any[];
}

export default function SpecimenPathologistSheet({
	specimen,
	open,
	onOpenChange,
	pathologists = [],
}: Props) {
	const [selectedPathologistId, setSelectedPathologistId] = useState<string>('');

	if (!specimen) {
		return null;
	}

	// Filter pathologists that are NOT already assigned to this specimen
	const assignedUserIds = useMemo(() => {
		return specimen.users?.map((u: any) => u.id) || [];
	}, [specimen.users]);

	const availablePathologists = useMemo(() => {
		return pathologists.filter((p) => !assignedUserIds.includes(p.id));
	}, [pathologists, assignedUserIds]);

	const handleAssign = (userId: string) => {
		if (!userId) return;

		router.post(
			`/specimens/${specimen.id}/assign-user`,
			{ user_id: userId },
			{
				preserveScroll: true,
				preserveState: true,
				onSuccess: () => {
					toast.success('Patólogo asignado correctamente');
					setSelectedPathologistId('');
				},
				onError: (errors) => {
					const message = Object.values(errors)[0] || 'Error al asignar patólogo';
					toast.error(message);
				},
			}
		);
	};

	const handleUnassign = (userId: number) => {
		router.post(
			`/specimens/${specimen.id}/unassign-user`,
			{ user_id: userId },
			{
				preserveScroll: true,
				preserveState: true,
				onSuccess: () => {
					toast.success('Patólogo desasignado correctamente');
				},
				onError: (errors) => {
					const message = Object.values(errors)[0] || 'Error al desasignar patólogo';
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
						title="Asignar Patólogo"
						description="Administre la asignación de patólogos encargados de diagnosticar esta muestra."
					/>
				</div>

				<div className="flex flex-col gap-6 h-full pb-8 pr-2 px-5">

					{/* Specimen Resume */}
					<div className="bg-muted/30 border border-border/80 rounded-lg p-5 space-y-4 shadow-sm">
						<h3 className="text-sm font-semibold text-primary flex items-center gap-2 uppercase tracking-wider">
							<Microscope className="w-4 h-4 text-primary" /> Resumen de la Muestra
						</h3>
						<Separator className="opacity-60" />

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
							{specimen.sequence_code && (
								<div className="space-y-1">
									<span className="text-xs text-muted-foreground flex items-center gap-1">
										<Tag className="w-3.5 h-3.5" /> Código de Secuencia
									</span>
									<p className="font-mono font-bold text-primary">{specimen.sequence_code}</p>
								</div>
							)}

							<div className="space-y-1">
								<span className="text-xs text-muted-foreground flex items-center gap-1">
									<User className="w-3.5 h-3.5" /> Paciente
								</span>
								<p className="font-medium text-foreground">
									{specimen.customer_relation?.name || 'N/A'}
								</p>
							</div>

							<div className="space-y-1 sm:col-span-2">
								<span className="text-xs text-muted-foreground">Examen</span>
								<p className="font-medium text-foreground">
									{specimen.type?.name} - {specimen.examination?.name}
								</p>
							</div>

							<div className="space-y-1">
								<span className="text-xs text-muted-foreground flex items-center gap-1">
									<Clock className="w-3.5 h-3.5" /> Estado
								</span>
								<div>
									<span
										className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white inline-block mt-0.5"
										style={{ backgroundColor: specimen.status_color || '#cbd5e1' }}
									>
										{specimen.status === 'received' ? 'Recibida' :
											specimen.status === 'macroscopic_review' ? 'Rev. Macroscópica' :
												specimen.status === 'processing' ? 'En Proceso' :
													specimen.status === 'microscopic_review' ? 'Rev. Microscópica' :
														specimen.status === 'finalized' ? 'Finalizada' :
															specimen.status === 'delivered' ? 'Entregada' :
																specimen.status === 'cancelled' ? 'Cancelada' : specimen.status}
									</span>
								</div>
							</div>

							{specimen.priority && (
								<div className="space-y-1">
									<span className="text-xs text-muted-foreground flex items-center gap-1">
										<AlertCircle className="w-3.5 h-3.5" /> Prioridad
									</span>
									<div className="flex items-center gap-2 mt-0.5">
										<div
											className="w-3 h-3 rounded-full"
											style={{ backgroundColor: specimen.priority.color || '#cbd5e1' }}
										/>
										<span className="font-medium">{specimen.priority.name}</span>
									</div>
								</div>
							)}
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
									<SelectValue placeholder="Seleccione un patólogo para agregar a la muestra..." />
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
								Todos los patólogos disponibles ya están asignados a esta muestra.
							</div>
						)}
					</div>

					{/* Assigned Pathologists List Table */}
					<div className="space-y-2.5 flex-1 flex flex-col min-h-0">
						<label className="text-sm font-semibold text-foreground">
							Patólogos Asignados
						</label>
						<div className="border border-border/80 rounded-lg overflow-hidden bg-card shadow-sm flex-1 min-h-[180px]">
							{specimen.users && specimen.users.length > 0 ? (
								<div className="overflow-x-auto w-full">
									<table className="w-full border-collapse text-left text-sm">
										<thead>
											<tr className="bg-muted/50 border-b text-xs text-muted-foreground font-semibold uppercase tracking-wider">
												<th className="p-3.5">Nombre</th>
												<th className="p-3.5">Correo Electrónico</th>
												<th className="p-3.5 text-right w-20">Acciones</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-border/60">
											{specimen.users.map((user: any) => (
												<tr key={user.id} className="hover:bg-muted/20 transition-colors">
													<td className="p-3.5 font-medium text-foreground">
														{user.name}
													</td>
													<td className="p-3.5 text-muted-foreground">
														{user.email}
													</td>
													<td className="p-3.5 text-right">
														<Button
															type="button"
															variant="ghost"
															size="icon"
															className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
															onClick={() => handleUnassign(user.id)}
															title="Eliminar asignación"
														>
															<Trash2 className="w-4 h-4" />
														</Button>
													</td>
												</tr>
											))}
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
										Esta muestra no tiene ningún patólogo asignado actualmente. Utilice el selector de arriba para añadir uno.
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
