import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import debounce from 'lodash/debounce';
import {
    History,
    Search,
    User,
    ArrowUpCircle,
    ArrowDownCircle,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { index as inventoryMovementsIndex } from '@/actions/App/Http/Controllers/InventoryMovementController';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
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

interface Movement {
    id: number;
    inventory_name: string;
    storage_name: string;
    quantity_added: number;
    quantity_before_update: number;
    quantity_after_update: number;
    movement: 'added' | 'removed' | 'updated' | 'deleted';
    user: {
        name: string;
    };
    created_at: string;
}

interface Props {
    movements: {
        data: Movement[];
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
    filters: {
        search?: string;
        movement?: string;
    };
}

export default function InventoryMovementsIndex({ movements, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };

        if (value === '' || value === 'all') {
            delete newFilters[key as keyof typeof filters];
        }

        router.get(inventoryMovementsIndex().url, newFilters, {
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

    const getMovementBadge = (type: string) => {
        switch (type) {
            case 'added':
                return (
                    <Badge className="gap-1 border-none bg-green-500 text-white hover:bg-green-600">
                        <ArrowUpCircle className="h-3 w-3" /> Entrada / Abasto
                    </Badge>
                );
            case 'removed':
                return (
                    <Badge className="gap-1 border-none bg-orange-500 text-white hover:bg-orange-600">
                        <ArrowDownCircle className="h-3 w-3" /> Salida
                    </Badge>
                );
            case 'updated':
                return (
                    <Badge className="gap-1 border-none bg-blue-500 text-white hover:bg-blue-600">
                        <RefreshCw className="h-3 w-3" /> Actualización
                    </Badge>
                );
            case 'deleted':
                return (
                    <Badge className="gap-1 border-none bg-destructive text-white hover:bg-destructive/90">
                        <Trash2 className="h-3 w-3" /> Eliminado
                    </Badge>
                );
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

    return (
        <>
            <Head title="Historial de Movimientos" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Historial de Movimientos
                        </h1>
                        <p className="text-muted-foreground">
                            Registro cronológico de entradas, salidas y ajustes
                            de inventario.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative w-full md:w-72">
                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por producto, bodega o usuario..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Select
                        value={filters.movement || 'all'}
                        onValueChange={(value) =>
                            handleFilterChange('movement', value)
                        }
                    >
                        <SelectTrigger className="w-full md:w-56">
                            <SelectValue placeholder="Todos los tipos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los tipos</SelectItem>
                            <SelectItem value="added">
                                Entradas / Abasto
                            </SelectItem>
                            <SelectItem value="updated">
                                Actualizaciones
                            </SelectItem>
                            <SelectItem value="deleted">
                                Eliminaciones
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="overflow-hidden rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha y Hora</TableHead>
                                <TableHead>Producto / Insumo</TableHead>
                                <TableHead>Almacén</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">
                                    Anterior
                                </TableHead>
                                <TableHead className="text-right">
                                    Cambio
                                </TableHead>
                                <TableHead className="text-right">
                                    Nuevo Stock
                                </TableHead>
                                <TableHead>Usuario</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {movements.data.length > 0 ? (
                                movements.data.map((m) => (
                                    <TableRow key={m.id}>
                                        <TableCell className="text-xs">
                                            {format(
                                                new Date(m.created_at),
                                                "d 'de' MMMM, HH:mm",
                                                { locale: es },
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {m.inventory_name}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {m.storage_name}
                                        </TableCell>
                                        <TableCell>
                                            {getMovementBadge(m.movement)}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {m.quantity_before_update}
                                        </TableCell>
                                        <TableCell
                                            className={`text-right font-bold ${m.quantity_added > 0 ? 'text-green-600' : m.quantity_added < 0 ? 'text-destructive' : ''}`}
                                        >
                                            {m.quantity_added > 0
                                                ? `+${m.quantity_added}`
                                                : m.quantity_added}
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            {m.quantity_after_update}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-xs">
                                                <User className="h-3 w-3" />
                                                {m.user.name}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="h-24 text-center"
                                    >
                                        No se registran movimientos aún.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    links={movements.links}
                    meta={{
                        from: movements.from,
                        to: movements.to,
                        total: movements.total,
                    }}
                />
            </div>
        </>
    );
}
