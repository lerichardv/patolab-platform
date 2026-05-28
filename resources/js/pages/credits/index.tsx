import { Head, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import debounce from 'lodash/debounce';
import { FileText, Search, CreditCard, ExternalLink, Printer, History, Eye } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { index as creditsIndex } from '@/actions/App/Http/Controllers/CreditController';
import { Pagination } from '@/components/pagination';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import CreditSheet from './credit-sheet';

interface Customer {
    id: number;
    name: string;
    id_number: string;
    phone?: string;
    email?: string;
}

interface Specimen {
    id: number;
    sequence_code?: string;
}

interface Invoice {
    id: number;
    full_invoice_number: string;
    payment_type: string;
    total: string | number;
    invoice_file: string;
    created_at: string;
    specimen?: Specimen;
}

interface Credit {
    id: number;
    customer_id: number;
    credit_amount: string | number;
    amount_paid: string | number;
    amount_remaining: string | number;
    created_at: string;
    customer?: Customer;
    invoices?: Invoice[];
}

interface Props {
    credits: {
        data: Credit[];
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
        status?: string;
    };
}

export default function CreditsIndex({ credits, filters }: Props) {
    const { flash } = usePage<any>().props;

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
    const [search, setSearch] = useState(filters.search || '');
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const [showLeftShadow, setShowLeftShadow] = useState(false);
    const [showRightShadow, setShowRightShadow] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const scrollContainer = container.querySelector('.relative.w-full.overflow-auto') || container;

        const handleScroll = () => {
            const scrollLeft = scrollContainer.scrollLeft;
            const scrollWidth = scrollContainer.scrollWidth;
            const clientWidth = scrollContainer.clientWidth;

            setShowLeftShadow(scrollLeft > 2);
            setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 2);
        };

        handleScroll();

        scrollContainer.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleScroll);

        return () => {
            scrollContainer.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [credits.data]);

    // Watch flash for new invoice generation
    useEffect(() => {
        if (flash.new_invoice_url) {
            setInvoiceUrl(flash.new_invoice_url);
            setShowInvoiceModal(true);
        }
    }, [flash.new_invoice_url]);

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };

        if (value === 'all' || value === '') {
delete newFilters[key as keyof typeof filters];
}
        
        router.get(creditsIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            handleFilterChange('search', value);
        }, 300),
        [filters]
    );

    useEffect(() => {
        if (search !== filters.search) {
            debouncedSearch(search);
        }
    }, [search]);

    const handlePayClick = (credit: Credit) => {
        setSelectedCredit(credit);
        setIsSheetOpen(true);
    };

    const getStatusBadge = (credit: Credit) => {
        const remaining = parseFloat(String(credit.amount_remaining));
        const paid = parseFloat(String(credit.amount_paid));

        if (remaining === 0) {
            return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Pagado</Badge>;
        }

        if (paid > 0) {
            return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pago Parcial</Badge>;
        }

        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Pendiente</Badge>;
    };

    return (
        <>
            <Head title="Créditos de Clientes" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Créditos de Clientes</h1>
                        <p className="text-muted-foreground">Registre pagos y controle los saldos pendientes de los clientes.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por cliente o RTN..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={filters.status || 'all'} onValueChange={(v) => handleFilterChange('status', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Estado de Crédito" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="pending">Pendientes</SelectItem>
                            <SelectItem value="partial">Pagos Parciales</SelectItem>
                            <SelectItem value="paid">Pagados</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div ref={containerRef} className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className={`min-w-[100px] sticky left-0 z-10 bg-card border-r border-border w-[100px] after:absolute after:right-[-8px] after:top-0 after:bottom-0 after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent dark:after:from-black/[0.2] pointer-events-none after:transition-opacity after:duration-200 ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}>ID</TableHead>
                                <TableHead className="min-w-[180px] pl-5">Cliente</TableHead>
                                <TableHead className="min-w-[140px]">Muestra</TableHead>
                                <TableHead className="min-w-[140px]">Monto Crédito</TableHead>
                                <TableHead className="min-w-[140px]">Monto Pagado</TableHead>
                                <TableHead className="min-w-[140px]">Saldo Pendiente</TableHead>
                                <TableHead className="min-w-[150px]">Fecha Creación</TableHead>
                                <TableHead className="min-w-[130px]">Estado</TableHead>
                                <TableHead className="min-w-[180px]">Facturas Asoc.</TableHead>
                                <TableHead className={`text-right sticky right-0 z-10 bg-card border-l border-border min-w-[100px] w-[100px] before:absolute before:left-[-8px] before:top-0 before:bottom-0 before:w-[8px] before:bg-gradient-to-r before:from-transparent before:to-black/[0.06] dark:before:to-black/[0.2] before:transition-opacity before:duration-200 ${showRightShadow ? 'before:opacity-100' : 'before:opacity-0'}`}>Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {credits.data.length > 0 ? (
                                credits.data.map((credit) => {
                                    const originalInvoice = credit.invoices?.find(inv => inv.payment_type === 'credit');
                                    const paymentInvoices = credit.invoices?.filter(inv => inv.payment_type !== 'credit') || [];
                                    const remainingVal = parseFloat(String(credit.amount_remaining));
                                    const isPaid = remainingVal === 0;
                                    const rowBgClass = isPaid ? 'bg-emerald-500/5 dark:bg-emerald-500/5 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/10' : '';
                                    const stickyBgClass = isPaid ? 'bg-[#f6fdf9] dark:bg-[#07180e] group-hover:bg-[#ebf8f0] dark:group-hover:bg-[#0b2416]' : 'bg-card group-hover:bg-muted/50';

                                    return (
                                        <TableRow key={credit.id} className={`group ${rowBgClass}`}>
                                            <TableCell className={`min-w-[100px] sticky left-0 z-10 ${stickyBgClass} transition-colors border-r border-border w-[100px] after:absolute after:right-[-8px] after:top-0 after:bottom-0 after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent dark:after:from-black/[0.2] pointer-events-none after:transition-opacity after:duration-200 ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}>
                                                <span className="font-mono text-xs font-semibold">#{credit.id}</span>
                                            </TableCell>
                                            <TableCell className="min-w-[180px] pl-5">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-foreground">{credit.customer?.name}</span>
                                                    <span className="text-xs text-muted-foreground">{credit.customer?.id_number}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-[140px]">
                                                {originalInvoice?.specimen ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono text-[10px] font-bold text-primary bg-primary/5 border border-primary/20 px-1.5 py-0.5 rounded">
                                                            {originalInvoice.specimen.sequence_code || `#${originalInvoice.specimen.id}`}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 hover:bg-muted"
                                                            onClick={() => router.get('/specimens', { specimen: originalInvoice.specimen?.sequence_code || String(originalInvoice.specimen?.id), action: 'view' })}
                                                            title="Ver Muestra"
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">N/A</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="min-w-[140px] font-mono font-semibold">
                                                L. {parseFloat(String(credit.credit_amount)).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="min-w-[140px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                                L. {parseFloat(String(credit.amount_paid)).toFixed(2)}
                                            </TableCell>
                                            <TableCell className={`min-w-[140px] font-mono font-semibold ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                                                L. {remainingVal.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="min-w-[150px] text-xs text-muted-foreground">
                                                {format(new Date(credit.created_at), 'dd/MM/yyyy h:mm a')}
                                            </TableCell>
                                            <TableCell className="min-w-[130px]">
                                                {getStatusBadge(credit)}
                                            </TableCell>
                                            <TableCell className="min-w-[180px]">
                                                <div className="flex flex-col gap-1 text-[11px]">
                                                    {originalInvoice && (
                                                        <a 
                                                            href={`/storage/${originalInvoice.invoice_file}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline flex items-center gap-1 font-semibold"
                                                        >
                                                            <FileText className="w-3 h-3" /> Original: {originalInvoice.full_invoice_number}
                                                        </a>
                                                    )}
                                                    {paymentInvoices.length > 0 && (
                                                        <div className="flex flex-col gap-0.5 text-muted-foreground">
                                                            <span className="font-medium text-[10px] flex items-center gap-1">
                                                                <History className="w-3 h-3 text-muted-foreground" /> Abonos ({paymentInvoices.length}):
                                                            </span>
                                                            {paymentInvoices.map(p => (
                                                                <a
                                                                    key={p.id}
                                                                    href={`/storage/${p.invoice_file}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="hover:text-primary hover:underline ml-3 flex items-center gap-0.5"
                                                                >
                                                                    {p.full_invoice_number} (L. {parseFloat(String(p.total)).toFixed(0)})
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className={`text-right sticky right-0 z-10 ${stickyBgClass} transition-colors border-l border-border min-w-[100px] w-[100px] before:absolute before:left-[-8px] before:top-0 before:bottom-0 before:w-[8px] before:bg-gradient-to-r before:from-transparent before:to-black/[0.06] dark:before:to-black/[0.2] before:transition-opacity before:duration-200 ${showRightShadow ? 'before:opacity-100' : 'before:opacity-0'}`}>
                                                <div className="flex justify-end gap-2">
                                                    {remainingVal > 0 && (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={() => handlePayClick(credit)}
                                                            className="h-8 border-primary text-primary hover:bg-primary/5 gap-1.5"
                                                        >
                                                            <CreditCard className="h-3.5 w-3.5" /> Pagar
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-24 text-center">
                                        No se encontraron créditos de clientes.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination 
                    links={credits.links} 
                    meta={{
                        from: credits.from,
                        to: credits.to,
                        total: credits.total
                    }} 
                    className="mt-2"
                />
            </div>

            <CreditSheet
                credit={selectedCredit}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
            />

            {/* DIÁLOGO DE IMPRESIÓN/VISTA PREVIA DE FACTURA DE ABONO */}
            <AlertDialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
                <AlertDialogContent className="max-w-[700px] w-full z-[100]" overlayClassName="z-[100]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" /> Factura de Abono Generada con Éxito
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            El pago de crédito ha sido registrado y la factura se generó en formato PDF. Puede descargarla, imprimirla o visualizarla a continuación.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {invoiceUrl && (
                        <div className="my-4 border rounded-lg overflow-hidden bg-muted">
                            <iframe
                                src={invoiceUrl}
                                className="w-full h-[400px] border-none"
                                title="Factura de Abono PDF"
                            />
                        </div>
                    )}

                    <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowInvoiceModal(false);
                                setInvoiceUrl(null);
                            }}
                            className="sm:order-1"
                        >
                            Cerrar
                        </Button>
                        <Button
                            onClick={() => {
                                if (invoiceUrl) {
                                    window.open(invoiceUrl, '_blank');
                                }
                            }}
                            className="sm:order-2"
                        >
                            <ExternalLink className="mr-2 h-4 w-4" /> Abrir en pestaña nueva
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
