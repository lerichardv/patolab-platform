import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import {
	ChevronDown,
	Edit2,
	Eye,
	Package,
	PackageSearch,
	Plus,
	Search,
	Trash2,
	Warehouse,
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
	index as inventoriesIndex,
	destroy as destroyInventory,
} from '@/actions/App/Http/Controllers/InventoryController';
import { index as productsIndex } from '@/actions/App/Http/Controllers/ProductController';
import { Pagination } from '@/components/pagination';
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import AbastecerSheet from '@/pages/inventories/abastecer-sheet';
import InventorySheet from '@/pages/inventories/inventory-sheet';
import PurchaseOrderSheet from '@/pages/inventory-purchase-orders/purchase-order-sheet';

interface Storage {
	id: number;
	name: string;
}

interface Product {
	id: number;
	code: string;
	name: string;
}

interface Inventory {
	id: number;
	storage: number;
	product: number;
	quantity: number;
	active: boolean;
	storage_relation: Storage;
	product_relation: Product;
}

interface Props {
	inventories: {
		data: Inventory[];
		links: {
			url: string | null;
			label: string;
			active: boolean;
		}[];
		current_page: number;
		last_page: number;
		total: number;
		from: number;
		to: number;
	};
	storages: Storage[];
	products: Product[];
	existingInventories: { storage: number; product: number }[];
	filters: {
		search?: string;
		storage?: string;
	};
}

export default function InventoriesIndex({
	inventories,
	storages,
	products,
	existingInventories,
	filters,
}: Props) {
	const { auth } = usePage<any>().props;
	const canAdd = auth.permissions?.includes('inventory.add');
	const canManage = auth.permissions?.includes('inventory.manage');

	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [isAbastecerOpen, setIsAbastecerOpen] = useState(false);
	const [isPurchaseOrderOpen, setIsPurchaseOrderOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [selectedInventory, setSelectedInventory] =
		useState<Inventory | null>(null);
	const [inventoryToDelete, setInventoryToDelete] =
		useState<Inventory | null>(null);
	const [deleteConfirmation, setDeleteConfirmation] = useState('');
	const [search, setSearch] = useState(filters.search || '');

	const handleFilterChange = (key: string, value: string) => {
		const newFilters = { ...filters, [key]: value };

		if (value === '' || value === 'all') {
			delete newFilters[key as keyof typeof filters];
		}

		router.get(inventoriesIndex().url, newFilters, {
			preserveState: true,
			replace: true,
		});
	};

	const debouncedSearch = useCallback(
		debounce((value: string) => {
			handleFilterChange('search', value);
		}, 300),
		[filters],
	);

	useEffect(() => {
		if (search !== filters.search) {
			debouncedSearch(search);
		}
	}, [search]);

	const handleEdit = (inventory: Inventory) => {
		setSelectedInventory(inventory);
		setIsSheetOpen(true);
	};

	const handleCreate = () => {
		setSelectedInventory(null);
		setIsSheetOpen(true);
	};

	const handleAbastecer = () => {
		setIsAbastecerOpen(true);
	};

	const handleDeleteClick = (inventory: Inventory) => {
		setInventoryToDelete(inventory);
		setDeleteConfirmation('');
		setIsDeleteDialogOpen(true);
	};

	const confirmDelete = () => {
		if (inventoryToDelete) {
			router.delete(destroyInventory(inventoryToDelete.id).url, {
				onSuccess: () => {
					toast.success('Registro de inventario desactivado');
					setIsDeleteDialogOpen(false);
				},
			});
		}
	};

	return (
		<>
			<Head title="Gestionar Inventario" />
			<div className="flex h-full flex-1 flex-col gap-4 p-4">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">
							Inventario
						</h1>
						<p className="text-muted-foreground">
							Monitoreo y ajuste de existencias por bodega.
						</p>
					</div>
					<div className="flex flex-col gap-2 md:flex-row">
						{canManage && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										className="h-10 w-full px-5 text-sm md:w-auto"
									>
										<PackageSearch className="mr-2 h-4 w-4" />{' '}
										Acciones de Inventario
										<ChevronDown className="ml-2 h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-56">
									<DropdownMenuItem onClick={() => setIsPurchaseOrderOpen(true)}>
										Crear orden de compra
									</DropdownMenuItem>
									<DropdownMenuItem onClick={handleAbastecer}>
										Abastecer producto existente al inventario
									</DropdownMenuItem>
									{canAdd && (
										<DropdownMenuItem onClick={handleCreate}>
											Ingresar producto nuevo al inventario
										</DropdownMenuItem>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-4">
					<div className="relative w-full md:w-72">
						<Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Buscar producto..."
							className="pl-8"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>

					<Select
						value={filters.storage || 'all'}
						onValueChange={(value) =>
							handleFilterChange('storage', value)
						}
					>
						<SelectTrigger className="w-full md:w-56">
							<SelectValue placeholder="Todas las bodegas" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">
								Todas las bodegas
							</SelectItem>
							{storages.map((storage) => (
								<SelectItem
									key={storage.id}
									value={storage.id.toString()}
								>
									{storage.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="overflow-hidden rounded-md border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Producto</TableHead>
								<TableHead>Almacén</TableHead>
								<TableHead className="text-center">
									Existencia
								</TableHead>
								<TableHead className="text-right">
									Acciones
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{inventories.data.length > 0 ? (
								inventories.data.map((item) => (
									<TableRow key={item.id}>
										<TableCell className="font-medium">
											<div className="flex items-center gap-2">
												<div className="rounded-lg bg-primary/10 p-2">
													<Package className="h-4 w-4 text-primary" />
												</div>
												<div className="flex flex-col">
													<div className="flex items-center gap-1.5">
														<span>
															{
																item
																	.product_relation
																	.name
															}
														</span>
														<Button
															variant="ghost"
															size="icon"
															className="h-5 w-5 text-muted-foreground hover:text-primary"
															onClick={() =>
																router.get(
																	productsIndex(
																		{
																			query: {
																				search: item
																					.product_relation
																					.name,
																			},
																		},
																	).url,
																)
															}
															title="Ver producto"
														>
															<Eye className="h-3.5 w-3.5" />
														</Button>
													</div>
													<span className="font-mono text-[10px] text-muted-foreground uppercase">
														{
															item
																.product_relation
																.code
														}
													</span>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<Warehouse className="h-3 w-3 text-muted-foreground" />
												<span className="text-sm">
													{item.storage_relation.name}
												</span>
											</div>
										</TableCell>
										<TableCell className="text-center">
											<Badge
												variant={
													item.quantity > 0
														? 'secondary'
														: 'destructive'
												}
											>
												{item.quantity}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											{canManage && (
												<div className="flex justify-end gap-2">
													<Button
														variant="ghost"
														size="icon"
														onClick={() =>
															handleEdit(item)
														}
													>
														<Edit2 className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-destructive"
														onClick={() =>
															handleDeleteClick(
																item,
															)
														}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											)}
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={4}
										className="h-24 text-center"
									>
										No hay registros de inventario.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				<Pagination
					links={inventories.links}
					meta={{
						from: inventories.from,
						to: inventories.to,
						total: inventories.total,
					}}
				/>
			</div>

			<InventorySheet
				inventory={selectedInventory}
				storages={storages}
				products={products}
				existingInventories={existingInventories}
				open={isSheetOpen}
				onOpenChange={setIsSheetOpen}
			/>

			<AbastecerSheet
				inventories={inventories.data}
				open={isAbastecerOpen}
				onOpenChange={setIsAbastecerOpen}
			/>

			<PurchaseOrderSheet
				products={products}
				open={isPurchaseOrderOpen}
				onOpenChange={setIsPurchaseOrderOpen}
			/>

			<AlertDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							¿Está completamente seguro?
						</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción desactivará el registro de inventario
							para{' '}
							<strong>
								{inventoryToDelete?.product_relation.name}
							</strong>{' '}
							en{' '}
							<strong>
								{inventoryToDelete?.storage_relation.name}
							</strong>
							.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<div className="space-y-2 py-2">
						<Label
							htmlFor="confirmation"
							className="text-sm font-medium"
						>
							Para confirmar, escriba{' '}
							<span className="font-bold text-destructive select-none">
								inventario
							</span>{' '}
							a continuación:
						</Label>
						<Input
							id="confirmation"
							value={deleteConfirmation}
							onChange={(e) =>
								setDeleteConfirmation(e.target.value)
							}
							placeholder="Escriba 'inventario'"
							className="h-9"
							autoComplete="off"
						/>
					</div>

					<AlertDialogFooter>
						<AlertDialogCancel
							onClick={() => setDeleteConfirmation('')}
						>
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							disabled={deleteConfirmation !== 'inventario'}
							className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50"
						>
							Desactivar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
