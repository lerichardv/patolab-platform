import { Head, router, usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import {
    Edit2,
    FileSpreadsheet,
    Plus,
    Search,
    Trash2,
    Upload,
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
    index as customersIndex,
    destroy as destroyCustomer,
    exportMethod as exportCustomers,
    importPage as importCustomersPage,
} from '@/actions/App/Http/Controllers/CustomerController';
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
import CustomerSheet from './customer-sheet';

interface Customer {
    id: number;
    name: string;
    id_number: string;
    type: 'cliente' | 'empresa';
    age: number | string;
    phone: string;
    secondary_phone: string;
    gender: string;
    state: string;
    city: string;
    address: string;
    email: string;
    department?: {
        id: number;
        name: string;
    };
    municipality?: {
        id: number;
        name: string;
    };
}

interface Props {
    customers: {
        data: Customer[];
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
        type?: string;
        gender?: string;
        state?: string;
        city?: string;
    };
}

export default function CustomersIndex({ customers, filters }: Props) {
    const { auth } = usePage<any>().props;
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
        null,
    );
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
        null,
    );
    const [search, setSearch] = useState(filters.search || '');

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };

        if (value === 'all' || value === '') {
            delete newFilters[key as keyof typeof filters];
        }

        router.get(customersIndex().url, newFilters, {
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

    const handleEdit = (customer: Customer) => {
        setSelectedCustomer(customer);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedCustomer(null);
        setIsSheetOpen(true);
    };

    const handleDeleteClick = (customer: Customer) => {
        setCustomerToDelete(customer);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (customerToDelete) {
            router.delete(destroyCustomer(customerToDelete.id).url, {
                onSuccess: () => {
                    toast.success('Cliente eliminado correctamente');
                    setIsDeleteDialogOpen(false);
                },
            });
        }
    };

    return (
        <>
            <Head title="Gestión de Clientes" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Clientes
                        </h1>
                        <p className="text-muted-foreground">
                            Administre su base de datos de clientes y empresas.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {auth.permissions?.includes('patients.create') && (
                            <Button
                                variant="outline"
                                onClick={() =>
                                    window.open(
                                        importCustomersPage().url,
                                        '_blank',
                                    )
                                }
                                className="h-10 w-full px-5 text-sm md:w-auto"
                            >
                                <Upload className="mr-2 h-4 w-4" /> Importar
                            </Button>
                        )}
                        {auth.permissions?.includes('patients.view') && (
                            <Button
                                variant="outline"
                                onClick={() =>
                                    window.open(
                                        exportCustomers({ query: filters }).url,
                                        '_blank',
                                    )
                                }
                                className="h-10 w-full px-5 text-sm md:w-auto"
                            >
                                <FileSpreadsheet className="mr-2 h-4 w-4" />{' '}
                                Exportar
                            </Button>
                        )}
                        {auth.permissions?.includes('patients.create') && (
                            <Button
                                onClick={handleCreate}
                                className="h-10 w-full px-5 text-sm md:w-auto"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
                    <div className="relative">
                        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por ID, RTN, nombre..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select
                        value={filters.type || 'all'}
                        onValueChange={(v) => handleFilterChange('type', v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los tipos</SelectItem>
                            <SelectItem value="cliente">Cliente</SelectItem>
                            <SelectItem value="empresa">Empresa</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select
                        value={filters.gender || 'all'}
                        onValueChange={(v) => handleFilterChange('gender', v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Género" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                Todos los géneros
                            </SelectItem>
                            <SelectItem value="Mujer">Mujer</SelectItem>
                            <SelectItem value="Hombre">Hombre</SelectItem>
                            <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder="Departamento..."
                        value={filters.state || ''}
                        onChange={(e) =>
                            handleFilterChange('state', e.target.value)
                        }
                    />
                    <Input
                        placeholder="Municipio..."
                        value={filters.city || ''}
                        onChange={(e) =>
                            handleFilterChange('city', e.target.value)
                        }
                    />
                </div>

                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre / Empresa</TableHead>
                                <TableHead>ID / RTN</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Contacto</TableHead>
                                <TableHead>Ubicación</TableHead>
                                <TableHead className="text-right">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers.data.length > 0 ? (
                                customers.data.map((customer) => (
                                    <TableRow key={customer.id}>
                                        <TableCell className="font-medium">
                                            {customer.name}
                                        </TableCell>
                                        <TableCell>
                                            {customer.id_number}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    customer.type === 'cliente'
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {customer.type === 'cliente'
                                                    ? 'Cliente'
                                                    : 'Empresa'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs">
                                                <span>{customer.phone}</span>
                                                <span className="text-muted-foreground">
                                                    {customer.email}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs">
                                                <span>
                                                    {customer.municipality
                                                        ?.name || customer.city}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {customer.department
                                                        ?.name ||
                                                        customer.state}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {auth.permissions?.includes(
                                                    'patients.edit',
                                                ) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleEdit(customer)
                                                        }
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {auth.permissions?.includes(
                                                    'patients.delete',
                                                ) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive"
                                                        onClick={() =>
                                                            handleDeleteClick(
                                                                customer,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-24 text-center"
                                    >
                                        No se encontraron resultados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    links={customers.links}
                    meta={{
                        from: customers.from,
                        to: customers.to,
                        total: customers.total,
                    }}
                />
            </div>

            <CustomerSheet
                customer={selectedCustomer}
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
                            Esta acción desactivará al cliente{' '}
                            <strong>{customerToDelete?.name}</strong>. Ya no
                            aparecerá en la lista activa, pero sus registros
                            históricos se mantendrán.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Desactivar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
