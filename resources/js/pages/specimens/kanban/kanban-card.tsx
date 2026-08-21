import { Draggable } from '@hello-pangea/dnd';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
	Ban,
	CalendarClock,
	Edit2,
	FileText,
	MoreVertical,
	Plus,
	Tag,
	Share2,
	Trash2,
	UserPlus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Specimen } from '../index';
import { getDueDateInfo } from '../index';

export interface KanbanCardProps {
	specimen: Specimen;
	index: number;
	auth: {
		permissions?: string[];
		[key: string]: any;
	};
	isSelectionMode: boolean;
	selectedIds: number[];
	toggleSelectSpecimen: (id: number) => void;
	handleView: (specimen: Specimen) => void;
	handleAssignClick: (specimen: Specimen) => void;
	handleEdit: (specimen: Specimen) => void;
	handleLoadGroupAndOpenSheet: (groupId: number) => void;
	handleCancelClick: (specimen: Specimen) => void;
	handleDeleteClick: (specimen: Specimen) => void;
}

export function KanbanCard({
	specimen,
	index,
	auth,
	isSelectionMode,
	selectedIds,
	toggleSelectSpecimen,
	handleView,
	handleAssignClick,
	handleEdit,
	handleLoadGroupAndOpenSheet,
	handleCancelClick,
	handleDeleteClick,
}: KanbanCardProps) {
	return (
		<Draggable
			key={specimen.id}
			draggableId={specimen.id.toString()}
			index={index}
			isDragDisabled={!auth.permissions?.includes('specimens.edit')}
		>
			{(provided, snapshot) => (
				<div
					ref={provided.innerRef}
					{...provided.draggableProps}
					{...provided.dragHandleProps}
					onClick={() => {
						if (isSelectionMode) {
							toggleSelectSpecimen(specimen.id);
						} else {
							handleView(specimen);
						}
					}}
					className={`relative flex cursor-pointer flex-col gap-2 rounded-md border p-3 shadow-sm transition-all duration-200 hover:border-primary/50 ${snapshot.isDragging
						? 'z-50 scale-[1.02] rotate-2 opacity-90 shadow-xl ring-2 ring-primary/20'
						: ''
						} ${selectedIds.includes(specimen.id)
							? 'border-primary bg-primary/[0.02] ring-1 ring-primary/30'
							: specimen.users && specimen.users.length > 0
								? 'dark:border-sky-850 border-sky-300/80 bg-sky-50/50 dark:bg-sky-950/20'
								: 'bg-card'
						}`}
				>
					<div className="flex items-start gap-3">
						{isSelectionMode && (
							<div
								className="flex-shrink-0 pt-1"
								onClick={(e) => e.stopPropagation()}
							>
								<Checkbox
									checked={selectedIds.includes(specimen.id)}
									onCheckedChange={() =>
										toggleSelectSpecimen(specimen.id)
									}
								/>
							</div>
						)}
						<div className="flex min-w-0 flex-1 flex-col gap-2">
							<div
								className="absolute top-2 right-2 ml-1 flex flex-col items-center justify-center gap-1"
								onClick={(e) => e.stopPropagation()}
							>
								{(auth.permissions?.includes(
									'specimens.edit',
								) ||
									auth.permissions?.includes(
										'specimens.delete',
									)) && (
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<button
													className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
													title="Acciones"
												>
													<MoreVertical className="h-4 w-4" />
												</button>
											</DropdownMenuTrigger>
											<DropdownMenuContent
												align="end"
												onClick={(e) => e.stopPropagation()}
											>
												{auth.permissions?.includes(
													'specimens.edit',
												) && (
														<DropdownMenuItem
															onClick={(e) => {
																e.stopPropagation();
																handleEdit(specimen);
															}}
														>
															<Edit2 className="mr-2 h-4 w-4" />
															<span>Editar</span>
														</DropdownMenuItem>
													)}
												{auth.permissions?.includes(
													'report_editor.view',
												) && (
														<DropdownMenuItem
															onClick={(e) => {
																e.stopPropagation();
																window.open(
																	`/specimens/${specimen.sequence_code ||
																	specimen.id
																	}/report-editor`,
																	'_blank',
																);
															}}
														>
															<FileText className="mr-2 h-4 w-4" />
															<span>Abrir Reporte</span>
														</DropdownMenuItem>
													)}
												{specimen.is_group &&
													specimen.group && (
														<DropdownMenuItem
															onClick={(e) => {
																e.stopPropagation();
																handleLoadGroupAndOpenSheet(
																	specimen.group
																		.id,
																);
															}}
														>
															<Plus className="mr-2 h-4 w-4" />
															<span>
																Agregar más muestras
																al grupo
															</span>
														</DropdownMenuItem>
													)}
												{auth.permissions?.includes(
													'specimens.edit',
												) &&
													![
														'cancelled',
														'finalized',
														'delivered',
													].includes(specimen.status) && (
														<DropdownMenuItem
															variant="destructive"
															onClick={(e) => {
																e.stopPropagation();
																handleCancelClick(
																	specimen,
																);
															}}
														>
															<Ban className="mr-2 h-4 w-4" />
															<span>
																Cancelar muestra
															</span>
														</DropdownMenuItem>
													)}
												{auth.permissions?.includes(
													'specimens.delete',
												) && (
														<DropdownMenuItem
															variant="destructive"
															onClick={(e) => {
																e.stopPropagation();
																handleDeleteClick(
																	specimen,
																);
															}}
														>
															<Trash2 className="mr-2 h-4 w-4" />
															<span>Eliminar</span>
														</DropdownMenuItem>
													)}
											</DropdownMenuContent>
										</DropdownMenu>
									)}

								{auth.permissions?.includes(
									'specimens.manage',
								) && (
										<>
											<Button
												variant="ghost"
												size="icon"
												className="relative h-6 w-6 text-muted-foreground hover:bg-muted hover:text-foreground"
												onClick={() =>
													handleAssignClick(specimen)
												}
												title="Asignar Patólogo"
											>
												<UserPlus className="h-4 w-4" />
												<span
													className={`absolute right-0 bottom-0 flex h-2.5 w-2.5 items-center justify-center rounded-full text-[7px] font-extrabold ring-1 ring-background ${(specimen.users?.length ||
														0) > 0
														? 'bg-sky-500 text-white'
														: 'bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
														}`}
												>
													{specimen.users?.length || 0}
												</span>
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="relative h-6 w-6 text-muted-foreground hover:bg-muted hover:text-foreground"
												onClick={() =>
													handleAssignClick(specimen)
												}
												title="Asignar Colaboradores"
											>
												<Share2 className="h-4 w-4" />
												<span
													className={`absolute right-0 bottom-0 flex h-2.5 w-2.5 items-center justify-center rounded-full text-[7px] font-extrabold ring-1 ring-background ${(specimen.collaborators
														?.length || 0) > 0
														? 'bg-sky-500 text-white'
														: 'bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
														}`}
												>
													{specimen.collaborators
														?.length || 0}
												</span>
											</Button>
										</>
									)}
							</div>
							<div className="mr-6 flex flex-col gap-1">
								{specimen.group?.name ? (
									<div className="mb-1 flex items-start">
										<Badge
											variant="secondary"
											className="border-none bg-purple-500/10 px-1.5 py-0 text-[9px] font-semibold text-purple-600 hover:bg-purple-500/10 dark:bg-purple-500/20 dark:text-purple-300"
										>
											{specimen.group.name}
										</Badge>
									</div>
								) : (
									<div className="mb-1 flex items-start">
										<Badge
											variant="secondary"
											className="border-none bg-slate-500/10 px-1.5 py-0 text-[9px] font-semibold text-slate-600 hover:bg-slate-500/10 dark:bg-slate-500/20 dark:text-slate-400"
										>
											Individual
										</Badge>
									</div>
								)}
								<div className="text-sm font-medium">
									{specimen.customer_relation?.name}
								</div>
								<div className="text-xs text-muted-foreground">
									{specimen.sequence_code && (
										<div className="mb-1 w-fit rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
											{specimen.sequence_code}
										</div>
									)}
									{specimen.type?.name && (
										<div className="text-[11px] font-semibold text-muted-foreground">
											{specimen.type.name}
										</div>
									)}
									{(() => {
										const exams =
											specimen.examinations &&
												specimen.examinations.length > 0
												? specimen.examinations
												: specimen.examination
													? [specimen.examination]
													: [];

										if (exams.length === 0) {
											return null;
										}

										return (
											<div className="mt-1 flex flex-col gap-0.5 text-xs font-medium text-foreground">
												{exams.map((exam: any) => (
													<div
														key={exam.id}
														className="flex items-center gap-1.5"
													>
														{exams.length > 1 ? (<span className="h-1 w-1 shrink-0 rounded-full bg-primary/20" />) : ''}
														<span className="truncate">
															{exam.name}
														</span>
													</div>
												))}
											</div>
										);
									})()}
								</div>
							</div>
							{(() => {
								const dueInfo = getDueDateInfo(specimen);

								if (!dueInfo) {
									return null;
								}

								return (
									<div className="mt-0.5 flex flex-wrap items-center gap-1.5">
										<div className="inline-flex w-fit items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
											<Tag className="h-3 w-3" />{' '}
											{specimen.category.name}
										</div>
										{![
											'finalized',
											'delivered',
											'cancelled',
										].includes(specimen.status) && (
												<div
													className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${dueInfo.colorClass}`}
													title={`Fecha Estimada: ${dueInfo.fullDueDate}`}
												>
													<CalendarClock className="h-3 w-3" />{' '}
													{dueInfo.isExpired
														? 'Vencida:'
														: 'Est:'}{' '}
													{dueInfo.dueDateFormatted}
												</div>
											)}
									</div>
								);
							})()}
							<div className="mt-1 flex items-center justify-between text-xs">
								<span
									className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
									style={{
										backgroundColor:
											specimen.status_color || '#cbd5e1',
									}}
								>
									{specimen.status === 'received'
										? 'Recibida'
										: specimen.status ===
											'macroscopic_review'
											? 'Rev. Macroscópica'
											: specimen.status === 'processing'
												? 'En Proceso'
												: specimen.status ===
													'microscopic_review'
													? 'Rev. Microscópica'
													: specimen.status === 'finalized'
														? 'Finalizada'
														: specimen.status ===
															'delivered'
															? 'Entregada'
															: specimen.status ===
																'cancelled'
																? 'Cancelada'
																: specimen.status}
								</span>
								<span
									className="text-muted-foreground capitalize"
									title={new Date(
										specimen.created_at,
									).toLocaleString('es-ES')}
								>
									{formatDistanceToNow(
										new Date(specimen.created_at),
										{
											addSuffix: true,
											locale: es,
										},
									)}
								</span>
							</div>
						</div>
					</div>
				</div>
			)}
		</Draggable>
	);
}

export default KanbanCard;
