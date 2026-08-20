import { Head, router } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import debounce from 'lodash/debounce';
import {
    Eye,
    Edit2,
    Search,
    Receipt,
    CreditCard,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    Check,
    Download,
    Plus,
    Layers,
    FileImage,
    FileText,
    ExternalLink,
    Clock,
    User,
    Tag,
    AlertCircle,
    Coins,
    Microscope,
    MoreVertical,
    ClipboardList,
    MessageSquare,
    Calendar,
    AlertOctagon,
    Ban,
    FolderMinus,
} from 'lucide-react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import * as React from 'react';
import { toast } from 'sonner';
import { index as invoicesIndex } from '@/actions/App/Http/Controllers/InvoiceController';
import { index as rentalsIndex } from '@/actions/App/Http/Controllers/RentalController';
import AsyncCustomerCombobox from '@/components/async-customer-combobox';
import CancelSpecimenDialog from '@/components/cancel-specimen-dialog';
import {
    DateRangePicker,
    setCookie,
    getLast2WeeksRange,
} from '@/components/date-range-picker';
import HeadingSheet from '@/components/heading-sheet';
import InvoicePreviewDialog from '@/components/invoice-preview-dialog';
import { Pagination } from '@/components/pagination';
import SelectSpecimenGroupDialog from '@/components/select-specimen-group-dialog';
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
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import CreditExtractSpecimenSheet from '../credits/credit-extract-specimen-sheet';
import CreditFinalPaymentSheet from '../credits/credit-final-payment-sheet';
import WorkOrderSheet from '../my-work-orders/work-order-sheet';
import SpecimenGroupSheet from '../specimens/specimen-group-sheet';
import SpecimenGroupViewSheet from '../specimens/specimen-group-view-sheet';
import SpecimenSheet from '../specimens/specimen-sheet';
import SpecimenViewSheet from '../specimens/specimen-view-sheet';
import InvoiceSheet from './invoice-sheet';
import InvoiceViewSheet from './invoice-view-sheet';

interface Invoice {
    id: number;
    full_invoice_number: string | null;
    invoice_number: number | string | null;
    cai_range_id: number | null;
    cai_range: any;
    customer_id: number;
    customer: any;
    specimen_id: number;
    specimen: any;
    invoice_type?: string | null;
    rental_id?: number | null;
    rental?: { id: number; name: string; description?: string } | null;
    payment_type:
        | 'cash'
        | 'card'
        | 'credit card'
        | 'transfer'
        | 'bank transfer'
        | 'credit'
        | 'check';
    credit_payment_id: number | null;
    credit_relation: any;
    amount: string | number;
    discount: string | number;
    subtotal: string | number;
    exempt_amount: string | number;
    total: string | number;
    total_paid: string | number;
    proof_of_payment: string | null;
    invoice_file: string | null;
    invoice_date?: string | null;
    created_at: string;
    group?: any;
    quantity?: number;
    age_discount_type?: string | null;
    age_discount_amount?: string | number | null;
    isv_15?: string | number | null;
    is_group?: boolean;
    group_id?: number | null;
    invoice_specimens?: any[];
    invoiceSpecimens?: any[];
    credit_invoice_specimens?: any[];
    group_specimens?: any[];
}

interface Props {
    invoices: {
        data: Invoice[];
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
        payment_type?: string;
        customer_id?: string;
        specimen_type_id?: string;
        status?: string;
        examination_id?: string;
        has_credit?: string;
        date_from?: string;
        date_to?: string;
        sort_field?: string;
        sort_direction?: 'asc' | 'desc';
        group_id?: string;
        invoice_type?: string;
    };
    selectedCustomer?: {
        id: number;
        name: string;
    } | null;
    specimenTypes: {
        id: number;
        name: string;
    }[];
    banks: {
        id: number;
        name: string;
    }[];
    examinations: any[];
    groups?: {
        id: number;
        name: string;
    }[];
    categories: any[];
    referrers: any[];
    referrerTypes: any[];
    priorities: any[];
    locations: any[];
    sequences: any[];
    activeLocationId: number | null;
    products: any[];
    settings?: Record<string, string>;
    workOrderTypes?: any[];
    workOrderTasks?: any[];
    usersList?: any[];
}

function FormCombobox({
    options,
    value,
    onChange,
    placeholder,
    emptyMessage = 'No se encontraron resultados.',
    disabled = false,
}: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    emptyMessage?: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild className="w-full">
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between text-left font-normal"
                    disabled={disabled}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
            >
                <Command>
                    <CommandInput placeholder={`Buscar...`} />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4 shrink-0',
                                            value === option.value
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    <span className="truncate">
                                        {option.label}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

const ALL_STATUSES = [
    {
        value: 'active',
        label: 'Activas (Recibida, Rev. Macro, Proceso, Rev. Micro)',
    },
    { value: 'received', label: 'Recibida' },
    { value: 'macroscopic_review', label: 'Rev. Macroscópica' },
    { value: 'processing', label: 'En Proceso' },
    { value: 'microscopic_review', label: 'Rev. Microscópica' },
    { value: 'finalized', label: 'Finalizada' },
    { value: 'delivered', label: 'Entregada' },
    { value: 'cancelled', label: 'Cancelada' },
];

function getInvoiceDisplayValues(
    invoice: any,
    filters: { date_from?: string; date_to?: string },
) {
    const isGroup = Boolean(invoice.is_group || invoice.group);

    if (!isGroup) {
        return {
            amount: parseFloat(String(invoice.amount || 0)),
            quantity: invoice.quantity ?? 1,
            subtotal: parseFloat(String(invoice.subtotal || 0)),
            discount: parseFloat(String(invoice.discount || 0)),
            isv_15: parseFloat(String(invoice.isv_15 || 0)),
            total: parseFloat(String(invoice.total || 0)),
            total_paid: parseFloat(String(invoice.total_paid || 0)),
            age_discount_amount: parseFloat(
                String(invoice.age_discount_amount || 0),
            ),
            age_discount_type: invoice.age_discount_type,
            groupText: null,
            isGroupFiltered: false,
            specimensInRangeMap: null as Record<number, boolean> | null,
            inRangeCount: 0,
            totalGroupCount: 0,
        };
    }

    const allGroupSpecimens = invoice.group?.specimens || [];
    const totalGroupCount = allGroupSpecimens.length;
    const dateFrom = filters.date_from || '';
    const dateTo = filters.date_to || '';
    const hasDateFilter = Boolean(dateFrom || dateTo);

    const isCredit = invoice.payment_type === 'credit';
    const breakdownRecords =
        invoice.invoice_specimens ||
        invoice.invoiceSpecimens ||
        (isCredit
            ? invoice.credit_invoice_specimens ||
              invoice.creditInvoiceSpecimens ||
              []
            : invoice.group_specimens || invoice.groupSpecimens || []);

    const breakdownBySpecimenId: Record<number, any> = {};
    breakdownRecords.forEach((b: any) => {
        if (b.specimen_id) {
            breakdownBySpecimenId[b.specimen_id] = b;
        }
    });

    const specimensInRangeMap: Record<number, boolean> = {};
    let inRangeCount = 0;

    allGroupSpecimens.forEach((specimen: any) => {
        const breakdown = breakdownBySpecimenId[specimen.id];
        const rawDate = specimen.created_at;
        const dateStr = rawDate ? String(rawDate).substring(0, 10) : '';

        let inRange = true;

        if (hasDateFilter) {
            if (dateFrom && dateStr < dateFrom) {
                inRange = false;
            }

            if (dateTo && dateStr > dateTo) {
                inRange = false;
            }
        }

        specimensInRangeMap[specimen.id] = inRange;

        if (inRange) {
            inRangeCount++;
        }
    });

    let amount = 0;
    let quantity = 0;
    let subtotal = 0;
    let discount = 0;
    let isv_15 = 0;
    let total = 0;
    let total_paid = 0;
    let age_discount_amount = 0;

    if (hasDateFilter && breakdownRecords.length > 0) {
        breakdownRecords.forEach((b: any) => {
            const rawDate = b.specimen?.created_at;
            const dateStr = rawDate ? String(rawDate).substring(0, 10) : '';
            let inRange = true;

            if (dateFrom && dateStr < dateFrom) {
                inRange = false;
            }

            if (dateTo && dateStr > dateTo) {
                inRange = false;
            }

            if (inRange) {
                const qty = b.quantity ?? 1;
                const itemAmount = parseFloat(String(b.amount || 0)) * qty;
                const itemSubtotal = parseFloat(String(b.subtotal || 0));
                const itemDiscount = parseFloat(String(b.discount || 0)) * qty;
                const itemIsv = parseFloat(String(b.isv_15 || 0));
                const itemTotal = parseFloat(String(b.total || 0));
                const itemPaid = isCredit
                    ? b.is_paid
                        ? itemTotal
                        : 0
                    : itemTotal;
                const itemAgeDisc =
                    parseFloat(String(b.age_discount_amount || 0)) * qty;

                amount += itemAmount;
                quantity += qty;
                subtotal += itemSubtotal;
                discount += itemDiscount;
                isv_15 += itemIsv;
                total += itemTotal;
                total_paid += itemPaid;
                age_discount_amount += itemAgeDisc;
            }
        });
    } else {
        amount = parseFloat(String(invoice.amount || 0));
        quantity = invoice.quantity ?? totalGroupCount;
        subtotal = parseFloat(String(invoice.subtotal || 0));
        discount = parseFloat(String(invoice.discount || 0));
        isv_15 = parseFloat(String(invoice.isv_15 || 0));
        total = parseFloat(String(invoice.total || 0));
        total_paid = parseFloat(String(invoice.total_paid || 0));
        age_discount_amount = parseFloat(
            String(invoice.age_discount_amount || 0),
        );
    }

    const groupText = hasDateFilter
        ? `Grupo de Muestras (${inRangeCount} de ${totalGroupCount} muestras)`
        : `Grupo de Muestras (${totalGroupCount} muestras)`;

    return {
        amount,
        quantity,
        subtotal,
        discount,
        isv_15,
        total,
        total_paid,
        age_discount_amount,
        age_discount_type: invoice.age_discount_type,
        groupText,
        isGroupFiltered: hasDateFilter,
        specimensInRangeMap,
        inRangeCount,
        totalGroupCount,
    };
}

const getSpecimenDateRangeText = (
    invoice: any,
    filters: { date_from?: string; date_to?: string },
) => {
    if (!invoice.is_group) {
        return null;
    }

    const dateFrom = filters.date_from || '';
    const dateTo = filters.date_to || '';

    if (!dateFrom && !dateTo) {
        return null;
    }

    const invoiceDateStr = invoice.created_at
        ? String(invoice.created_at).substring(0, 10)
        : '';
    const isOutsideRange =
        (dateFrom && invoiceDateStr < dateFrom) ||
        (dateTo && invoiceDateStr > dateTo);

    if (!isOutsideRange) {
        return null;
    }

    const creditSpecs =
        invoice.invoice_specimens ||
        invoice.invoiceSpecimens ||
        invoice.credit_invoice_specimens ||
        invoice.creditInvoiceSpecimens;
    const groupSpecs = invoice.group_specimens || invoice.groupSpecimens;

    let specimens: { code: string; date: string; time: string }[] = [];

    if (invoice.payment_type === 'credit' && creditSpecs) {
        specimens = creditSpecs
            .map((cis: any) => {
                if (!cis.specimen) {
                    return null;
                }

                const specDateStr = cis.specimen.created_at
                    ? String(cis.specimen.created_at).substring(0, 10)
                    : '';
                let inRange = true;

                if (dateFrom && specDateStr < dateFrom) {
                    inRange = false;
                }

                if (dateTo && specDateStr > dateTo) {
                    inRange = false;
                }

                if (!inRange) {
                    return null;
                }

                const formattedDate = format(
                    new Date(cis.specimen.created_at),
                    'dd/MM/yyyy',
                    { locale: es },
                );
                const formattedTime = format(
                    new Date(cis.specimen.created_at),
                    'h:mm a',
                    { locale: es },
                );

                return {
                    code: cis.specimen.sequence_code,
                    date: formattedDate,
                    time: formattedTime,
                };
            })
            .filter(
                (s: any): s is { code: string; date: string; time: string } =>
                    s !== null,
            );
    } else if (groupSpecs) {
        specimens = groupSpecs
            .map((gs: any) => {
                if (!gs.specimen) {
                    return null;
                }

                const specDateStr = gs.specimen.created_at
                    ? String(gs.specimen.created_at).substring(0, 10)
                    : '';
                let inRange = true;

                if (dateFrom && specDateStr < dateFrom) {
                    inRange = false;
                }

                if (dateTo && specDateStr > dateTo) {
                    inRange = false;
                }

                if (!inRange) {
                    return null;
                }

                const formattedDate = format(
                    new Date(gs.specimen.created_at),
                    'dd/MM/yyyy',
                    { locale: es },
                );
                const formattedTime = format(
                    new Date(gs.specimen.created_at),
                    'h:mm a',
                    { locale: es },
                );

                return {
                    code: gs.specimen.sequence_code,
                    date: formattedDate,
                    time: formattedTime,
                };
            })
            .filter(
                (s: any): s is { code: string; date: string; time: string } =>
                    s !== null,
            );
    }

    if (specimens.length === 0) {
        return null;
    }

    return (
        <div className="mt-1 flex w-full flex-col gap-1">
            {specimens.map((spec, index) => (
                <div
                    key={index}
                    className="flex w-fit flex-col items-start justify-center gap-0.5"
                >
                    <span className="font-mono text-[9px] font-semibold text-blue-800 dark:text-blue-400">
                        {spec.code}:
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span>{spec.date}</span>
                        <span className="font-mono text-[9px] text-muted-foreground/80 before:mr-1 before:content-['•']">
                            {spec.time}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default function InvoicesIndex({
    invoices,
    filters,
    selectedCustomer,
    specimenTypes,
    banks,
    examinations,
    categories,
    referrers,
    referrerTypes,
    priorities,
    locations,
    sequences,
    activeLocationId,
    products,
    groups,
    settings,
    workOrderTypes = [],
    workOrderTasks = [],
    usersList = [],
}: Props) {
    const { props } = usePage() as any;
    const { auth } = props;
    const flash = props.flash || {};

    const canCreateSpecimen = auth.permissions?.includes('specimens.create');
    const canViewSpecimen = auth.permissions?.includes('specimens.view');
    const canEditSpecimen = auth.permissions?.includes('specimens.edit');
    const canManageInvoices = auth.permissions?.includes('invoices.manage');
    const canManageCredits = auth.permissions?.includes('credits.manage');
    const canCreateWorkOrders =
        auth.permissions?.includes('work_orders.create');

    const pageTotals = useMemo(() => {
        let gross = 0;
        let isv = 0;
        let discount = 0;
        let paid = 0;

        invoices.data.forEach((inv) => {
            const displayValues = getInvoiceDisplayValues(inv, filters);
            gross += displayValues.total;
            isv += displayValues.isv_15;
            discount += displayValues.discount;
            paid += displayValues.total_paid;
        });

        return {
            gross,
            isv,
            discount,
            pending: gross - paid,
            paid,
        };
    }, [invoices.data, filters]);

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(
        null,
    );
    const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
    const [isFinalPaymentSheetOpen, setIsFinalPaymentSheetOpen] =
        useState(false);
    const [selectedCreditForFinalPayment, setSelectedCreditForFinalPayment] =
        useState<any | null>(null);
    const [isExtractSpecimenSheetOpen, setIsExtractSpecimenSheetOpen] =
        useState(false);
    const [
        selectedCreditForExtractSpecimen,
        setSelectedCreditForExtractSpecimen,
    ] = useState<any | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const handlePayFinalClick = (credit: any) => {
        setSelectedCreditForFinalPayment(credit);
        setIsFinalPaymentSheetOpen(true);
    };

    const handleExtractSpecimenClick = (credit: any) => {
        setSelectedCreditForExtractSpecimen(credit);
        setIsExtractSpecimenSheetOpen(true);
    };
    const [isCancellationReasonSheetOpen, setIsCancellationReasonSheetOpen] =
        useState(false);
    const [
        selectedInvoiceForCancellationReason,
        setSelectedInvoiceForCancellationReason,
    ] = useState<any | null>(null);

    const [isSpecimenSheetOpen, setIsSpecimenSheetOpen] = useState(false);
    const [selectedSpecimen, setSelectedSpecimen] = useState<any | null>(null);
    const [selectedSpecimenForView, setSelectedSpecimenForView] = useState<
        any | null
    >(null);
    const [selectedSpecimenIdForView, setSelectedSpecimenIdForView] = useState<
        number | null
    >(null);
    const [isSpecimenViewSheetOpen, setIsSpecimenViewSheetOpen] =
        useState(false);

    const [selectedGroupForView, setSelectedGroupForView] = useState<
        any | null
    >(null);
    const [isGroupViewSheetOpen, setIsGroupViewSheetOpen] = useState(false);
    const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);
    const [isGroupSheetOpen, setIsGroupSheetOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
    const [specimenSearchQuery, setSpecimenSearchQuery] = useState('');
    const [isSelectGroupDialogOpen, setIsSelectGroupDialogOpen] =
        useState(false);

    const [isWorkOrderSheetOpen, setIsWorkOrderSheetOpen] = useState(false);
    const [selectedSpecimenForWorkOrder, setSelectedSpecimenForWorkOrder] =
        useState<number | null>(null);

    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
    const [paymentInvoiceUrl, setPaymentInvoiceUrl] = useState<string | null>(
        null,
    );
    const [isGroupInvoice, setIsGroupInvoice] = useState(false);
    const [
        selectedSpecimenIdsForWorkOrder,
        setSelectedSpecimenIdsForWorkOrder,
    ] = useState<number[] | null>(null);
    const [groupSpecimenSelections, setGroupSpecimenSelections] = useState<
        Record<number, number[]>
    >({});

    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [specimenToCancel, setSpecimenToCancel] = useState<any | null>(null);

    const specimensInGroupToCancel = useMemo(() => {
        if (!specimenToCancel || !specimenToCancel.group_id) {
            return [];
        }

        const invoice = invoices.data.find(
            (inv) =>
                inv.specimen_id === specimenToCancel.id ||
                inv.group?.specimens?.some(
                    (s: any) => s.id === specimenToCancel.id,
                ),
        );

        return invoice?.group?.specimens || [];
    }, [specimenToCancel, invoices.data]);

    const handleCancelClick = (specimen: any) => {
        setSpecimenToCancel(specimen);
        setIsCancelDialogOpen(true);
    };

    const handleCloseCancelDialog = () => {
        setIsCancelDialogOpen(false);
        setSpecimenToCancel(null);
    };

    const getInvoiceSpecimens = (invoice: Invoice) => {
        if (invoice.group?.specimens && invoice.group.specimens.length > 0) {
            return invoice.group.specimens;
        }

        if (invoice.specimen || invoice.specimen_id) {
            return [invoice.specimen || { id: invoice.specimen_id }];
        }

        return [];
    };

    const handleCreateWorkOrder = (specimenId: number) => {
        setSelectedSpecimenForWorkOrder(specimenId);
        setSelectedSpecimenIdsForWorkOrder(null);
        setIsWorkOrderSheetOpen(true);
    };

    const handleCreateBulkWorkOrders = (specimenIds: number[]) => {
        setSelectedSpecimenForWorkOrder(null);
        setSelectedSpecimenIdsForWorkOrder(specimenIds);
        setIsWorkOrderSheetOpen(true);
    };

    const getSelectedSpecimensForInvoice = (invoice: Invoice) => {
        const allSpecimens = getInvoiceSpecimens(invoice);
        const allIds = allSpecimens.map((s: any) => s.id).filter(Boolean);

        if (groupSpecimenSelections[invoice.id] !== undefined) {
            return groupSpecimenSelections[invoice.id];
        }

        return allIds;
    };

    const toggleSpecimenForInvoice = (
        invoiceId: number,
        specimenId: number,
        allIds: number[],
    ) => {
        const current = groupSpecimenSelections[invoiceId] ?? allIds;
        const isSelected = current.includes(specimenId);
        const next = isSelected
            ? current.filter((id) => id !== specimenId)
            : [...current, specimenId];

        setGroupSpecimenSelections((prev) => ({
            ...prev,
            [invoiceId]: next,
        }));
    };

    const toggleAllSpecimensForInvoice = (
        invoiceId: number,
        allIds: number[],
    ) => {
        const current = groupSpecimenSelections[invoiceId] ?? allIds;
        const isAllSelected = current.length === allIds.length;
        const next = isAllSelected ? [] : allIds;

        setGroupSpecimenSelections((prev) => ({
            ...prev,
            [invoiceId]: next,
        }));
    };

    useEffect(() => {
        if (flash.new_specimen_id) {
            const specId = parseInt(flash.new_specimen_id);
            const foundInvoice = invoices.data.find(
                (inv) => inv.specimen_id === specId,
            );

            if (foundInvoice && foundInvoice.specimen) {
                const specimenWithInvoice = {
                    ...foundInvoice.specimen,
                    invoice_relation: {
                        ...foundInvoice,
                        specimen: undefined,
                    },
                };
                setIsSpecimenSheetOpen(false);
                setSelectedSpecimen(null);
                setSelectedSpecimenForView(specimenWithInvoice);
                setIsSpecimenViewSheetOpen(true);
            }
        }
    }, [flash.new_specimen_id, invoices.data]);

    useEffect(() => {
        if (flash.new_invoice_url) {
            setInvoiceUrl(flash.new_invoice_url);
            setPaymentInvoiceUrl(flash.new_payment_invoice_url || null);
            setIsGroupInvoice(!flash.new_specimen_id);
            setShowInvoiceModal(true);
        }
    }, [
        flash.new_invoice_url,
        flash.new_payment_invoice_url,
        flash.new_specimen_id,
    ]);

    const containerRef = useRef<HTMLDivElement>(null);
    const [showLeftShadow, setShowLeftShadow] = useState(false);
    const [showRightShadow, setShowRightShadow] = useState(false);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        const scrollContainer =
            container.querySelector('.relative.w-full.overflow-auto') ||
            container;

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
    }, [invoices.data]);

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };

        if (value === 'all' || value === '') {
            delete newFilters[key as keyof typeof filters];
        }

        const userId = auth?.user?.id;

        if (userId) {
            if (key === 'status') {
                setCookie(`status_filter_invoices_user_${userId}`, value);
            } else if (key === 'specimen_type_id') {
                setCookie(
                    `specimen_type_filter_invoices_user_${userId}`,
                    value,
                );
                const examId = filters.examination_id || 'all';

                if (value !== 'all' && examId !== 'all') {
                    const hasValidExam = examinations.some(
                        (exam) =>
                            exam.id.toString() === examId &&
                            exam.specimen_type?.toString() === value,
                    );

                    if (!hasValidExam) {
                        delete newFilters.examination_id;
                        setCookie(
                            `examination_filter_invoices_user_${userId}`,
                            'all',
                        );
                    }
                } else if (value === 'all') {
                    delete newFilters.examination_id;
                    setCookie(
                        `examination_filter_invoices_user_${userId}`,
                        'all',
                    );
                }
            } else if (key === 'examination_id') {
                setCookie(`examination_filter_invoices_user_${userId}`, value);
            }
        }

        router.get(invoicesIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const handleExport = (format: 'csv' | 'xlsx') => {
        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, String(value));
            }
        });
        queryParams.set('format', format);
        window.location.href = `/invoices/export?${queryParams.toString()}`;
    };

    const handleSort = (field: string) => {
        const isCurrentField =
            filters.sort_field === field ||
            (field === 'date' && !filters.sort_field);
        const direction =
            isCurrentField && filters.sort_direction === 'asc' ? 'desc' : 'asc';

        const newFilters = {
            ...filters,
            sort_field: field,
            sort_direction: direction,
        };

        router.get(invoicesIndex().url, newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const renderSortHeader = (field: string, label: string) => {
        const isSorted =
            filters.sort_field === field ||
            (field === 'date' && !filters.sort_field);
        const direction = isSorted ? filters.sort_direction || 'desc' : null;

        return (
            <button
                onClick={() => handleSort(field)}
                className="group/btn flex items-center gap-1.5 text-left font-semibold transition-colors hover:text-foreground"
            >
                <span>{label}</span>
                {direction === 'asc' ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-primary" />
                ) : direction === 'desc' ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover/btn:opacity-100" />
                )}
            </button>
        );
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

    const handleViewDetails = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setIsSheetOpen(true);
    };

    const handleEditDetails = (invoice: Invoice) => {
        setInvoiceToEdit(invoice);
        setIsEditSheetOpen(true);
    };

    const getPaymentTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            cash: 'Efectivo',
            card: 'Tarjeta de Crédito',
            'credit card': 'Tarjeta de Crédito',
            transfer: 'Transferencia Bancaria',
            'bank transfer': 'Transferencia Bancaria',
            check: 'Cheque',
            credit: 'Crédito',
        };

        return labels[type] || type;
    };

    const getPaymentBadge = (type: string) => {
        switch (type) {
            case 'cash':
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                    >
                        Efectivo
                    </Badge>
                );
            case 'card':
            case 'credit card':
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400"
                    >
                        Tarjeta de Crédito
                    </Badge>
                );
            case 'transfer':
            case 'bank transfer':
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full border-purple-200 bg-purple-50 px-2.5 py-0.5 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-400"
                    >
                        Transferencia Bancaria
                    </Badge>
                );
            case 'check':
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
                    >
                        Cheque
                    </Badge>
                );
            case 'credit':
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full border-rose-200 bg-rose-50 px-2.5 py-0.5 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
                    >
                        Crédito
                    </Badge>
                );
            case 'n/a':
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-0.5 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400"
                    >
                        N/A
                    </Badge>
                );
            default:
                return (
                    <Badge
                        variant="outline"
                        className="rounded-full px-2.5 py-0.5"
                    >
                        {type}
                    </Badge>
                );
        }
    };

    const getInvoiceTypeBadge = (type: string | null | undefined) => {
        if (type === 'specimen') {
            return (
                <Badge
                    variant="outline"
                    className="rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400"
                >
                    Muestra
                </Badge>
            );
        }

        if (type === 'rental') {
            return (
                <Badge
                    variant="outline"
                    className="rounded-full border-sky-200 bg-sky-50 px-2.5 py-0.5 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-400"
                >
                    Otro Cobro
                </Badge>
            );
        }

        if (type === 'cancelled') {
            return (
                <Badge
                    variant="outline"
                    className="rounded-full border-red-200 bg-red-50 px-2.5 py-0.5 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
                >
                    Cancelada
                </Badge>
            );
        }

        if (type === 'social security') {
            return (
                <Badge
                    variant="outline"
                    className="rounded-full border-teal-200 bg-teal-50 px-2.5 py-0.5 text-teal-700 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-400"
                >
                    Seguro
                </Badge>
            );
        }

        return (
            <Badge
                variant="outline"
                className="rounded-full border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-400"
            >
                Pago de crédito
            </Badge>
        );
    };

    return (
        <>
            <Head title="Facturas de Muestras" />
            <div className="mb-20 flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Receipt className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">
                                Facturación
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Administre y consulte las facturas fiscales y
                            transacciones emitidas en el laboratorio.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            className="h-10 gap-2"
                            onClick={() => {
                                const userId = auth?.user?.id;

                                if (userId) {
                                    const defaultRange = getLast2WeeksRange();
                                    setCookie(
                                        `status_filter_invoices_user_${userId}`,
                                        'active',
                                    );
                                    setCookie(
                                        `specimen_type_filter_invoices_user_${userId}`,
                                        'all',
                                    );
                                    setCookie(
                                        `examination_filter_invoices_user_${userId}`,
                                        'all',
                                    );
                                    setCookie(
                                        `date_filter_invoices_user_${userId}`,
                                        JSON.stringify({
                                            range: '14_days',
                                            from: defaultRange.from,
                                            to: defaultRange.to,
                                        }),
                                    );
                                }

                                router.get(
                                    invoicesIndex().url,
                                    {},
                                    {
                                        preserveState: false,
                                    },
                                );
                            }}
                        >
                            Limpiar filtros
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="h-10 gap-2"
                                >
                                    <Download className="h-4 w-4" />
                                    <span>Exportar</span>
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                    onClick={() => handleExport('csv')}
                                >
                                    Exportar a CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleExport('xlsx')}
                                >
                                    Exportar a Excel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {canCreateSpecimen && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button className="h-10 gap-2">
                                        <Plus className="h-4 w-4" />
                                        <span>Nueva Muestra</span>
                                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-56"
                                >
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedSpecimen(null);
                                            setIsSpecimenSheetOpen(true);
                                        }}
                                    >
                                        <Microscope className="mr-2 h-4 w-4 text-muted-foreground" />
                                        <span>Muestra Individual</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            setIsGroupSheetOpen(true)
                                        }
                                    >
                                        <Layers className="mr-2 h-4 w-4 text-muted-foreground" />
                                        <span>Grupo de Muestras</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            setIsSelectGroupDialogOpen(true)
                                        }
                                    >
                                        <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
                                        <span>Agregar a Grupo Existente</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {/* Filters Area - Search on Row 1, other filters on Row 2 */}
                <div className="flex w-full flex-col gap-4">
                    {/* Row 1: Search */}
                    <div className="flex flex-row items-end justify-stretch gap-3">
                        <div className="relative w-full">
                            <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por Nº Factura, cliente, RTN o muestra..."
                                className="w-full pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex w-full max-w-[320px] flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Rango de Fechas
                            </span>
                            <DateRangePicker
                                cookieKey="date_filter_invoices"
                                value={{
                                    from: filters.date_from || '',
                                    to: filters.date_to || '',
                                }}
                                onChange={(range) => {
                                    const newFilters = { ...filters };

                                    if (range.from) {
                                        newFilters.date_from = range.from;
                                    } else {
                                        delete newFilters.date_from;
                                    }

                                    if (range.to) {
                                        newFilters.date_to = range.to;
                                    } else {
                                        delete newFilters.date_to;
                                    }

                                    router.get(
                                        invoicesIndex().url,
                                        newFilters,
                                        {
                                            preserveState: true,
                                            replace: true,
                                        },
                                    );
                                }}
                            />
                        </div>
                    </div>

                    {/* Row 2: Advanced filters */}
                    <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Método de Pago
                            </span>
                            <Select
                                value={filters.payment_type || 'all'}
                                onValueChange={(v) =>
                                    handleFilterChange('payment_type', v)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Método de Pago" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todos los métodos
                                    </SelectItem>
                                    <SelectItem value="cash">
                                        Efectivo
                                    </SelectItem>
                                    <SelectItem value="credit card">
                                        Tarjeta
                                    </SelectItem>
                                    <SelectItem value="bank transfer">
                                        Transferencia
                                    </SelectItem>
                                    <SelectItem value="check">
                                        Cheque
                                    </SelectItem>
                                    <SelectItem value="credit">
                                        Crédito
                                    </SelectItem>
                                    <SelectItem value="n/a">N/A</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Cliente
                            </span>
                            <AsyncCustomerCombobox
                                value={filters.customer_id || ''}
                                onChange={(id) =>
                                    handleFilterChange('customer_id', id || '')
                                }
                                placeholder="Filtrar por cliente"
                                initialCustomer={selectedCustomer || undefined}
                                allowClear
                            />
                        </div>
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-medium font-semibold text-muted-foreground">
                                ¿Tiene Crédito?
                            </span>
                            <Select
                                value={filters.has_credit || 'all'}
                                onValueChange={(v) =>
                                    handleFilterChange('has_credit', v)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Crédito" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="yes">
                                        Con Crédito
                                    </SelectItem>
                                    <SelectItem value="no">
                                        Sin Crédito
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Tipo de Factura
                            </span>
                            <Select
                                value={filters.invoice_type || 'all'}
                                onValueChange={(v) =>
                                    handleFilterChange('invoice_type', v)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Tipo de Factura" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todos los tipos
                                    </SelectItem>
                                    <SelectItem value="specimen">
                                        Muestra
                                    </SelectItem>
                                    <SelectItem value="rental">
                                        Otro Cobro
                                    </SelectItem>
                                    <SelectItem value="credit payment">
                                        Pago de Crédito
                                    </SelectItem>
                                    <SelectItem value="social security">
                                        Seguro
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-full flex-col gap-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Grupo
                            </span>
                            <Popover
                                open={isGroupFilterOpen}
                                onOpenChange={setIsGroupFilterOpen}
                            >
                                <PopoverTrigger asChild className="w-full">
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={isGroupFilterOpen}
                                        className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <span className="truncate">
                                                {(filters.group_id || 'all') ===
                                                'all'
                                                    ? 'Todos los grupos'
                                                    : (() => {
                                                          const g =
                                                              groups?.find(
                                                                  (g) =>
                                                                      g.id.toString() ===
                                                                      filters.group_id,
                                                              );

                                                          return g
                                                              ? `${g.name} (#${g.id})`
                                                              : 'Grupo seleccionado';
                                                      })()}
                                            </span>
                                        </div>
                                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[--radix-popover-trigger-width] p-0"
                                    align="start"
                                >
                                    <Command>
                                        <CommandInput placeholder="Buscar grupo..." />
                                        <CommandList>
                                            <CommandEmpty>
                                                No se encontraron grupos.
                                            </CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    value="todos"
                                                    onSelect={() => {
                                                        handleFilterChange(
                                                            'group_id',
                                                            'all',
                                                        );
                                                        setIsGroupFilterOpen(
                                                            false,
                                                        );
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            (filters.group_id ||
                                                                'all') === 'all'
                                                                ? 'opacity-100'
                                                                : 'opacity-0',
                                                        )}
                                                    />
                                                    Todos los grupos
                                                </CommandItem>
                                                {groups?.map((group) => (
                                                    <CommandItem
                                                        key={group.id}
                                                        value={`${group.name} - ${group.id}`}
                                                        onSelect={() => {
                                                            handleFilterChange(
                                                                'group_id',
                                                                group.id.toString(),
                                                            );
                                                            setIsGroupFilterOpen(
                                                                false,
                                                            );
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 h-4 w-4',
                                                                filters.group_id ===
                                                                    group.id.toString()
                                                                    ? 'opacity-100'
                                                                    : 'opacity-0',
                                                            )}
                                                        />
                                                        {group.name} (#
                                                        {group.id})
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>

                {/* Table - Consistent with customer layout */}
                <div ref={containerRef} className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead
                                    className={`z-10 w-[150px] min-w-[150px] border-r border-border bg-card after:top-0 after:right-[-8px] after:bottom-0 after:hidden after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent after:transition-opacity after:duration-200 md:sticky md:left-0 md:after:absolute dark:after:from-black/[0.2] ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}
                                >
                                    {renderSortHeader(
                                        'invoice_number',
                                        'Nº Factura',
                                    )}
                                </TableHead>
                                <TableHead className="min-w-[300px] pl-5">
                                    <div className="flex flex-col gap-0.5 py-1">
                                        <span className="text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
                                            Ordenar por
                                        </span>
                                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
                                            <div className="text-left">
                                                {renderSortHeader(
                                                    'invoice_date',
                                                    'Fecha Factura',
                                                )}
                                            </div>
                                            <span className="text-muted-foreground/30">
                                                |
                                            </span>
                                            <div className="text-left">
                                                {renderSortHeader(
                                                    'date',
                                                    'Fecha Creación',
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </TableHead>
                                <TableHead className="min-w-[200px] pl-5">
                                    {renderSortHeader('customer', 'Cliente')}
                                </TableHead>
                                <TableHead className="min-w-[150px]">
                                    {renderSortHeader(
                                        'payment_method',
                                        'Método de Pago',
                                    )}
                                </TableHead>
                                <TableHead className="min-w-[220px]">
                                    {renderSortHeader(
                                        'specimen_code',
                                        'Tipo de factura',
                                    )}
                                </TableHead>
                                <TableHead className="min-w-[220px]">
                                    {renderSortHeader(
                                        'specimen_code',
                                        'Detalle',
                                    )}
                                </TableHead>
                                <TableHead className="min-w-[120px] text-right">
                                    <div className="flex">Crédito</div>
                                </TableHead>
                                <TableHead className="min-w-[120px] text-right">
                                    <div className="flex justify-end">
                                        Precio
                                    </div>
                                </TableHead>
                                <TableHead className="min-w-[100px] text-right">
                                    <div className="flex justify-end">
                                        Cantidad
                                    </div>
                                </TableHead>
                                <TableHead className="min-w-[120px] text-right">
                                    <div className="flex justify-end">
                                        Subtotal
                                    </div>
                                </TableHead>
                                <TableHead className="min-w-[150px] text-right">
                                    <div className="flex justify-end">
                                        Descuento
                                    </div>
                                </TableHead>
                                <TableHead className="min-w-[120px] text-right">
                                    <div className="flex justify-end">
                                        ISV 15%
                                    </div>
                                </TableHead>
                                <TableHead className="min-w-[120px] text-right">
                                    <div className="flex justify-end">
                                        Total Factura
                                    </div>
                                </TableHead>

                                <TableHead className="min-w-[120px] text-right">
                                    <div className="flex justify-end">
                                        Total Pagado
                                    </div>
                                </TableHead>
                                <TableHead className="z-10 w-[80px] min-w-[80px] bg-card text-right md:sticky md:right-0">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.data.length > 0 ? (
                                invoices.data.map((invoice) => {
                                    const displayValues =
                                        getInvoiceDisplayValues(
                                            invoice,
                                            filters,
                                        );

                                    return (
                                        <TableRow
                                            key={invoice.id}
                                            className="group"
                                        >
                                            <TableCell
                                                className={`pointer-events-none z-10 w-[150px] min-w-[150px] border-r border-border bg-card transition-colors group-hover:bg-muted after:top-0 after:right-[-8px] after:bottom-0 after:hidden after:w-[8px] after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent after:transition-opacity after:duration-200 md:sticky md:left-0 md:after:absolute dark:after:from-black/[0.2] ${showLeftShadow ? 'after:opacity-100' : 'after:opacity-0'}`}
                                            >
                                                <span className="font-mono text-sm font-semibold text-foreground">
                                                    {invoice.full_invoice_number ||
                                                        '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="min-w-[300px] pl-5">
                                                <div className="flex flex-col gap-1">
                                                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[10px]">
                                                        <div className="text-left">
                                                            <div className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                                                                <span>
                                                                    {invoice.invoice_date
                                                                        ? format(
                                                                              new Date(
                                                                                  invoice.invoice_date,
                                                                              ),
                                                                              'dd/MM/yyyy',
                                                                              {
                                                                                  locale: es,
                                                                              },
                                                                          )
                                                                        : '-'}
                                                                </span>
                                                                {invoice.invoice_date && (
                                                                    <span className="font-mono text-[9px] text-muted-foreground/75 before:mr-1 before:content-['•']">
                                                                        {format(
                                                                            new Date(
                                                                                invoice.invoice_date,
                                                                            ),
                                                                            'h:mm a',
                                                                            {
                                                                                locale: es,
                                                                            },
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <span className="text-xs text-muted-foreground/30">
                                                            |
                                                        </span>

                                                        <div className="text-left">
                                                            <div className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                                                                <span>
                                                                    {invoice.created_at
                                                                        ? format(
                                                                              new Date(
                                                                                  invoice.created_at,
                                                                              ),
                                                                              'dd/MM/yyyy',
                                                                              {
                                                                                  locale: es,
                                                                              },
                                                                          )
                                                                        : '-'}
                                                                </span>
                                                                {invoice.created_at && (
                                                                    <span className="font-mono text-[9px] text-muted-foreground/75 before:mr-1 before:content-['•']">
                                                                        {format(
                                                                            new Date(
                                                                                invoice.created_at,
                                                                            ),
                                                                            'h:mm a',
                                                                            {
                                                                                locale: es,
                                                                            },
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {getSpecimenDateRangeText(
                                                        invoice,
                                                        filters,
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-[200px] pl-5">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-medium text-foreground">
                                                            {invoice.customer
                                                                ?.name || 'N/A'}
                                                        </span>
                                                    </div>
                                                    {invoice.customer
                                                        ?.id_number && (
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            {
                                                                invoice.customer
                                                                    .id_number
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-[150px]">
                                                <div className="flex items-center gap-1.5">
                                                    {getPaymentBadge(
                                                        invoice.payment_type,
                                                    )}
                                                    {/* {invoice.payment_type ===
													'credit' &&
													invoice.credit_payment_id && (
														<Button
															variant="ghost"
															size="icon"
															className="h-5 w-5 hover:bg-muted"
															onClick={() =>
																router.get(
																	'/credits',
																	{
																		search: String(
																			invoice.credit_payment_id ||
																			'',
																		),
																	},
																)
															}
															title="Ver Crédito"
														>
															<Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
														</Button>
													)} */}
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-[200px] pl-5">
                                                <div className="flex items-center gap-1.5">
                                                    {getInvoiceTypeBadge(
                                                        invoice.invoice_type,
                                                    )}
                                                    {invoice.invoice_type ===
                                                        'cancelled' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 hover:bg-muted"
                                                            onClick={() => {
                                                                setSelectedInvoiceForCancellationReason(
                                                                    invoice,
                                                                );
                                                                setIsCancellationReasonSheetOpen(
                                                                    true,
                                                                );
                                                            }}
                                                            title="Ver Motivo de Cancelación"
                                                        >
                                                            <MessageSquare className="h-3.5 w-3.5 text-red-500 hover:text-red-700" />
                                                        </Button>
                                                    )}
                                                    {/* {invoice.invoice_type ===
													'credit payment' &&
													invoice.credit_payment_id && (
														<Button
															variant="ghost"
															size="icon"
															className="h-5 w-5 hover:bg-muted"
															onClick={() =>
																router.get(
																	'/credits',
																	{
																		search: String(
																			invoice.credit_payment_id ||
																			'',
																		),
																	},
																)
															}
															title="Ver Crédito"
														>
															<Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
														</Button>
													)} */}
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-[220px]">
                                                <div className="flex max-w-[220px] flex-col gap-1.5 text-xs">
                                                    {/* Detalle principal (Grupo, Otro Cobro o Muestra) */}
                                                    {invoice.group ? (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="w-max rounded border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-600 dark:bg-purple-500/20 dark:text-purple-300">
                                                                    {
                                                                        invoice
                                                                            .group
                                                                            .name
                                                                    }
                                                                </span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-5 w-5 hover:bg-muted"
                                                                    onClick={() => {
                                                                        setSelectedGroupForView(
                                                                            {
                                                                                ...invoice.group,
                                                                                invoice:
                                                                                    invoice,
                                                                            },
                                                                        );
                                                                        setIsGroupViewSheetOpen(
                                                                            true,
                                                                        );
                                                                    }}
                                                                    title="Ver Grupo de Muestras"
                                                                >
                                                                    <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                                </Button>
                                                                <DropdownMenu
                                                                    onOpenChange={(
                                                                        open,
                                                                    ) => {
                                                                        if (
                                                                            !open
                                                                        ) {
                                                                            setSpecimenSearchQuery(
                                                                                '',
                                                                            );
                                                                        }
                                                                    }}
                                                                >
                                                                    <DropdownMenuTrigger
                                                                        asChild
                                                                    >
                                                                        <button
                                                                            data-slot="button"
                                                                            className="inline-flex h-5 w-8 items-center justify-center gap-0.5 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none hover:bg-muted hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                                                                            title="Editar Muestra"
                                                                        >
                                                                            <Edit2 className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                                            <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                                                                        </button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent
                                                                        align="start"
                                                                        className="w-64 p-0"
                                                                    >
                                                                        {(() => {
                                                                            const filteredSpecimens =
                                                                                (
                                                                                    invoice
                                                                                        .group
                                                                                        .specimens ||
                                                                                    []
                                                                                ).filter(
                                                                                    (
                                                                                        s: any,
                                                                                    ) =>
                                                                                        (
                                                                                            s.sequence_code ||
                                                                                            ''
                                                                                        )
                                                                                            .toLowerCase()
                                                                                            .includes(
                                                                                                specimenSearchQuery.toLowerCase(),
                                                                                            ),
                                                                                );

                                                                            return (
                                                                                <>
                                                                                    <div className="border-b border-border/50 p-2">
                                                                                        <div className="relative">
                                                                                            <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                                                            <Input
                                                                                                placeholder="Buscar código..."
                                                                                                value={
                                                                                                    specimenSearchQuery
                                                                                                }
                                                                                                onChange={(
                                                                                                    e,
                                                                                                ) =>
                                                                                                    setSpecimenSearchQuery(
                                                                                                        e
                                                                                                            .target
                                                                                                            .value,
                                                                                                    )
                                                                                                }
                                                                                                className="h-8 pl-8 text-xs focus-visible:ring-1 focus-visible:ring-ring"
                                                                                                onClick={(
                                                                                                    e,
                                                                                                ) =>
                                                                                                    e.stopPropagation()
                                                                                                }
                                                                                                onKeyDown={(
                                                                                                    e,
                                                                                                ) =>
                                                                                                    e.stopPropagation()
                                                                                                }
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="max-h-[250px] overflow-y-auto p-1">
                                                                                        {filteredSpecimens.length ===
                                                                                        0 ? (
                                                                                            <div className="p-4 text-center text-xs text-muted-foreground">
                                                                                                No
                                                                                                se
                                                                                                encontraron
                                                                                                muestras
                                                                                            </div>
                                                                                        ) : (
                                                                                            filteredSpecimens.map(
                                                                                                (
                                                                                                    specimen: any,
                                                                                                ) => {
                                                                                                    const isInRange =
                                                                                                        displayValues.isGroupFiltered &&
                                                                                                        displayValues.specimensInRangeMap
                                                                                                            ? displayValues
                                                                                                                  .specimensInRangeMap[
                                                                                                                  specimen
                                                                                                                      .id
                                                                                                              ] !==
                                                                                                              false
                                                                                                            : true;

                                                                                                    return (
                                                                                                        <DropdownMenuItem
                                                                                                            key={
                                                                                                                specimen.id
                                                                                                            }
                                                                                                            onClick={() => {
                                                                                                                const specimenWithInvoice =
                                                                                                                    {
                                                                                                                        ...specimen,
                                                                                                                        customerRelation:
                                                                                                                            specimen.customer_relation ||
                                                                                                                            specimen.customerRelation ||
                                                                                                                            invoice.customer,
                                                                                                                        customer_relation:
                                                                                                                            specimen.customer_relation ||
                                                                                                                            specimen.customerRelation ||
                                                                                                                            invoice.customer,
                                                                                                                        invoice_relation:
                                                                                                                            {
                                                                                                                                ...invoice,
                                                                                                                                specimen:
                                                                                                                                    undefined,
                                                                                                                            },
                                                                                                                    };
                                                                                                                setSelectedSpecimen(
                                                                                                                    specimenWithInvoice,
                                                                                                                );
                                                                                                                setIsSpecimenSheetOpen(
                                                                                                                    true,
                                                                                                                );
                                                                                                            }}
                                                                                                            className={`group cursor-pointer ${!isInRange ? 'bg-muted/40 text-muted-foreground opacity-55' : ''}`}
                                                                                                        >
                                                                                                            <div className="flex w-full flex-col gap-0.5">
                                                                                                                <div className="flex items-center justify-between gap-1">
                                                                                                                    <span
                                                                                                                        className={`font-mono text-xs font-semibold ${!isInRange ? 'text-muted-foreground' : 'text-primary transition-colors group-hover:text-white group-focus:text-white'}`}
                                                                                                                    >
                                                                                                                        {specimen.sequence_code ||
                                                                                                                            'Sin código'}
                                                                                                                    </span>
                                                                                                                    {!isInRange && (
                                                                                                                        <span className="py-0.2 rounded border border-border/50 bg-muted/80 px-1 text-[9px] font-normal text-muted-foreground italic">
                                                                                                                            Fuera
                                                                                                                            de
                                                                                                                            rango
                                                                                                                        </span>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                                <span
                                                                                                                    className={`truncate text-[10px] ${!isInRange ? 'text-muted-foreground/80' : 'text-muted-foreground transition-colors group-hover:text-white/90 group-focus:text-white/90'}`}
                                                                                                                >
                                                                                                                    {specimen
                                                                                                                        .customer_relation
                                                                                                                        ?.name ||
                                                                                                                        invoice
                                                                                                                            .customer
                                                                                                                            ?.name ||
                                                                                                                        'Sin cliente'}
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        </DropdownMenuItem>
                                                                                                    );
                                                                                                },
                                                                                            )
                                                                                        )}
                                                                                    </div>
                                                                                </>
                                                                            );
                                                                        })()}
                                                                        {invoice
                                                                            .group
                                                                            .specimens
                                                                            ?.length >
                                                                            0 && (
                                                                            <>
                                                                                <DropdownMenuSeparator />
                                                                                <div className="p-1">
                                                                                    <DropdownMenuItem
                                                                                        onClick={() => {
                                                                                            setSelectedGroup(
                                                                                                {
                                                                                                    ...invoice.group,
                                                                                                    invoice:
                                                                                                        invoice,
                                                                                                },
                                                                                            );
                                                                                            setIsGroupSheetOpen(
                                                                                                true,
                                                                                            );
                                                                                        }}
                                                                                        className="group flex cursor-pointer items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white"
                                                                                    >
                                                                                        <Plus className="h-3.5 w-3.5" />
                                                                                        <span>
                                                                                            Agregar
                                                                                            más
                                                                                            muestras
                                                                                        </span>
                                                                                    </DropdownMenuItem>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {displayValues.groupText ||
                                                                    `Grupo de Muestras (${invoice.group.specimens?.length || 0} muestras)`}
                                                            </span>
                                                        </div>
                                                    ) : invoice.invoice_type ===
                                                          'rental' &&
                                                      invoice.rental ? (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="w-max rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                                                    {
                                                                        invoice
                                                                            .rental
                                                                            .name
                                                                    }
                                                                </span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-5 w-5 hover:bg-muted"
                                                                    onClick={() =>
                                                                        router.visit(
                                                                            `${rentalsIndex().url}?search=${encodeURIComponent(invoice.rental!.name)}`,
                                                                        )
                                                                    }
                                                                    title="Ver en Otros Cobros"
                                                                >
                                                                    <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                                </Button>
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                Otro Cobro
                                                            </span>
                                                        </div>
                                                    ) : invoice.specimen ? (
                                                        <div className="flex flex-col gap-1">
                                                            {invoice.specimen
                                                                .sequence_code && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="w-max rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary dark:bg-primary/10">
                                                                        {
                                                                            invoice
                                                                                .specimen
                                                                                .sequence_code
                                                                        }
                                                                    </span>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-5 w-5 hover:bg-muted"
                                                                        onClick={() => {
                                                                            setSelectedSpecimenIdForView(
                                                                                invoice.specimen_id ||
                                                                                    invoice
                                                                                        .specimen
                                                                                        ?.id,
                                                                            );
                                                                            setSelectedSpecimenForView(
                                                                                invoice.specimen,
                                                                            );
                                                                            setIsSpecimenViewSheetOpen(
                                                                                true,
                                                                            );
                                                                        }}
                                                                        title="Ver Muestra"
                                                                    >
                                                                        <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-5 w-5 hover:bg-muted"
                                                                        onClick={() => {
                                                                            const specimenWithInvoice =
                                                                                {
                                                                                    ...invoice.specimen,
                                                                                    invoice_relation:
                                                                                        {
                                                                                            ...invoice,
                                                                                            specimen:
                                                                                                undefined,
                                                                                        },
                                                                                };
                                                                            setSelectedSpecimen(
                                                                                specimenWithInvoice,
                                                                            );
                                                                            setIsSpecimenSheetOpen(
                                                                                true,
                                                                            );
                                                                        }}
                                                                        title="Editar Muestra"
                                                                    >
                                                                        <Edit2 className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                            <span
                                                                className="text-[10px] text-muted-foreground"
                                                                title={
                                                                    invoice
                                                                        .specimen
                                                                        .type
                                                                        ?.name
                                                                }
                                                            >
                                                                {
                                                                    invoice
                                                                        .specimen
                                                                        .type
                                                                        ?.name
                                                                }{' '}
                                                                -{' '}
                                                                {
                                                                    invoice
                                                                        .specimen
                                                                        .examination
                                                                        ?.name
                                                                }
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        invoice.invoice_type !==
                                                            'credit payment' && (
                                                            <span className="text-xs text-muted-foreground italic">
                                                                N/A
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {/* Información del Crédito (si aplica) */}
                                                {(invoice.invoice_type ===
                                                    'credit payment' ||
                                                    invoice.payment_type ===
                                                        'credit') && (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-max rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                                                            Crédito #
                                                            {
                                                                invoice.credit_payment_id
                                                            }
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 hover:bg-muted"
                                                            onClick={() =>
                                                                router.get(
                                                                    '/credits',
                                                                    {
                                                                        search: String(
                                                                            invoice.credit_payment_id ||
                                                                                '',
                                                                        ),
                                                                    },
                                                                )
                                                            }
                                                            title="Ver Crédito"
                                                        >
                                                            <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="min-w-[120px] text-right font-medium text-muted-foreground">
                                                L.{' '}
                                                {displayValues.amount.toFixed(
                                                    2,
                                                )}
                                            </TableCell>
                                            <TableCell className="min-w-[100px] text-right font-medium text-muted-foreground">
                                                {displayValues.quantity}
                                            </TableCell>
                                            <TableCell className="min-w-[120px] text-right font-medium text-muted-foreground">
                                                L.{' '}
                                                {displayValues.subtotal.toFixed(
                                                    2,
                                                )}
                                            </TableCell>
                                            <TableCell className="min-w-[150px] text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-medium text-muted-foreground">
                                                        L.{' '}
                                                        {displayValues.discount.toFixed(
                                                            2,
                                                        )}
                                                    </span>
                                                    {displayValues.age_discount_type && (
                                                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                                            {displayValues.age_discount_type ===
                                                            'third'
                                                                ? 'Tercera Edad'
                                                                : 'Cuarta Edad'}
                                                            {displayValues.age_discount_amount >
                                                                0 &&
                                                                ` (-L. ${displayValues.age_discount_amount.toFixed(2)})`}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-[120px] text-right font-medium text-muted-foreground">
                                                L.{' '}
                                                {displayValues.isv_15.toFixed(
                                                    2,
                                                )}
                                            </TableCell>
                                            <TableCell className="min-w-[120px] pr-6 text-right font-bold text-primary">
                                                L.{' '}
                                                {displayValues.total.toFixed(2)}
                                            </TableCell>
                                            <TableCell
                                                className={`pointer-events-none z-10 w-[100px] min-w-[100px] border-l border-border bg-card text-right font-bold text-emerald-600 transition-colors group-hover:bg-muted before:top-0 before:bottom-0 before:left-[-8px] before:hidden before:w-[8px] before:bg-gradient-to-r before:from-transparent before:to-black/[0.06] before:transition-opacity before:duration-200 md:sticky md:right-[80px] md:before:absolute dark:text-emerald-400 dark:before:to-black/[0.2] ${showRightShadow ? 'before:opacity-100' : 'before:opacity-0'}`}
                                            >
                                                L.{' '}
                                                {displayValues.total_paid.toFixed(
                                                    2,
                                                )}
                                            </TableCell>
                                            <TableCell className="z-10 w-[80px] min-w-[80px] bg-card text-right transition-colors group-hover:bg-muted md:sticky md:right-0">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleViewDetails(
                                                                invoice,
                                                            )
                                                        }
                                                        title="Ver Detalle de Factura"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {(canManageInvoices ||
                                                        canCreateWorkOrders) && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                    title="Acciones"
                                                                >
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent
                                                                align="end"
                                                                className="w-52"
                                                            >
                                                                {canManageInvoices && (
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            handleEditDetails(
                                                                                invoice,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Edit2 className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                        <span>
                                                                            Editar
                                                                            factura
                                                                        </span>
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {canManageCredits &&
                                                                    invoice.payment_type ===
                                                                        'credit' &&
                                                                    invoice.credit_relation && (
                                                                        <>
                                                                            <DropdownMenuItem
                                                                                onClick={() => {
                                                                                    const remaining =
                                                                                        parseFloat(
                                                                                            String(
                                                                                                invoice
                                                                                                    .credit_relation
                                                                                                    .amount_remaining,
                                                                                            ),
                                                                                        );

                                                                                    if (
                                                                                        remaining >
                                                                                        0
                                                                                    ) {
                                                                                        handlePayFinalClick(
                                                                                            invoice.credit_relation,
                                                                                        );
                                                                                    }
                                                                                }}
                                                                                disabled={
                                                                                    parseFloat(
                                                                                        String(
                                                                                            invoice
                                                                                                .credit_relation
                                                                                                .amount_remaining,
                                                                                        ),
                                                                                    ) <=
                                                                                    0
                                                                                }
                                                                                className={
                                                                                    parseFloat(
                                                                                        String(
                                                                                            invoice
                                                                                                .credit_relation
                                                                                                .amount_remaining,
                                                                                        ),
                                                                                    ) <=
                                                                                    0
                                                                                        ? 'opacity-50'
                                                                                        : ''
                                                                                }
                                                                            >
                                                                                <Coins className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                                <span>
                                                                                    Generar
                                                                                    Factura
                                                                                    Final
                                                                                </span>
                                                                            </DropdownMenuItem>
                                                                            {(() => {
                                                                                const credit =
                                                                                    invoice.credit_relation;
                                                                                const specimensCount =
                                                                                    credit
                                                                                        .credit_invoice_specimens
                                                                                        ?.length ??
                                                                                    invoice
                                                                                        .group
                                                                                        ?.specimens
                                                                                        ?.length ??
                                                                                    (invoice.is_group
                                                                                        ? 2
                                                                                        : 1);
                                                                                const remaining =
                                                                                    parseFloat(
                                                                                        String(
                                                                                            credit.amount_remaining ||
                                                                                                '0',
                                                                                        ),
                                                                                    );
                                                                                const isSingleOrPaid =
                                                                                    (!invoice.is_group &&
                                                                                        !credit.is_group) ||
                                                                                    specimensCount <=
                                                                                        1 ||
                                                                                    remaining <=
                                                                                        0;

                                                                                return (
                                                                                    <DropdownMenuItem
                                                                                        onClick={() => {
                                                                                            if (
                                                                                                !isSingleOrPaid
                                                                                            ) {
                                                                                                handleExtractSpecimenClick(
                                                                                                    credit,
                                                                                                );
                                                                                            }
                                                                                        }}
                                                                                        disabled={
                                                                                            isSingleOrPaid
                                                                                        }
                                                                                        className={
                                                                                            isSingleOrPaid
                                                                                                ? 'opacity-50'
                                                                                                : ''
                                                                                        }
                                                                                    >
                                                                                        <FolderMinus className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                                        <span>
                                                                                            Sacar
                                                                                            muestra
                                                                                        </span>
                                                                                    </DropdownMenuItem>
                                                                                );
                                                                            })()}
                                                                        </>
                                                                    )}
                                                                {canEditSpecimen &&
                                                                    invoice.invoice_type !==
                                                                        'cancelled' &&
                                                                    ((invoice.specimen &&
                                                                        ![
                                                                            'cancelled',
                                                                            'finalized',
                                                                            'delivered',
                                                                        ].includes(
                                                                            invoice
                                                                                .specimen
                                                                                .status,
                                                                        )) ||
                                                                        invoice.group?.specimens?.some(
                                                                            (
                                                                                s: any,
                                                                            ) =>
                                                                                ![
                                                                                    'cancelled',
                                                                                    'finalized',
                                                                                    'delivered',
                                                                                ].includes(
                                                                                    s.status,
                                                                                ),
                                                                        )) && (
                                                                        <DropdownMenuItem
                                                                            variant="destructive"
                                                                            onClick={(
                                                                                e,
                                                                            ) => {
                                                                                e.stopPropagation();
                                                                                const specimen =
                                                                                    invoice.specimen ||
                                                                                    invoice.group?.specimens?.find(
                                                                                        (
                                                                                            s: any,
                                                                                        ) =>
                                                                                            ![
                                                                                                'cancelled',
                                                                                                'finalized',
                                                                                                'delivered',
                                                                                            ].includes(
                                                                                                s.status,
                                                                                            ),
                                                                                    );

                                                                                if (
                                                                                    specimen
                                                                                ) {
                                                                                    handleCancelClick(
                                                                                        specimen,
                                                                                    );
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Ban className="mr-2 h-4 w-4" />
                                                                            <span>
                                                                                Cancelar
                                                                                muestra
                                                                            </span>
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                {(canCreateWorkOrders ||
                                                                    canManageInvoices) &&
                                                                    (() => {
                                                                        const specimens =
                                                                            getInvoiceSpecimens(
                                                                                invoice,
                                                                            );

                                                                        if (
                                                                            specimens.length ===
                                                                                1 &&
                                                                            specimens[0]
                                                                                .id
                                                                        ) {
                                                                            return (
                                                                                <DropdownMenuItem
                                                                                    onClick={() =>
                                                                                        handleCreateWorkOrder(
                                                                                            specimens[0]
                                                                                                .id,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <ClipboardList className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                                    <span>
                                                                                        Crear
                                                                                        orden
                                                                                        de
                                                                                        trabajo
                                                                                    </span>
                                                                                </DropdownMenuItem>
                                                                            );
                                                                        }

                                                                        if (
                                                                            specimens.length >
                                                                            1
                                                                        ) {
                                                                            const allIds =
                                                                                specimens
                                                                                    .map(
                                                                                        (
                                                                                            s: any,
                                                                                        ) =>
                                                                                            s.id,
                                                                                    )
                                                                                    .filter(
                                                                                        Boolean,
                                                                                    );
                                                                            const selectedIds =
                                                                                getSelectedSpecimensForInvoice(
                                                                                    invoice,
                                                                                );
                                                                            const isAllSelected =
                                                                                selectedIds.length ===
                                                                                    allIds.length &&
                                                                                allIds.length >
                                                                                    0;

                                                                            return (
                                                                                <DropdownMenuSub>
                                                                                    <DropdownMenuSubTrigger>
                                                                                        <ClipboardList className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                                        <span>
                                                                                            Crear
                                                                                            orden
                                                                                            de
                                                                                            trabajo
                                                                                        </span>
                                                                                    </DropdownMenuSubTrigger>
                                                                                    <DropdownMenuSubContent
                                                                                        alignOffset={
                                                                                            -4
                                                                                        }
                                                                                        className="w-64 p-0 shadow-lg"
                                                                                        onClick={(
                                                                                            e,
                                                                                        ) =>
                                                                                            e.stopPropagation()
                                                                                        }
                                                                                    >
                                                                                        <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-3 py-2 text-xs">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(
                                                                                                    e,
                                                                                                ) => {
                                                                                                    e.stopPropagation();
                                                                                                    setGroupSpecimenSelections(
                                                                                                        (
                                                                                                            prev,
                                                                                                        ) => ({
                                                                                                            ...prev,
                                                                                                            [invoice.id]:
                                                                                                                allIds,
                                                                                                        }),
                                                                                                    );
                                                                                                }}
                                                                                                className="cursor-pointer font-medium text-primary transition-all hover:underline"
                                                                                            >
                                                                                                Seleccionar
                                                                                                todos
                                                                                            </button>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(
                                                                                                    e,
                                                                                                ) => {
                                                                                                    e.stopPropagation();
                                                                                                    setGroupSpecimenSelections(
                                                                                                        (
                                                                                                            prev,
                                                                                                        ) => ({
                                                                                                            ...prev,
                                                                                                            [invoice.id]:
                                                                                                                [],
                                                                                                        }),
                                                                                                    );
                                                                                                }}
                                                                                                className="cursor-pointer font-medium text-muted-foreground transition-all hover:text-destructive hover:underline"
                                                                                            >
                                                                                                Deseleccionar
                                                                                                todos
                                                                                            </button>
                                                                                        </div>

                                                                                        <div className="max-h-56 space-y-0.5 overflow-y-auto p-1">
                                                                                            {specimens.map(
                                                                                                (
                                                                                                    specimen: any,
                                                                                                ) => {
                                                                                                    const isChecked =
                                                                                                        selectedIds.includes(
                                                                                                            specimen.id,
                                                                                                        );
                                                                                                    const codeOrId =
                                                                                                        specimen.sequence_code ||
                                                                                                        specimen.id;
                                                                                                    const name =
                                                                                                        specimen
                                                                                                            .examination
                                                                                                            ?.name ||
                                                                                                        specimen
                                                                                                            .type
                                                                                                            ?.name ||
                                                                                                        'Muestra';

                                                                                                    return (
                                                                                                        <DropdownMenuItem
                                                                                                            key={
                                                                                                                specimen.id
                                                                                                            }
                                                                                                            onSelect={(
                                                                                                                e,
                                                                                                            ) => {
                                                                                                                e.preventDefault();
                                                                                                                toggleSpecimenForInvoice(
                                                                                                                    invoice.id,
                                                                                                                    specimen.id,
                                                                                                                    allIds,
                                                                                                                );
                                                                                                            }}
                                                                                                            className="flex cursor-pointer items-center text-xs"
                                                                                                        >
                                                                                                            <div
                                                                                                                className={cn(
                                                                                                                    'group mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-all',
                                                                                                                    isChecked
                                                                                                                        ? 'border-primary bg-primary text-white'
                                                                                                                        : 'border-muted-foreground/40 bg-transparent text-muted-foreground/20',
                                                                                                                )}
                                                                                                            >
                                                                                                                <Check
                                                                                                                    className={cn(
                                                                                                                        'h-2 w-2 stroke-[3]',
                                                                                                                        isChecked
                                                                                                                            ? 'stroke-white/80'
                                                                                                                            : 'text-muted-foreground/50',
                                                                                                                    )}
                                                                                                                />
                                                                                                            </div>
                                                                                                            <span className="truncate">
                                                                                                                [
                                                                                                                {
                                                                                                                    codeOrId
                                                                                                                }

                                                                                                                ]{' '}
                                                                                                                {
                                                                                                                    name
                                                                                                                }
                                                                                                            </span>
                                                                                                        </DropdownMenuItem>
                                                                                                    );
                                                                                                },
                                                                                            )}
                                                                                        </div>

                                                                                        <div className="border-t border-border/60 p-1">
                                                                                            <DropdownMenuItem
                                                                                                disabled={
                                                                                                    selectedIds.length ===
                                                                                                    0
                                                                                                }
                                                                                                onClick={() => {
                                                                                                    if (
                                                                                                        selectedIds.length ===
                                                                                                        1
                                                                                                    ) {
                                                                                                        handleCreateWorkOrder(
                                                                                                            selectedIds[0],
                                                                                                        );
                                                                                                    } else if (
                                                                                                        selectedIds.length >
                                                                                                        1
                                                                                                    ) {
                                                                                                        handleCreateBulkWorkOrders(
                                                                                                            selectedIds,
                                                                                                        );
                                                                                                    }
                                                                                                }}
                                                                                                className="justify-center text-xs font-semibold text-primary focus:bg-primary/10 focus:text-primary"
                                                                                            >
                                                                                                <ClipboardList className="mr-1.5 h-3.5 w-3.5 text-primary" />
                                                                                                <span>
                                                                                                    {selectedIds.length ===
                                                                                                    0
                                                                                                        ? 'Sin seleccionadas'
                                                                                                        : selectedIds.length ===
                                                                                                            1
                                                                                                          ? 'Crear 1 orden'
                                                                                                          : `Crear ${selectedIds.length} órdenes`}
                                                                                                </span>
                                                                                            </DropdownMenuItem>
                                                                                        </div>
                                                                                    </DropdownMenuSubContent>
                                                                                </DropdownMenuSub>
                                                                            );
                                                                        }

                                                                        return (
                                                                            <DropdownMenuItem
                                                                                disabled
                                                                            >
                                                                                <ClipboardList className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                                <span>
                                                                                    Crear
                                                                                    orden
                                                                                    de
                                                                                    trabajo
                                                                                </span>
                                                                            </DropdownMenuItem>
                                                                        );
                                                                    })()}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={10}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No se encontraron facturas fiscales
                                        registradas.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Overall totals summary */}
                {invoices.data.length > 0 && (
                    <div className="flex flex-col items-end gap-2 border-t pt-4 pr-10">
                        <div className="grid grid-cols-2 gap-x-8 text-right text-sm">
                            <span className="text-muted-foreground">
                                Total Facturado:
                            </span>
                            <span className="font-semibold text-foreground">
                                L.{' '}
                                {pageTotals.gross.toLocaleString('es-HN', {
                                    minimumFractionDigits: 2,
                                })}
                            </span>
                            <span className="text-muted-foreground">
                                Total ISV 15%:
                            </span>
                            <span className="font-semibold text-foreground">
                                L.{' '}
                                {pageTotals.isv.toLocaleString('es-HN', {
                                    minimumFractionDigits: 2,
                                })}
                            </span>
                            <span className="text-muted-foreground">
                                Total Descuentos:
                            </span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                L.{' '}
                                {pageTotals.discount.toLocaleString('es-HN', {
                                    minimumFractionDigits: 2,
                                })}
                            </span>
                            <span className="text-muted-foreground">
                                Pendiente de Pago:
                            </span>
                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                                L.{' '}
                                {pageTotals.pending.toLocaleString('es-HN', {
                                    minimumFractionDigits: 2,
                                })}
                            </span>
                            <span className="border-t pt-1 font-bold text-primary">
                                Total Pagado:
                            </span>
                            <span className="border-t pt-1 font-bold text-primary">
                                L.{' '}
                                {pageTotals.paid.toLocaleString('es-HN', {
                                    minimumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                    </div>
                )}

                {/* Pagination */}
                <Pagination
                    links={invoices.links}
                    meta={{
                        from: invoices.from,
                        to: invoices.to,
                        total: invoices.total,
                    }}
                />
            </div>

            {/* Premium Wide Viewer Sheet */}
            <InvoiceViewSheet
                invoice={selectedInvoice}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
            />

            {/* Invoice Editor Sheet */}
            <InvoiceSheet
                invoice={invoiceToEdit}
                open={isEditSheetOpen}
                onOpenChange={setIsEditSheetOpen}
                banks={banks}
                specimenTypes={specimenTypes}
                settings={settings}
            />

            <CreditFinalPaymentSheet
                credit={selectedCreditForFinalPayment}
                banks={banks}
                open={isFinalPaymentSheetOpen}
                onOpenChange={setIsFinalPaymentSheetOpen}
            />

            <CreditExtractSpecimenSheet
                credit={selectedCreditForExtractSpecimen}
                open={isExtractSpecimenSheetOpen}
                onOpenChange={setIsExtractSpecimenSheetOpen}
            />

            {/* Specimen Sheets */}
            <SpecimenSheet
                specimen={selectedSpecimen}
                open={isSpecimenSheetOpen}
                onOpenChange={(open) => {
                    setIsSpecimenSheetOpen(open);

                    if (!open) {
                        setSelectedSpecimen(null);
                    }
                }}
                specimenTypes={specimenTypes}
                examinations={examinations}
                categories={categories}
                referrers={referrers}
                referrerTypes={referrerTypes}
                priorities={priorities}
                locations={locations}
                sequences={sequences}
                activeLocationId={activeLocationId}
                products={products}
                banks={banks}
            />

            <SpecimenViewSheet
                specimenId={
                    selectedSpecimenIdForView || selectedSpecimenForView?.id
                }
                specimen={selectedSpecimenForView}
                open={isSpecimenViewSheetOpen}
                onOpenChange={setIsSpecimenViewSheetOpen}
                onEditClick={() => {
                    setSelectedSpecimen(selectedSpecimenForView);
                    setIsSpecimenViewSheetOpen(false);
                    setIsSpecimenSheetOpen(true);
                }}
            />

            <SpecimenGroupViewSheet
                group={selectedGroupForView}
                open={isGroupViewSheetOpen}
                onOpenChange={setIsGroupViewSheetOpen}
                onViewSpecimenClick={(specimen) => {
                    const specimenWithInvoice = {
                        ...specimen,
                        customerRelation:
                            specimen.customerRelation ||
                            selectedGroupForView?.customer,
                        invoiceRelation: selectedGroupForView?.invoice,
                        invoice_relation: selectedGroupForView?.invoice,
                    };
                    setIsGroupViewSheetOpen(false);
                    setSelectedSpecimenIdForView(specimen.id);
                    setSelectedSpecimenForView(specimenWithInvoice);
                    setIsSpecimenViewSheetOpen(true);
                }}
            />

            <SpecimenGroupSheet
                open={isGroupSheetOpen}
                onOpenChange={(open) => {
                    setIsGroupSheetOpen(open);

                    if (!open) {
                        setSelectedGroup(null);
                    }
                }}
                group={selectedGroup}
                specimenTypes={specimenTypes}
                examinations={examinations}
                categories={categories}
                referrers={referrers}
                referrerTypes={referrerTypes}
                priorities={priorities}
                locations={locations}
                sequences={sequences}
                activeLocationId={activeLocationId}
                products={products}
                banks={banks}
            />

            <SelectSpecimenGroupDialog
                open={isSelectGroupDialogOpen}
                onOpenChange={setIsSelectGroupDialogOpen}
                onConfirm={(groupDetails) => {
                    setSelectedGroup(groupDetails);
                    setIsGroupSheetOpen(true);
                }}
            />

            {/* Work Order Creation Sheet */}
            <WorkOrderSheet
                specimenId={selectedSpecimenForWorkOrder}
                specimenIds={selectedSpecimenIdsForWorkOrder}
                workOrderTypes={workOrderTypes}
                workOrderTasks={workOrderTasks}
                usersList={usersList}
                open={isWorkOrderSheetOpen}
                onOpenChange={(open) => {
                    setIsWorkOrderSheetOpen(open);

                    if (!open) {
                        setSelectedSpecimenForWorkOrder(null);
                        setSelectedSpecimenIdsForWorkOrder(null);
                    }
                }}
            />

            {/* Cancellation Confirmation Dialog */}
            <CancelSpecimenDialog
                isOpen={isCancelDialogOpen}
                onClose={handleCloseCancelDialog}
                specimenToCancel={specimenToCancel}
                specimensInGroupToCancel={specimensInGroupToCancel}
            />

            {/* Cancellation Reason Sheet */}
            <Sheet
                open={isCancellationReasonSheetOpen}
                onOpenChange={setIsCancellationReasonSheetOpen}
            >
                <SheetContent className="sm:max-w-md">
                    <HeadingSheet
                        title="Motivo de Cancelación"
                        description="Detalles sobre la cancelación de la factura y su muestra asociada."
                    />
                    <Separator className="my-4" />
                    {selectedInvoiceForCancellationReason &&
                        (() => {
                            const getCancellationDetails = (inv: any) => {
                                if (!inv) {
                                    return null;
                                }

                                if (inv.specimen) {
                                    return inv.specimen;
                                }

                                if (
                                    inv.group?.specimens &&
                                    inv.group.specimens.length > 0
                                ) {
                                    const cancelledSpecimen =
                                        inv.group.specimens.find(
                                            (s: any) =>
                                                s.status === 'cancelled' ||
                                                s.cancellation_reason,
                                        );

                                    return (
                                        cancelledSpecimen ||
                                        inv.group.specimens[0]
                                    );
                                }

                                return null;
                            };

                            const cancelledSpecimen = getCancellationDetails(
                                selectedInvoiceForCancellationReason,
                            );

                            if (!cancelledSpecimen) {
                                return (
                                    <div className="py-6 text-center text-sm text-muted-foreground">
                                        No se encontraron detalles de
                                        cancelación.
                                    </div>
                                );
                            }

                            return (
                                <div className="space-y-6 px-5">
                                    {/* Cancellation Reason */}
                                    <div className="space-y-2 rounded-lg border border-red-500/20 bg-red-500/[0.02] p-4 dark:border-red-900/30">
                                        <h4 className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
                                            <AlertOctagon className="h-4 w-4" />
                                            Motivo
                                        </h4>
                                        <p className="text-sm text-foreground">
                                            {cancelledSpecimen.cancellation_reason ||
                                                'No especificado'}
                                        </p>
                                    </div>

                                    <Separator />

                                    {/* Cancellation Details List */}
                                    <div className="space-y-4 text-sm">
                                        {cancelledSpecimen.cancelled_at && (
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Calendar className="h-4 w-4" />
                                                    Fecha de Cancelación:
                                                </span>
                                                <span className="font-medium text-foreground">
                                                    {format(
                                                        new Date(
                                                            cancelledSpecimen.cancelled_at,
                                                        ),
                                                        'PPP h:mm a',
                                                        { locale: es },
                                                    )}
                                                </span>
                                            </div>
                                        )}

                                        {cancelledSpecimen.cancelled_by && (
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                                    <User className="h-4 w-4" />
                                                    Cancelado por:
                                                </span>
                                                <span className="font-medium text-foreground">
                                                    {
                                                        cancelledSpecimen
                                                            .cancelled_by.name
                                                    }
                                                </span>
                                            </div>
                                        )}

                                        {selectedInvoiceForCancellationReason
                                            .group?.specimens &&
                                        selectedInvoiceForCancellationReason
                                            .group.specimens.length > 0 ? (
                                            <div className="space-y-2">
                                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Microscope className="h-4 w-4" />
                                                    Muestras afectadas:
                                                </span>
                                                <div className="flex flex-wrap gap-1.5 pl-5">
                                                    {selectedInvoiceForCancellationReason.group.specimens.map(
                                                        (spec: any) => (
                                                            <span
                                                                key={spec.id}
                                                                className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary"
                                                            >
                                                                {spec.sequence_code ||
                                                                    `#${spec.id}`}
                                                            </span>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            cancelledSpecimen.sequence_code && (
                                                <div className="flex items-center justify-between">
                                                    <span className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Microscope className="h-4 w-4" />
                                                        Muestra afectada:
                                                    </span>
                                                    <span className="font-mono text-xs font-semibold text-primary">
                                                        {
                                                            cancelledSpecimen.sequence_code
                                                        }
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                </SheetContent>
            </Sheet>
            <InvoicePreviewDialog
                open={showInvoiceModal}
                onOpenChange={(open) => {
                    setShowInvoiceModal(open);

                    if (!open) {
                        setInvoiceUrl(null);
                        setPaymentInvoiceUrl(null);
                    }
                }}
                invoiceUrl={invoiceUrl}
                paymentInvoiceUrl={paymentInvoiceUrl}
                isGroup={isGroupInvoice}
            />
        </>
    );
}
// Removed local SpecimenGroupViewSheet definition to avoid duplication
