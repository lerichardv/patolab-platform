import { Head, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    CheckCircle,
    Clock,
    Edit2,
    Plus,
    Search,
    Trash2,
    FileText,
    ExternalLink,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    index as purchaseOrdersIndex,
    destroy as destroyPurchaseOrder,
    updateStatus as updatePurchaseOrderStatus,
} from '@/actions/App/Http/Controllers/InventoryPurchaseOrderController';
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
import { Input } from '@/components/ui/input';
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
import PurchaseOrderSheet from './purchase-order-sheet';

interface Provider {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
    code: string;
}

interface PurchaseOrderProduct {
    id: number;
    product_id: number;
    specification: string;
    quantity: number;
    unit_price: number;
    product: Product;
}

interface User {
    id: number;
    name: string;
}

interface PurchaseOrder {
    id: number;
    code: string;
    provider_id: number;
    requester_id: number;
    date_requested: string;
    date_delivered: string | null;
    status: 'pending' | 'received';
    provider: Provider;
    requester: User;
    products: PurchaseOrderProduct[];
    purchase_order_file: string | null;
}

interface Props {
    purchaseOrders: {
        data: PurchaseOrder[];
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
    providers: Provider[];
    products: Product[];
    filters: {
        search?: string;
        status?: string;
    };
}

const STATUS_METADATA: Record<
    string,
    { label: string; bg: string; text: string; border: string }
> = {
    pending: {
        label: 'Pendiente',
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500/20',
    },
    received: {
        label: 'Recibida',
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/20',
    },
};

export default function PurchaseOrdersIndex({
    purchaseOrders,
    providers,
    products,
    filters,
}: Props) {
    const { auth, flash } = usePage<any>().props;
    const canManage = auth.permissions?.includes('inventory.manage');

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
        null,
    );
    const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(
        null,
    );
    const [search, setSearch] = useState(filters.search || '');
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [isConfirmRecibirOpen, setIsConfirmRecibirOpen] = useState(false);
    const [orderToRecibir, setOrderToRecibir] = useState<PurchaseOrder | null>(
        null,
    );
    const [isConfirmReabrirOpen, setIsConfirmReabrirOpen] = useState(false);
    const [orderToReabrir, setOrderToReabrir] = useState<PurchaseOrder | null>(
        null,
    );

    useEffect(() => {
        if (flash?.new_purchase_order_url) {
            setPdfPreviewUrl(flash.new_purchase_order_url);
            setShowPdfModal(true);
        }
    }, [flash?.new_purchase_order_url]);

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };

        if (value === 'all' || value === '') {
            delete newFilters[key as keyof typeof filters];
        }

        router.get(purchaseOrdersIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const handleSearchChange = (val: string) => {
        setSearch(val);
        debouncedFilterChange(val);
    };

    // Simple manual debounce for search input
    const [debounceTimeout, setDebounceTimeout] = useState<any>(null);
    const debouncedFilterChange = (val: string) => {
        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
        }

        const timeout = setTimeout(() => {
            const newFilters: typeof filters = { ...filters, search: val };

            if (!val) {
                delete newFilters.search;
            }

            router.get(purchaseOrdersIndex().url, newFilters, {
                preserveState: true,
                replace: true,
            });
        }, 300);
        setDebounceTimeout(timeout);
    };

    useEffect(() => {
        return () => {
            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
            }
        };
    }, [debounceTimeout]);

    const handleEdit = (order: PurchaseOrder) => {
        setSelectedOrder(order);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedOrder(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (order: PurchaseOrder) => {
        setOrderToDelete(order);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (orderToDelete) {
            router.delete(destroyPurchaseOrder(orderToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Orden de compra eliminada correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    const handleToggleStatus = (order: PurchaseOrder) => {
        const nextStatus = order.status === 'pending' ? 'received' : 'pending';
        router.put(
            updatePurchaseOrderStatus(order.id).url,
            { status: nextStatus },
            {
                onSuccess: () => {
                    toast.success(
                        nextStatus === 'received'
                            ? 'Orden de compra marcada como RECIBIDA'
                            : 'Orden de compra cambiada a PENDIENTE',
                    );
                },
            },
        );
    };

    const confirmRecibir = () => {
        if (orderToRecibir) {
            router.put(
                updatePurchaseOrderStatus(orderToRecibir.id).url,
                { status: 'received' },
                {
                    onSuccess: () => {
                        toast.success('Orden de compra marcada como RECIBIDA');
                        setIsConfirmRecibirOpen(false);
                        setOrderToRecibir(null);
                    },
                },
            );
        }
    };

    const confirmReabrir = () => {
        if (orderToReabrir) {
            router.put(
                updatePurchaseOrderStatus(orderToReabrir.id).url,
                { status: 'pending' },
                {
                    onSuccess: () => {
                        toast.success('Orden de compra cambiada a PENDIENTE');
                        setIsConfirmReabrirOpen(false);
                        setOrderToReabrir(null);
                    },
                },
            );
        }
    };

    return (
        <>
            <Head title="Órdenes de Compra de Inventario" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Órdenes de Compra
                        </h1>
                        <p className="text-muted-foreground">
                            Administre las órdenes de compra y el abastecimiento
                            de insumos.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {canManage && (
                            <Button
                                onClick={handleCreate}
                                className="h-10 w-full px-5 text-sm md:w-auto"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Crear Orden de
                                Compra
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    <div className="relative">
                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por código o proveedor..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                    </div>
                    <Select
                        value={filters.status || 'all'}
                        onValueChange={(v) => handleFilterChange('status', v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                Todos los estados
                            </SelectItem>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="received">Recibida</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Proveedor</TableHead>
                                <TableHead>Solicitado por</TableHead>
                                <TableHead>Fecha Solicitada</TableHead>
                                <TableHead>Fecha de Entrega</TableHead>
                                <TableHead className="text-center">
                                    Estado
                                </TableHead>
                                <TableHead className="text-right">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchaseOrders.data.length > 0 ? (
                                purchaseOrders.data.map((order) => {
                                    const sMeta =
                                        STATUS_METADATA[order.status] ||
                                        STATUS_METADATA.pending;

                                    return (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-mono font-semibold uppercase">
                                                <div>#{order.code}</div>
                                                {order.purchase_order_file && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setPdfPreviewUrl(
                                                                `/storage/${order.purchase_order_file}`,
                                                            );
                                                            setShowPdfModal(
                                                                true,
                                                            );
                                                        }}
                                                        className="mt-1.5 h-6 cursor-pointer rounded-lg px-2.5 text-[10px] font-medium"
                                                    >
                                                        <ExternalLink className="h-2 w-2" />{' '}
                                                        Ver PDF
                                                    </Button>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {order.provider?.name || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {order.requester?.name || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {order.date_requested
                                                    ? format(
                                                          new Date(
                                                              order.date_requested,
                                                          ),
                                                          'dd MMM, yyyy',
                                                          { locale: es },
                                                      )
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {order.date_delivered
                                                    ? format(
                                                          new Date(
                                                              order.date_delivered,
                                                          ),
                                                          'dd MMM, yyyy HH:mm',
                                                          { locale: es },
                                                      )
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${sMeta.bg} ${sMeta.text} ${sMeta.border}`}
                                                >
                                                    {sMeta.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {canManage && (
                                                        <>
                                                            {order.status ===
                                                            'pending' ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 cursor-pointer gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                                                                    onClick={() => {
                                                                        setOrderToRecibir(
                                                                            order,
                                                                        );
                                                                        setIsConfirmRecibirOpen(
                                                                            true,
                                                                        );
                                                                    }}
                                                                    title="Marcar como recibida"
                                                                >
                                                                    <CheckCircle className="h-3 w-3" />
                                                                    <span>
                                                                        Recibir
                                                                    </span>
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 cursor-pointer gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/10"
                                                                    onClick={() => {
                                                                        setOrderToReabrir(
                                                                            order,
                                                                        );
                                                                        setIsConfirmReabrirOpen(
                                                                            true,
                                                                        );
                                                                    }}
                                                                    title="Cambiar a pendiente"
                                                                >
                                                                    <Clock className="h-3 w-3" />
                                                                    <span>
                                                                        Reabrir
                                                                    </span>
                                                                </Button>
                                                            )}
                                                            {order.purchase_order_file && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        setPdfPreviewUrl(
                                                                            `/storage/${order.purchase_order_file}`,
                                                                        );
                                                                        setShowPdfModal(
                                                                            true,
                                                                        );
                                                                    }}
                                                                    title="Ver PDF"
                                                                    className="group"
                                                                >
                                                                    <FileText className="h-4 w-4 text-blue-600 group-hover:text-white" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    handleEdit(
                                                                        order,
                                                                    )
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
                                                                        order,
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="h-24 text-center"
                                    >
                                        No se encontraron órdenes de compra.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    links={purchaseOrders.links}
                    meta={{
                        from: purchaseOrders.from,
                        to: purchaseOrders.to,
                        total: purchaseOrders.total,
                    }}
                />
            </div>

            <PurchaseOrderSheet
                purchaseOrder={selectedOrder}
                providers={providers}
                products={products}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
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
                            Esta acción eliminará permanentemente la orden de
                            compra <strong>#{orderToDelete?.code}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={showPdfModal}
                onOpenChange={(open) => {
                    setShowPdfModal(open);

                    if (!open) {
                        setPdfPreviewUrl(null);
                    }
                }}
            >
                <AlertDialogContent className="z-[100] w-full max-w-[700px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" /> Orden
                            de Compra Generada
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            El documento de la orden de compra en formato PDF.
                            Puede descargarla, imprimirla o visualizarla a
                            continuación.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {pdfPreviewUrl && (
                        <div className="my-4 overflow-hidden rounded-lg border bg-muted">
                            <iframe
                                src={pdfPreviewUrl}
                                className="h-[450px] w-full border-none"
                                title="Orden de Compra PDF"
                            />
                        </div>
                    )}

                    <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowPdfModal(false);
                                setPdfPreviewUrl(null);
                            }}
                            className="sm:order-1"
                        >
                            Cerrar
                        </Button>
                        <Button
                            onClick={() => {
                                if (pdfPreviewUrl) {
                                    window.open(pdfPreviewUrl, '_blank');
                                }
                            }}
                            className="sm:order-2"
                        >
                            <ExternalLink className="mr-2 h-4 w-4" /> Abrir en
                            pestaña nueva
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={isConfirmRecibirOpen}
                onOpenChange={setIsConfirmRecibirOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Marcar como Recibida
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Está seguro de que desea marcar la orden de compra{' '}
                            <strong>#{orderToRecibir?.code}</strong> como
                            recibida? Esto actualizará el estado de los insumos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setOrderToRecibir(null)}
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmRecibir}
                            className="bg-emerald-600 text-white hover:bg-emerald-500"
                        >
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={isConfirmReabrirOpen}
                onOpenChange={setIsConfirmReabrirOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Reabrir Orden de Compra
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Está seguro de que desea reabrir la orden de compra{' '}
                            <strong>#{orderToReabrir?.code}</strong>? Esto
                            cambiará su estado a pendiente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setOrderToReabrir(null)}
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmReabrir}
                            className="bg-primary text-white hover:bg-primary/95"
                        >
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
