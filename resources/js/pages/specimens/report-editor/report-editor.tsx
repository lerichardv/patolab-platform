import { PDFViewer } from '@embedpdf/react-pdf-viewer';
import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { Head, router, usePage } from '@inertiajs/react';

import type { Editor } from '@tiptap/react';
import {
    Microscope,
    Plus,
    Calendar,
    Check,
    FileText,
    ArrowLeft,
    ArrowDown,
    Unlock,
    UserRound,
    Sheet as SheetIcon,
    AlertCircle,
    Eye,
    Save,
    Loader2,
    Lock,
    Edit,
    MoreVertical,
    UserPlus,
    ClipboardList,
    FileSpreadsheet,
    // Toolbar icons
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Heading1,
    Heading2,
    Heading3,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    Quote,
    ImagePlus,
    Grid3x3,
    Undo2,
    Redo2,
    Trash2,
    Mic,
    MicOff,
    Sparkles,
    Highlighter,
    X,
    LayoutGrid,
    CaseSensitive,
    ChevronDown,
    GripVertical,
} from 'lucide-react';
import { Scissors } from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { toast } from 'sonner';
import * as Y from 'yjs';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import EditorLayout from '@/layouts/editor-layout';
import { cn } from '@/lib/utils';
import CustomerSheet from '../../customers/customer-sheet';
import SpecimenWorkOrdersSheet from '../../my-assignments/specimen-work-orders-sheet';
import WorkOrderSheet from '../../my-work-orders/work-order-sheet';
import ReferrerSheet from '../../referrers/referrer-sheet';
import SpecimenPathologistSheet from '../specimen-pathologist-sheet';
import SpecimenQuickEditSheet from '../specimen-quick-edit-sheet';
import SpecimenViewSheet from '../specimen-view-sheet';
import {
    applyReportTemplate,
    notifyCollaborationRefreshInsumos,
    saveReportEditor,
} from './actions';
import { BlankReportScreen } from './components/blank-report-screen';
import { CollaboratorsList } from './components/collaborators-list';
import type { Collaborator } from './components/collaborators-list';
import { CompleteMicroscopyDialog } from './components/complete-microscopy-dialog';
import { EditorRegistryContext } from './components/editor-registry-context';
import { editorStyles } from './components/editor-styles';
import { EnableEditingDialog } from './components/enable-editing-dialog';
import { LoadingReportScreen } from './components/loading-report-screen';
import { MissingSignaturesDialog } from './components/missing-signatures-dialog';
import TemplateSelector from './components/template-selector';
import {
    COLLABORATION_SERVER_URL,
    WS_COLLABORATION_SERVER_URL,
    CustomBulletList,
    sharedExtensions,
} from './components/tiptap-extensions';
import { UnsavedChangesDialog } from './components/unsaved-changes-dialog';
import ManageCuttingsSheet from './cuttings/manage-cuttings-sheet';
import {
    useFinalizeReport,
    useManageCuttings,
    useTransitionState,
} from './hooks';
import ImageGridComponent, { ImageCropperDialog } from './image-grid-component';
import LivePdfPreview from './live-pdf-preview';
import { DebugReportProvider } from './page-preview/debug';
import PagePreview from './page-preview/page';
import {
    AddendumEditor,
    ClinicalDetailsEditor,
    CommentsNotesEditor,
    DiagnosisEditor,
    LegendEditor,
    MacroscopyEditor,
    MicroscopyEditor,
    OpenTextEditor,
    ProtocolsEditor,
} from './rich-text-editors';
import { ReportPaginator } from './services';
import SpecimenInsumosCard from './specimen-insumos-card';
import { EditorToolbar } from './toolbar';
import type {
    MeasuredBlock,
    ReportEditorProps as Props,
    Specimen,
    SpecimenReport,
} from './types';
import { cleanPastedHtml, isEmptyHtml, isSelectionInTable } from './utils';

export default function ReportWorkspace({
    specimen,
    report,
    auth,
    pathologists = [],
    products = [],
    cutting_codes = [],
    cutting_prefixes = [],
    cutting_slide_types = [],
    users = [],
    usersList = [],
    workOrderTypes = [],
    workOrderTasks = [],
    templates = [],
    specimenTypes = [],
    examinations = [],
    categories = [],
    referrers = [],
    referrerTypes = [],
    priorities = [],
    locations = [],
    sequences = [],
    activeLocationId = null,
    banks = [],
}: Props) {
    const [isEditSpecimenOpen, setIsEditSpecimenOpen] =
        useState<boolean>(false);
    const [isEditCustomerOpen, setIsEditCustomerOpen] =
        useState<boolean>(false);
    const [isEditReferrerOpen, setIsEditReferrerOpen] =
        useState<boolean>(false);
    const [isWorkOrdersSheetOpen, setIsWorkOrdersSheetOpen] =
        useState<boolean>(false);
    const [isCreateWorkOrderOpen, setIsCreateWorkOrderOpen] =
        useState<boolean>(false);
    const { debugReport } = usePage().props as { debugReport?: boolean };

    const canEditSpecimen = auth.permissions?.includes('specimens.edit');
    const canEditCustomer = auth.permissions?.includes('patients.edit');
    const canEditReferrer = auth.permissions?.includes('referrers.edit');
    const canCreateWorkOrder =
        auth.user?.role?.slug === 'admin' ||
        Boolean(auth.permissions?.includes('work_orders.create'));
    const canViewWorkOrders =
        auth.user?.role?.slug === 'admin' ||
        Boolean(
            auth.permissions?.includes('work_orders.view') ||
            auth.permissions?.includes('work_orders.admin_view') ||
            auth.permissions?.includes('my_work_orders.view'),
        );
    const editorRefs = useRef<Record<string, any>>({});

    const registerEditor = (field: string, editor: any) => {
        editorRefs.current[field] = editor;

        if (editor && !activeEditorRef.current) {
            setActiveEditor(editor);
            setActiveField(field as any);
        }
    };

    const currentUserSpecimenRelation = specimen.users?.find(
        (u: any) => u.id === auth.user.id,
    );
    const currentUserCollaboratorRelation = specimen.collaborators?.find(
        (u: any) => u.id === auth.user.id,
    );

    const hasMacroAccess =
        !!currentUserSpecimenRelation?.pivot?.macroscopy_access ||
        !!currentUserCollaboratorRelation?.pivot?.macroscopy_access;
    const hasMicroAccess =
        !!currentUserSpecimenRelation?.pivot?.microscopy_access ||
        !!currentUserCollaboratorRelation?.pivot?.microscopy_access;

    const isAssigned =
        !!currentUserSpecimenRelation || !!currentUserCollaboratorRelation;

    const hasCuttingsPermission =
        auth.user.role?.slug === 'admin' ||
        auth.permissions?.includes('cuttings.manage');

    let accessBadgeLabel = 'Solo Lectura';
    let accessBadgeStyle = {
        backgroundColor: 'rgba(100, 116, 139, 0.15)',
        color: '#64748b',
        borderColor: 'rgba(100, 116, 139, 0.25)',
    };

    if (!isAssigned) {
        accessBadgeLabel = 'No Asignado — Sin acceso de edición';
        accessBadgeStyle = {
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            borderColor: 'rgba(239, 68, 68, 0.25)',
        };
    } else if (hasMacroAccess && hasMicroAccess) {
        accessBadgeLabel = 'Acceso a Macro y Microscopía';
        accessBadgeStyle = {
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            borderColor: 'rgba(16, 185, 129, 0.25)',
        };
    } else if (hasMacroAccess) {
        accessBadgeLabel = 'Acceso a Macroscopía';
        accessBadgeStyle = {
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            borderColor: 'rgba(16, 185, 129, 0.25)',
        };
    } else if (hasMicroAccess) {
        accessBadgeLabel = 'Acceso a Microscopía';
        accessBadgeStyle = {
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            borderColor: 'rgba(16, 185, 129, 0.25)',
        };
    }

    const [isLoading, setIsLoading] = useState(true);
    const [isAssignSheetOpen, setIsAssignSheetOpen] = useState(false);
    const {
        isManageCuttingsOpen,
        setIsManageCuttingsOpen,
        handleInsertConcatenatedString,
    } = useManageCuttings({ editorRefs });

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, []);

    const [activeEditor, _setActiveEditor] = useState<Editor | null>(null);
    const activeEditorRef = useRef<Editor | null>(null);
    const setActiveEditor = (editor: Editor | null) => {
        _setActiveEditor(editor);
        activeEditorRef.current = editor;
    };

    const [activeField, setActiveField] = useState<
        | 'diagnosis'
        | 'macroscopy'
        | 'microscopy'
        | 'clinical_details'
        | 'comments_notes'
        | 'protocols'
        | 'legend'
        | 'open_text'
        | 'addendum'
        | null
    >(null);
    const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isAISheetOpen, setIsAISheetOpen] = useState(false);
    const isAISheetOpenRef = useRef(false);
    const updateAISheetOpen = (open: boolean) => {
        setIsAISheetOpen(open);
        isAISheetOpenRef.current = open;
    };

    const [isDictationSheetOpen, setIsDictationSheetOpen] = useState(false);
    const isDictationSheetOpenRef = useRef(false);
    const updateDictationSheetOpen = (open: boolean) => {
        setIsDictationSheetOpen(open);
        isDictationSheetOpenRef.current = open;
    };

    const isPopoverOpenRef = useRef(false);
    const updatePopoverOpen = (open: boolean) => {
        isPopoverOpenRef.current = open;
    };

    const handleEditorFocus = (
        editor: Editor,
        field:
            | 'diagnosis'
            | 'macroscopy'
            | 'microscopy'
            | 'clinical_details'
            | 'comments_notes'
            | 'protocols'
            | 'legend'
            | 'open_text'
            | 'addendum',
    ) => {
        if (focusTimeoutRef.current) {
            clearTimeout(focusTimeoutRef.current);
        }

        setActiveEditor(editor);
        setActiveField(field);
    };

    const handleEditorBlur = () => {
        if (focusTimeoutRef.current) {
            clearTimeout(focusTimeoutRef.current);
        }
    };

    const [reportDate, setReportDate] = useState(
        report?.report_date
            ? report.report_date.split('T')[0]
            : new Date().toISOString().split('T')[0],
    );
    const [sampleCollectionDate, setSampleCollectionDate] = useState(
        specimen?.sample_collection_date
            ? specimen.sample_collection_date.split('T')[0]
            : new Date().toISOString().split('T')[0],
    );
    const [sampleCollectionDateNa, setSampleCollectionDateNa] =
        useState<boolean>(Boolean(specimen?.sample_collection_date_na));
    const [finalizationDate, setFinalizationDate] = useState(
        report?.finalization_date
            ? report.finalization_date.split('T')[0]
            : new Date().toISOString().split('T')[0],
    );
    const [autoFinalizationDate, setAutoFinalizationDate] = useState<boolean>(
        report?.auto_finalization_date ?? true,
    );
    const [macroscopyHtml, setMacroscopyHtml] = useState(
        report?.macroscopy_html || '',
    );
    const [microscopyHtml, setMicroscopyHtml] = useState(
        report?.microscopy_html || '',
    );
    const [diagnosisHtml, setDiagnosisHtml] = useState(
        report?.diagnosis_html || '',
    );
    const [clinicalDetailsHtml, setClinicalDetailsHtml] = useState(
        report?.clinical_details_html || '',
    );
    const [commentsNotesHtml, setCommentsNotesHtml] = useState(
        report?.comments_notes_html || '',
    );
    const [protocolsHtml, setProtocolsHtml] = useState(
        report?.protocols_html || '',
    );
    const [legendHtml, setLegendHtml] = useState(report?.legend_html || '');
    const [openTextHtml, setOpenTextHtml] = useState(
        report?.open_text_html || '',
    );
    const [openTextLabel, setOpenTextLabel] = useState(() => {
        const raw = report?.open_text_label || 'Texto Libre';

        if (/^(Texto\s*Libre){2,}$/i.test(raw.trim())) {
            return 'Texto Libre';
        }

        return raw;
    });
    const [addendumHtml, setAddendumHtml] = useState(
        report?.addendum_html || '',
    );

    const defaultSectionsOrder = [
        { key: 'clinical_details_html', order: 1, active: true },
        { key: 'diagnosis_html', order: 2, active: true },
        { key: 'macroscopy_html', order: 3, active: true },
        { key: 'microscopy_html', order: 4, active: true },
        { key: 'comments_notes_html', order: 5, active: true },
        { key: 'protocols_html', order: 6, active: true },
        { key: 'legend_html', order: 7, active: true },
        { key: 'open_text_html', order: 8, active: true },
    ];

    const [sectionsOrder, setSectionsOrder] = useState<
        Array<{ key: string; order: number; active: boolean }>
    >(() => {
        if (
            report?.sections_order &&
            Array.isArray(report.sections_order) &&
            report.sections_order.length > 0
        ) {
            const loaded = [...report.sections_order].sort(
                (a, b) => a.order - b.order,
            );
            // Merge in any new keys not present in the saved order
            const loadedKeys = new Set(loaded.map((s) => s.key));
            const nextOrder = loaded.length + 1;
            defaultSectionsOrder.forEach((def, i) => {
                if (!loadedKeys.has(def.key)) {
                    loaded.push({ ...def, order: nextOrder + i });
                }
            });

            return loaded;
        }

        return defaultSectionsOrder;
    });

    const defaultHeadingsToggles: Record<string, boolean> = {
        clinical_details_html: true,
        diagnosis_html: true,
        macroscopy_html: true,
        microscopy_html: true,
        comments_notes_html: true,
        protocols_html: true,
        legend_html: false,
        open_text_html: true,
        addendum_html: true,
    };

    const [headingsToggles, setHeadingsToggles] = useState<
        Record<string, boolean>
    >(() => {
        if (
            report?.headings_toggles &&
            typeof report.headings_toggles === 'object'
        ) {
            return { ...defaultHeadingsToggles, ...report.headings_toggles };
        }

        return defaultHeadingsToggles;
    });

    const sanitizeOpenTextLabel = (
        label: string | null | undefined,
    ): string => {
        if (!label) {
            return 'Texto Libre';
        }

        const trimmed = label.trim();

        if (/^(Texto\s*Libre){2,}$/i.test(trimmed)) {
            return 'Texto Libre';
        }

        return label;
    };

    const openTextLabelRef = useRef(openTextLabel);
    useEffect(() => {
        openTextLabelRef.current = openTextLabel;
    }, [openTextLabel]);

    const handleOpenTextLabelChange = (val: string) => {
        const sanitized = sanitizeOpenTextLabel(val);
        setOpenTextLabel(sanitized);

        if (openTextLabelDoc) {
            const ytext = openTextLabelDoc.getText('content');
            openTextLabelDoc.transact(() => {
                ytext.delete(0, ytext.length);
                ytext.insert(0, sanitized);
            });
        }
    };

    const handleHeadingToggle = (key: string, value: boolean) => {
        if (!isAssigned) {
            return;
        }

        const updated = { ...headingsToggles, [key]: value };
        setHeadingsToggles(updated);

        if (headingsTogglesDoc) {
            const ytext = headingsTogglesDoc.getText('content');
            headingsTogglesDoc.transact(() => {
                ytext.delete(0, ytext.length);
                ytext.insert(0, JSON.stringify(updated));
            });
        } else {
            // Persist immediately via the save endpoint
            saveReportEditor(specimen.sequence_code, {
                headings_toggles: updated,
            }).catch((err) => {
                console.error('Failed to persist headings_toggles:', err);
            });
        }
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) {
            return;
        }

        const items = Array.from(sectionsOrder);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        const updatedItems = items.map((item, idx) => ({
            ...item,
            order: idx + 1,
        }));

        setSectionsOrder(updatedItems);

        if (sectionsOrderDoc) {
            const ytext = sectionsOrderDoc.getText('content');
            sectionsOrderDoc.transact(() => {
                ytext.delete(0, ytext.length);
                ytext.insert(0, JSON.stringify(updatedItems));
            });
        }
    };
    const [macroscopyUsers, setMacroscopyUsers] = useState<Collaborator[]>([]);
    const [microscopyUsers, setMicroscopyUsers] = useState<Collaborator[]>([]);
    const [diagnosisUsers, setDiagnosisUsers] = useState<Collaborator[]>([]);
    const [clinicalDetailsUsers, setClinicalDetailsUsers] = useState<
        Collaborator[]
    >([]);
    const [commentsNotesUsers, setCommentsNotesUsers] = useState<
        Collaborator[]
    >([]);
    const [protocolsUsers, setProtocolsUsers] = useState<Collaborator[]>([]);
    const [legendUsers, setLegendUsers] = useState<Collaborator[]>([]);
    const [openTextUsers, setOpenTextUsers] = useState<Collaborator[]>([]);
    const [addendumUsers, setAddendumUsers] = useState<Collaborator[]>([]);

    const isMicroscopyVisible = [
        'microscopic_review',
        'finalized',
        'delivered',
    ].includes(specimen.status);
    const isFinished = ['finalized', 'delivered'].includes(specimen.status);
    const [sessionEditingEnabled, setSessionEditingEnabled] = useState(false);

    const [isManualSaving, setIsManualSaving] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(new Date());
    const [timeString, setTimeString] = useState('Justo ahora');

    const hasMounted = useRef(false);
    const isDirtyRef = useRef(false);
    const httpFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const isTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    // Always points to the latest handleManualSave — safe to call from closures
    const handleManualSaveRef = useRef<() => void>(() => {});

    // Navigation guard state: shadcn dialog shown when user navigates away with unsaved changes
    const [showNavGuard, setShowNavGuard] = useState(false);
    const [isSavingForNav, setIsSavingForNav] = useState(false);
    const pendingNavigationRef = useRef<(() => void) | null>(null);

    const [pages, setPages] = useState<MeasuredBlock[][]>([]);
    const useIsomorphicLayoutEffect =
        typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

    const [dialogZoomScale, setDialogZoomScale] = useState(0.75);

    const calculateLayout = () => {
        const computedPages = ReportPaginator.paginate({
            specimen,
            report: {
                ...report,
                diagnosis_html: diagnosisHtml,
                macroscopy_html: macroscopyHtml,
                microscopy_html: microscopyHtml,
                clinical_details_html: clinicalDetailsHtml,
                comments_notes_html: commentsNotesHtml,
                protocols_html: protocolsHtml,
                legend_html: legendHtml,
                open_text_html: openTextHtml,
                open_text_label: openTextLabel,
                addendum_html: addendumHtml,
                sections_order: sectionsOrder,
                headings_toggles: headingsToggles,
            },
            customer: specimen?.customer_relation,
            referrer: specimen?.referrer_relation,
            isMicroscopyVisible,
        });

        setPages(computedPages);
    };

    useIsomorphicLayoutEffect(() => {
        calculateLayout();
    }, [
        diagnosisHtml,
        macroscopyHtml,
        microscopyHtml,
        clinicalDetailsHtml,
        commentsNotesHtml,
        protocolsHtml,
        legendHtml,
        openTextHtml,
        openTextLabel,
        addendumHtml,
        reportDate,
        sampleCollectionDate,
        finalizationDate,
        specimen,
        isMicroscopyVisible,
        isLoading,
        sectionsOrder,
        headingsToggles,
    ]);

    const calculateLayoutRef = useRef(calculateLayout);
    calculateLayoutRef.current = calculateLayout;

    useEffect(() => {
        const handleImageLoad = (e: Event) => {
            const target = e.target as HTMLElement;

            if (target && target.tagName === 'IMG') {
                calculateLayoutRef.current();
            }
        };

        window.addEventListener('load', handleImageLoad, true);

        return () => {
            window.removeEventListener('load', handleImageLoad, true);
        };
    }, []);

    // Fix 1 & 2: Track typing and trigger HTTP fallback autosave.
    // This replaces the old cosmetic timer that showed "Guardado!" without actually saving.
    // The real save status is driven exclusively by the save-status Yjs room (handleSaveYjsChange).
    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;

            return;
        }

        isDirtyRef.current = true;
        setIsTyping(true);

        if (isTypingTimeoutRef.current) {
            clearTimeout(isTypingTimeoutRef.current);
        }

        isTypingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1500);

        if (httpFallbackTimerRef.current) {
            clearTimeout(httpFallbackTimerRef.current);
        }

        // HTTP fallback: if WebSocket hasn't confirmed a save within 5s, save directly via HTTP
        httpFallbackTimerRef.current = setTimeout(() => {
            if (isDirtyRef.current) {
                handleManualSaveRef.current();
            }
        }, 5000);

        return () => {
            if (httpFallbackTimerRef.current) {
                clearTimeout(httpFallbackTimerRef.current);
            }

            if (isTypingTimeoutRef.current) {
                clearTimeout(isTypingTimeoutRef.current);
            }
        };
    }, [
        macroscopyHtml,
        microscopyHtml,
        diagnosisHtml,
        clinicalDetailsHtml,
        commentsNotesHtml,
        protocolsHtml,
        legendHtml,
        openTextHtml,
        openTextLabel,
        addendumHtml,
        reportDate,
        sampleCollectionDate,
        finalizationDate,
    ]);

    const notifyCollaborationServer = async () => {
        try {
            await notifyCollaborationRefreshInsumos(report?.id);
            console.log('Collaboration server notified of data update');
        } catch (error) {
            console.error('Failed to notify collaboration server:', error);
        }
    };

    // Format relative time passed since last saved
    const getRelativeTimeString = (date: Date | null) => {
        if (!date) {
            return 'Sin guardar';
        }

        const diffMs = Date.now() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);

        if (diffSec < 5) {
            return 'Justo ahora';
        }

        if (diffSec < 60) {
            return 'Hace unos segundos';
        }

        const diffMin = Math.floor(diffSec / 60);

        if (diffMin === 1) {
            return 'Hace 1 minuto';
        }

        return `Hace ${diffMin} minutos`;
    };

    // Recalculate relative time every 10 seconds
    useEffect(() => {
        if (!lastSaved) {
            return;
        }

        setTimeString(getRelativeTimeString(lastSaved));

        const interval = setInterval(() => {
            setTimeString(getRelativeTimeString(lastSaved));
        }, 10000);

        return () => clearInterval(interval);
    }, [lastSaved]);

    const [dateDoc, setDateDoc] = useState<Y.Doc | null>(null);
    const [dateProvider, setDateProvider] = useState<HocuspocusProvider | null>(
        null,
    );
    const [sampleCollectionDateDoc, setSampleCollectionDateDoc] =
        useState<Y.Doc | null>(null);
    const [sampleCollectionDateProvider, setSampleCollectionDateProvider] =
        useState<HocuspocusProvider | null>(null);
    const [finalizationDateDoc, setFinalizationDateDoc] =
        useState<Y.Doc | null>(null);
    const [finalizationDateProvider, setFinalizationDateProvider] =
        useState<HocuspocusProvider | null>(null);
    const [macroscopyDoc, setMacroscopyDoc] = useState<Y.Doc | null>(null);
    const [macroscopyProvider, setMacroscopyProvider] =
        useState<HocuspocusProvider | null>(null);
    const [microscopyDoc, setMicroscopyDoc] = useState<Y.Doc | null>(null);
    const [microscopyProvider, setMicroscopyProvider] =
        useState<HocuspocusProvider | null>(null);
    const [diagnosisDoc, setDiagnosisDoc] = useState<Y.Doc | null>(null);
    const [diagnosisProvider, setDiagnosisProvider] =
        useState<HocuspocusProvider | null>(null);
    const [clinicalDetailsDoc, setClinicalDetailsDoc] = useState<Y.Doc | null>(
        null,
    );
    const [clinicalDetailsProvider, setClinicalDetailsProvider] =
        useState<HocuspocusProvider | null>(null);
    const [commentsNotesDoc, setCommentsNotesDoc] = useState<Y.Doc | null>(
        null,
    );
    const [commentsNotesProvider, setCommentsNotesProvider] =
        useState<HocuspocusProvider | null>(null);
    const [protocolsDoc, setProtocolsDoc] = useState<Y.Doc | null>(null);
    const [protocolsProvider, setProtocolsProvider] =
        useState<HocuspocusProvider | null>(null);
    const [legendDoc, setLegendDoc] = useState<Y.Doc | null>(null);
    const [legendProvider, setLegendProvider] =
        useState<HocuspocusProvider | null>(null);
    const [insumosDoc, setInsumosDoc] = useState<Y.Doc | null>(null);
    const [insumosProvider, setInsumosProvider] =
        useState<HocuspocusProvider | null>(null);
    const [saveStatusDoc, setSaveStatusDoc] = useState<Y.Doc | null>(null);
    const [saveStatusProvider, setSaveStatusProvider] =
        useState<HocuspocusProvider | null>(null);
    const [sectionsOrderDoc, setSectionsOrderDoc] = useState<Y.Doc | null>(
        null,
    );
    const [sectionsOrderProvider, setSectionsOrderProvider] =
        useState<HocuspocusProvider | null>(null);
    const [openTextDoc, setOpenTextDoc] = useState<Y.Doc | null>(null);
    const [openTextProvider, setOpenTextProvider] =
        useState<HocuspocusProvider | null>(null);
    const [openTextLabelDoc, setOpenTextLabelDoc] = useState<Y.Doc | null>(
        null,
    );
    const [openTextLabelProvider, setOpenTextLabelProvider] =
        useState<HocuspocusProvider | null>(null);
    const [addendumDoc, setAddendumDoc] = useState<Y.Doc | null>(null);
    const [addendumProvider, setAddendumProvider] =
        useState<HocuspocusProvider | null>(null);
    const [headingsTogglesDoc, setHeadingsTogglesDoc] = useState<Y.Doc | null>(
        null,
    );
    const [headingsTogglesProvider, setHeadingsTogglesProvider] =
        useState<HocuspocusProvider | null>(null);
    const [globalSaveState, setGlobalSaveState] = useState<
        'idle' | 'saving' | 'saved' | 'error'
    >('idle');

    const lastTemplateAppliedTime = useRef<number>(0);

    useEffect(() => {
        const activeProvider =
            macroscopyProvider ||
            microscopyProvider ||
            diagnosisProvider ||
            clinicalDetailsProvider;

        if (!activeProvider) {
            return;
        }

        const handleAwarenessUpdate = () => {
            const states = activeProvider.awareness?.getStates() || new Map();
            states.forEach((state: any) => {
                if (
                    state.templateApplied &&
                    state.templateApplied.time > lastTemplateAppliedTime.current
                ) {
                    lastTemplateAppliedTime.current =
                        state.templateApplied.time;

                    if (state.user && state.user.name !== auth.user.name) {
                        toast.success(
                            `${state.user.name} ha aplicado la plantilla ${state.templateApplied.name || 'de reporte'} en tiempo real.`,
                        );
                    }
                }
            });
        };

        activeProvider.awareness?.on('update', handleAwarenessUpdate);

        return () => {
            activeProvider.awareness?.off('update', handleAwarenessUpdate);
        };
    }, [
        macroscopyProvider,
        microscopyProvider,
        diagnosisProvider,
        clinicalDetailsProvider,
        auth.user.name,
    ]);

    const handleApplyTemplate = async (templateId: string | string[]) => {
        if (
            !templateId ||
            (Array.isArray(templateId) && templateId.length === 0)
        ) {
            return;
        }

        try {
            const data = await applyReportTemplate(
                specimen.sequence_code,
                templateId,
            );

            const template = data.template;

            if (!template) {
                return;
            }

            // 1. Update all Tiptap collaborative editors
            const fieldToTemplateKey: Record<string, string> = {
                clinical_details: 'clinical_details_html',
                diagnosis: 'diagnosis_html',
                macroscopy: 'macroscopy_html',
                microscopy: 'microscopy_html',
                comments_notes: 'comments_notes_html',
                protocols: 'protocols_html',
                legend: 'legend_html',
                open_text: 'open_text_html',
                addendum: 'addendum_html',
            };

            Object.keys(fieldToTemplateKey).forEach((field) => {
                const editor = editorRefs.current[field];
                const templateKey = fieldToTemplateKey[field];
                const rawTemplateContent = template[templateKey] || '';

                if (editor) {
                    const currentContent = editor.getHTML();
                    const isCurrentEmpty =
                        !currentContent ||
                        currentContent === '<p></p>' ||
                        currentContent === '<p></p><p></p>' ||
                        isEmptyHtml(currentContent);

                    const cleanedTemplateContent =
                        cleanPastedHtml(rawTemplateContent);
                    const mergedContent = isCurrentEmpty
                        ? cleanedTemplateContent
                        : cleanPastedHtml(
                              cleanedTemplateContent + currentContent,
                          );

                    editor.commands.setContent(mergedContent);
                }
            });

            // 2. Update sections order Yjs document
            if (sectionsOrderDoc) {
                const ytextOrder = sectionsOrderDoc.getText('content');
                ytextOrder.delete(0, ytextOrder.toString().length);
                ytextOrder.insert(
                    0,
                    JSON.stringify(template.sections_order || []),
                );
            }

            // Update open text label Yjs document
            if (openTextLabelDoc) {
                const ytextLabel = openTextLabelDoc.getText('content');
                ytextLabel.delete(0, ytextLabel.toString().length);
                ytextLabel.insert(0, template.open_text_label || 'Texto Libre');
            }

            // Update headings toggles Yjs document
            if (headingsTogglesDoc) {
                const ytextToggles = headingsTogglesDoc.getText('content');
                ytextToggles.delete(0, ytextToggles.toString().length);
                ytextToggles.insert(
                    0,
                    JSON.stringify(template.headings_toggles || {}),
                );
            }

            // 3. Update local states
            if (template.sections_order) {
                const loaded = [...template.sections_order].sort(
                    (a, b) => a.order - b.order,
                );
                const loadedKeys = new Set(loaded.map((s) => s.key));
                const nextOrder = loaded.length + 1;
                defaultSectionsOrder.forEach((def, i) => {
                    if (!loadedKeys.has(def.key)) {
                        loaded.push({ ...def, order: nextOrder + i });
                    }
                });
                setSectionsOrder(loaded);
            }

            if (template.open_text_label) {
                setOpenTextLabel(template.open_text_label);
            }

            if (template.headings_toggles) {
                setHeadingsToggles(template.headings_toggles);
            }

            // 4. Broadcast awareness state change to notify other peers
            const activeProvider =
                macroscopyProvider ||
                microscopyProvider ||
                diagnosisProvider ||
                clinicalDetailsProvider;

            if (activeProvider && activeProvider.awareness) {
                activeProvider.awareness.setLocalStateField('templateApplied', {
                    by: auth.user.name,
                    name: template.user?.name
                        ? `de ${template.user.name}`
                        : 'de reporte',
                    time: Date.now(),
                });
            }

            toast.success('Plantilla aplicada y sincronizada con éxito.');
        } catch (err: any) {
            toast.error(err.message || 'Error al aplicar la plantilla.');
            console.error(err);
        }
    };

    const reportDateRef = useRef(reportDate);
    const sampleCollectionDateRef = useRef(sampleCollectionDate);
    const finalizationDateRef = useRef(finalizationDate);

    useEffect(() => {
        reportDateRef.current = reportDate;
    }, [reportDate]);

    useEffect(() => {
        sampleCollectionDateRef.current = sampleCollectionDate;
    }, [sampleCollectionDate]);

    useEffect(() => {
        finalizationDateRef.current = finalizationDate;
    }, [finalizationDate]);

    /**
     * Core async save — builds the payload and persists to the server.
     * Returns a Promise that resolves on success and rejects on failure.
     * Does NOT update the Yjs status room or show toasts; callers handle those.
     */
    const saveReportEditorAsync = (): Promise<void> => {
        const cleanOpenTextLabel = sanitizeOpenTextLabel(openTextLabel);

        return saveReportEditor(specimen.sequence_code, {
            report_date: reportDate,
            sample_collection_date: sampleCollectionDate,
            finalization_date: finalizationDate,
            auto_finalization_date: autoFinalizationDate,
            macroscopy_html: macroscopyHtml,
            microscopy_html: microscopyHtml,
            diagnosis_html: diagnosisHtml,
            clinical_details_html: clinicalDetailsHtml,
            comments_notes_html: commentsNotesHtml,
            protocols_html: protocolsHtml,
            legend_html: legendHtml,
            open_text_html: openTextHtml,
            open_text_label: cleanOpenTextLabel,
            addendum_html: addendumHtml,
            sections_order: sectionsOrder,
            headings_toggles: headingsToggles,
        }).then(() => {
            isDirtyRef.current = false;

            if (httpFallbackTimerRef.current) {
                clearTimeout(httpFallbackTimerRef.current);
                httpFallbackTimerRef.current = null;
            }

            setLastSaved(new Date());
        });
    };

    const handleManualSave = () => {
        if (saveStatusDoc) {
            const ytext = saveStatusDoc.getText('content');
            saveStatusDoc.transact(() => {
                ytext.delete(0, ytext.length);
                ytext.insert(0, 'saving');
            });
        } else {
            setIsManualSaving(true);
        }

        saveReportEditorAsync()
            .then(() => {
                if (saveStatusDoc) {
                    const ytext = saveStatusDoc.getText('content');
                    saveStatusDoc.transact(() => {
                        ytext.delete(0, ytext.length);
                        ytext.insert(0, 'saved');
                    });
                    setTimeout(() => {
                        saveStatusDoc.transact(() => {
                            ytext.delete(0, ytext.length);
                            ytext.insert(0, 'idle');
                        });
                    }, 1300);
                }

                toast.success('Reporte guardado con éxito');
                router.reload({
                    only: ['report'],
                });
            })
            .catch((err) => {
                console.error(err);
                toast.error(err.message || 'Error al guardar el reporte');

                if (saveStatusDoc) {
                    const ytext = saveStatusDoc.getText('content');
                    saveStatusDoc.transact(() => {
                        ytext.delete(0, ytext.length);
                        ytext.insert(0, 'error');
                    });
                } else {
                    setGlobalSaveState('error');
                }
            })
            .finally(() => {
                setIsManualSaving(false);
            });
    };

    // Always keep the ref current so closures (beforeunload, HTTP fallback timer) use the latest version
    handleManualSaveRef.current = handleManualSave;

    useEffect(() => {
        if (!report) {
            return;
        }

        // 1. Date room
        const dDoc = new Y.Doc();
        const dProvider = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-report_date`,
            document: dDoc,
            token: 'secure-token-or-session-id',
        });

        setDateDoc(dDoc);
        setDateProvider(dProvider);

        const ytext = dDoc.getText('content');
        const handleYjsChange = () => {
            const val = ytext.toString().trim();

            if (val) {
                const match = val.match(/\d{4}-\d{2}-\d{2}/);
                const dateVal = match ? match[0] : val.split('T')[0];

                if (dateVal && dateVal !== reportDateRef.current) {
                    setReportDate(dateVal);
                }
            }
        };
        ytext.observe(handleYjsChange);

        // 1.2. Sample Collection Date room
        const scDoc = new Y.Doc();
        const scProvider = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-sample_collection_date`,
            document: scDoc,
            token: 'secure-token-or-session-id',
        });

        setSampleCollectionDateDoc(scDoc);
        setSampleCollectionDateProvider(scProvider);

        const ytextSc = scDoc.getText('content');
        const handleScYjsChange = () => {
            const val = ytextSc.toString().trim();

            if (val) {
                const match = val.match(/\d{4}-\d{2}-\d{2}/);
                const dateVal = match ? match[0] : val.split('T')[0];

                if (dateVal && dateVal !== sampleCollectionDateRef.current) {
                    setSampleCollectionDate(dateVal);
                }
            }
        };
        ytextSc.observe(handleScYjsChange);

        // 1.3. Finalization Date room
        const fDoc = new Y.Doc();
        const fProvider = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-finalization_date`,
            document: fDoc,
            token: 'secure-token-or-session-id',
        });

        setFinalizationDateDoc(fDoc);
        setFinalizationDateProvider(fProvider);

        const ytextF = fDoc.getText('content');
        const handleFYjsChange = () => {
            const val = ytextF.toString().trim();

            if (val) {
                const match = val.match(/\d{4}-\d{2}-\d{2}/);
                const dateVal = match ? match[0] : val.split('T')[0];

                if (dateVal && dateVal !== finalizationDateRef.current) {
                    setFinalizationDate(dateVal);
                }
            }
        };
        ytextF.observe(handleFYjsChange);

        // 2. Macroscopy room
        const macDoc = new Y.Doc();
        const macProvider = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-macroscopy`,
            document: macDoc,
            token: 'secure-token-or-session-id',
        });
        macProvider.awareness?.setLocalStateField('user', {
            name: auth.user.name,
            color: auth.user.cursor_color || '#8b5cf6',
        });

        setMacroscopyDoc(macDoc);
        setMacroscopyProvider(macProvider);

        // 3. Microscopy room
        const micDoc = new Y.Doc();
        const micProvider = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-microscopy`,
            document: micDoc,
            token: 'secure-token-or-session-id',
        });
        micProvider.awareness?.setLocalStateField('user', {
            name: auth.user.name,
            color: auth.user.cursor_color || '#d946ef',
        });

        setMicroscopyDoc(micDoc);
        setMicroscopyProvider(micProvider);

        // 4. Diagnosis room
        const diagDoc = new Y.Doc();
        const diagProvider = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-diagnosis`,
            document: diagDoc,
            token: 'secure-token-or-session-id',
        });
        diagProvider.awareness?.setLocalStateField('user', {
            name: auth.user.name,
            color: auth.user.cursor_color || '#3b82f6',
        });

        setDiagnosisDoc(diagDoc);
        setDiagnosisProvider(diagProvider);

        // 4.1 Clinical Details room
        const clinDoc = new Y.Doc();
        const clinProvider = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-clinical_details`,
            document: clinDoc,
            token: 'secure-token-or-session-id',
        });
        clinProvider.awareness?.setLocalStateField('user', {
            name: auth.user.name,
            color: auth.user.cursor_color || '#10b981',
        });
        setClinicalDetailsDoc(clinDoc);
        setClinicalDetailsProvider(clinProvider);

        // 4.2 Comments Notes room
        const commDoc = new Y.Doc();
        const commProvider = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-comments_notes`,
            document: commDoc,
            token: 'secure-token-or-session-id',
        });
        commProvider.awareness?.setLocalStateField('user', {
            name: auth.user.name,
            color: auth.user.cursor_color || '#f59e0b',
        });
        setCommentsNotesDoc(commDoc);
        setCommentsNotesProvider(commProvider);

        // 4.3 Protocols room
        const protDoc = new Y.Doc();
        const protProvider = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-protocols`,
            document: protDoc,
            token: 'secure-token-or-session-id',
        });
        protProvider.awareness?.setLocalStateField('user', {
            name: auth.user.name,
            color: auth.user.cursor_color || '#2563eb',
        });
        setProtocolsDoc(protDoc);
        setProtocolsProvider(protProvider);

        // 4.4 Legend room
        const legDoc = new Y.Doc();
        const legProvider = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-legend`,
            document: legDoc,
            token: 'secure-token-or-session-id',
        });
        legProvider.awareness?.setLocalStateField('user', {
            name: auth.user.name,
            color: auth.user.cursor_color || '#64748b',
        });
        setLegendDoc(legDoc);
        setLegendProvider(legProvider);

        // 4.5 Insumos room (real-time reload notifier)
        const insDoc = new Y.Doc();
        const insProvider = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-insumos`,
            document: insDoc,
            token: 'secure-token-or-session-id',
        });
        setInsumosDoc(insDoc);
        setInsumosProvider(insProvider);

        const ytextInsumos = insDoc.getText('content');
        const handleInsumosYjsChange = () => {
            const val = ytextInsumos.toString();

            if (val) {
                console.log(`Insumos refreshed via collaboration: ${val}`);
                router.reload({
                    only: ['specimen'],
                });
            }
        };
        ytextInsumos.observe(handleInsumosYjsChange);

        // 5. Save Status room
        const saveDoc = new Y.Doc();
        const saveProvider = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-save-status`,
            document: saveDoc,
            token: 'secure-token-or-session-id',
        });

        setSaveStatusDoc(saveDoc);
        setSaveStatusProvider(saveProvider);

        const ytextSave = saveDoc.getText('content');
        const handleSaveYjsChange = () => {
            const val = ytextSave.toString();

            if (val === 'saving') {
                setGlobalSaveState('saving');
            } else if (val === 'saved') {
                setGlobalSaveState('saved');
                setLastSaved(new Date());
                // WebSocket save confirmed — cancel HTTP fallback, clear dirty flag
                isDirtyRef.current = false;

                if (httpFallbackTimerRef.current) {
                    clearTimeout(httpFallbackTimerRef.current);
                    httpFallbackTimerRef.current = null;
                }
            } else if (val === 'error') {
                setGlobalSaveState('error');
            } else {
                setGlobalSaveState('idle');
            }
        };
        ytextSave.observe(handleSaveYjsChange);

        // 6. Sections Order room
        const orderDoc = new Y.Doc();
        const orderProvider = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-sections_order`,
            document: orderDoc,
            token: 'secure-token-or-session-id',
        });

        setSectionsOrderDoc(orderDoc);
        setSectionsOrderProvider(orderProvider);

        const ytextOrder = orderDoc.getText('content');
        const handleOrderYjsChange = () => {
            const val = ytextOrder.toString().trim();

            if (val) {
                try {
                    const parsed = JSON.parse(val);

                    if (Array.isArray(parsed) && parsed.length > 0) {
                        // Merge in any new keys (e.g. open_text_html) missing from the synced order
                        const parsedKeys = new Set(
                            parsed.map((s: { key: string }) => s.key),
                        );
                        const nextOrder = parsed.length + 1;
                        defaultSectionsOrder.forEach((def, i) => {
                            if (!parsedKeys.has(def.key)) {
                                parsed.push({ ...def, order: nextOrder + i });
                            }
                        });

                        setSectionsOrder((prev) => {
                            const currentKeysStr = JSON.stringify(prev);
                            const newKeysStr = JSON.stringify(parsed);

                            if (currentKeysStr !== newKeysStr) {
                                return parsed;
                            }

                            return prev;
                        });
                    }
                } catch (e) {
                    console.error(
                        'Failed to parse sections_order from Yjs update:',
                        e,
                    );
                }
            }
        };
        ytextOrder.observe(handleOrderYjsChange);

        // 6.1. Open Text Label room
        const labelDoc = new Y.Doc();
        const labelProvider = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-open_text_label`,
            document: labelDoc,
            token: 'secure-token-or-session-id',
        });
        setOpenTextLabelDoc(labelDoc);
        setOpenTextLabelProvider(labelProvider);
        const ytextLabel = labelDoc.getText('content');
        const handleLabelYjsChange = () => {
            const val = ytextLabel.toString().trim();
            const sanitizedVal = sanitizeOpenTextLabel(val);

            if (sanitizedVal && sanitizedVal !== openTextLabelRef.current) {
                setOpenTextLabel(sanitizedVal);
            }
        };
        ytextLabel.observe(handleLabelYjsChange);

        // 6.2. Headings Toggles room
        const togglesDoc = new Y.Doc();
        const togglesProvider = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-headings_toggles`,
            document: togglesDoc,
            token: 'secure-token-or-session-id',
        });
        setHeadingsTogglesDoc(togglesDoc);
        setHeadingsTogglesProvider(togglesProvider);
        const ytextToggles = togglesDoc.getText('content');
        const handleTogglesYjsChange = () => {
            const val = ytextToggles.toString().trim();

            if (val) {
                try {
                    const parsed = JSON.parse(val);

                    if (parsed && typeof parsed === 'object') {
                        setHeadingsToggles((prev) => {
                            if (
                                JSON.stringify(prev) !== JSON.stringify(parsed)
                            ) {
                                return { ...defaultHeadingsToggles, ...parsed };
                            }

                            return prev;
                        });
                    }
                } catch (e) {
                    console.error('Failed to parse headings_toggles:', e);
                }
            }
        };
        ytextToggles.observe(handleTogglesYjsChange);

        // 6.3. Open Text room
        const openTextD = new Y.Doc();
        const openTextP = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-open_text`,
            document: openTextD,
            token: 'secure-token-or-session-id',
        });
        openTextP.awareness?.setLocalStateField('user', {
            name: auth.user.name,
            color: auth.user.cursor_color || '#6366f1',
        });
        setOpenTextDoc(openTextD);
        setOpenTextProvider(openTextP);

        // 6.4. Addendum room
        const addendumD = new Y.Doc();
        const addendumP = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-addendum`,
            document: addendumD,
            token: 'secure-token-or-session-id',
        });
        addendumP.awareness?.setLocalStateField('user', {
            name: auth.user.name,
            color: auth.user.cursor_color || '#f59e0b',
        });
        setAddendumDoc(addendumD);
        setAddendumProvider(addendumP);

        return () => {
            ytext.unobserve(handleYjsChange);
            ytextSc.unobserve(handleScYjsChange);
            ytextF.unobserve(handleFYjsChange);
            ytextSave.unobserve(handleSaveYjsChange);
            ytextInsumos.unobserve(handleInsumosYjsChange);
            ytextOrder.unobserve(handleOrderYjsChange);
            ytextLabel.unobserve(handleLabelYjsChange);
            ytextToggles.unobserve(handleTogglesYjsChange);
            dProvider.destroy();
            dDoc.destroy();
            scProvider.destroy();
            scDoc.destroy();
            fProvider.destroy();
            fDoc.destroy();
            macProvider.destroy();
            macDoc.destroy();
            micProvider.destroy();
            micDoc.destroy();
            diagProvider.destroy();
            diagDoc.destroy();
            clinProvider.destroy();
            clinDoc.destroy();
            commProvider.destroy();
            commDoc.destroy();
            protProvider.destroy();
            protDoc.destroy();
            legProvider.destroy();
            legDoc.destroy();
            insProvider.destroy();
            insDoc.destroy();
            saveProvider.destroy();
            saveDoc.destroy();
            orderProvider.destroy();
            orderDoc.destroy();
            labelProvider.destroy();
            labelDoc.destroy();
            togglesProvider.destroy();
            togglesDoc.destroy();
            openTextP.destroy();
            openTextD.destroy();
            addendumP.destroy();
            addendumD.destroy();
            setDateDoc(null);
            setDateProvider(null);
            setSampleCollectionDateDoc(null);
            setSampleCollectionDateProvider(null);
            setFinalizationDateDoc(null);
            setFinalizationDateProvider(null);
            setMacroscopyDoc(null);
            setMacroscopyProvider(null);
            setMicroscopyDoc(null);
            setMicroscopyProvider(null);
            setDiagnosisDoc(null);
            setDiagnosisProvider(null);
            setClinicalDetailsDoc(null);
            setClinicalDetailsProvider(null);
            setCommentsNotesDoc(null);
            setCommentsNotesProvider(null);
            setProtocolsDoc(null);
            setProtocolsProvider(null);
            setLegendDoc(null);
            setLegendProvider(null);
            setInsumosDoc(null);
            setInsumosProvider(null);
            setSaveStatusDoc(null);
            setSaveStatusProvider(null);
            setSectionsOrderDoc(null);
            setSectionsOrderProvider(null);
            setOpenTextLabelDoc(null);
            setOpenTextLabelProvider(null);
            setHeadingsTogglesDoc(null);
            setHeadingsTogglesProvider(null);
            setOpenTextDoc(null);
            setOpenTextProvider(null);
            setAddendumDoc(null);
            setAddendumProvider(null);
        };
    }, [report?.id]);

    // Fix 5: Warn user on accidental navigation while there are unsaved changes.
    // Also fires a best-effort save so data is not lost on tab close.
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!isDirtyRef.current) {
                return;
            }

            // Best-effort save — may not complete if browser closes immediately
            handleManualSaveRef.current();

            e.preventDefault();
            e.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () =>
            window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // In-app navigation guard: intercept Inertia router visits while there are unsaved changes.
    // (For actual browser close/F5, the native beforeunload dialog above is used.)
    useEffect(() => {
        const removeListener = router.on('before', (event: any) => {
            if (!isDirtyRef.current) {
                return;
            }

            const visit = event.detail?.visit;

            // Skip partial data-only reloads (collaboration refresh, post-save reload, etc.)
            const isPartialReload =
                Array.isArray(visit?.only) && visit.only.length > 0;

            if (isPartialReload) {
                return;
            }

            // Cancel the Inertia navigation and show the guard dialog
            event.preventDefault();

            pendingNavigationRef.current = () => {
                router.visit(visit?.url ?? window.location.href, {
                    method: visit?.method ?? 'get',
                    data: visit?.data,
                    preserveState: false,
                    preserveScroll: false,
                });
            };

            setShowNavGuard(true);
        });

        return removeListener;
    }, []);

    const [statusDoc, setStatusDoc] = useState<Y.Doc | null>(null);
    const [statusProvider, setStatusProvider] =
        useState<HocuspocusProvider | null>(null);
    const specimenStatusRef = useRef(specimen.status);

    useEffect(() => {
        specimenStatusRef.current = specimen.status;
    }, [specimen.status]);

    useEffect(() => {
        if (!report) {
            return;
        }

        const doc = new Y.Doc();
        const provider = new HocuspocusProvider({
            url: WS_COLLABORATION_SERVER_URL,
            name: `report-${report.id}-status`,
            document: doc,
            token: 'secure-token-or-session-id',
        });

        setStatusDoc(doc);
        setStatusProvider(provider);

        const ytext = doc.getText('content');
        const handleYjsChange = () => {
            const val = ytext.toString();

            if (val && val !== specimenStatusRef.current) {
                console.log(`Status changed via collaboration: ${val}`);
                const statusLabels: Record<string, string> = {
                    received: 'Recibido',
                    macroscopic_review: 'Revisión Macroscópica',
                    processing: 'Procesamiento',
                    microscopic_review: 'Revisión Microscópica',
                    finalized: 'Finalizado',
                    delivered: 'Entregado',
                    cancelled: 'Cancelado',
                };
                const statusName = statusLabels[val] || val;
                toast.info(
                    `El estado de la muestra ha cambiado a: ${statusName}`,
                );
                router.reload();
            }
        };
        ytext.observe(handleYjsChange);

        return () => {
            ytext.unobserve(handleYjsChange);
            provider.destroy();
            doc.destroy();
            setStatusDoc(null);
            setStatusProvider(null);
        };
    }, [report?.id]);

    const allCollaborators = [
        { name: auth.user.name, color: auth.user.cursor_color || '#3b82f6' },
        ...macroscopyUsers,
        ...microscopyUsers,
        ...diagnosisUsers,
        ...clinicalDetailsUsers,
        ...commentsNotesUsers,
        ...protocolsUsers,
        ...legendUsers,
    ];
    const [isSpecimenSheetOpen, setIsSpecimenSheetOpen] = useState(false);

    useEffect(() => {
        if (report) {
            // NOTE: Date fields (reportDate, sampleCollectionDate, finalizationDate)
            // are intentionally NOT synced here. They are managed exclusively by their
            // Yjs collaboration providers (handleYjsChange, handleScYjsChange,
            // handleFYjsChange) and the explicit date-update handlers. Re-syncing them
            // from Inertia props on unrelated prop changes (e.g. after editing patient
            // or referrer data) caused dates to revert to stale values.
            setMacroscopyHtml(report.macroscopy_html || '');
            setMicroscopyHtml(report.microscopy_html || '');
            setDiagnosisHtml(report.diagnosis_html || '');
        }
    }, [report, specimen]);

    const specimenExaminationsList = useMemo(() => {
        const list: Array<{ id?: number; name: string }> = [];
        const seen = new Set<string>();

        if (
            Array.isArray(specimen.examinations) &&
            specimen.examinations.length > 0
        ) {
            specimen.examinations.forEach((e: any) => {
                const name = e.name;

                if (name && !seen.has(name)) {
                    seen.add(name);
                    list.push({ id: e.id, name });
                }
            });
        }

        if (
            Array.isArray(specimen.specimen_examinations) &&
            specimen.specimen_examinations.length > 0
        ) {
            specimen.specimen_examinations.forEach((se: any) => {
                const exam = se.examination || se;
                const name = exam.name;

                if (name && !seen.has(name)) {
                    seen.add(name);
                    list.push({ id: exam.id || se.examination_id, name });
                }
            });
        }

        if (
            Array.isArray(specimen.specimenExaminations) &&
            specimen.specimenExaminations.length > 0
        ) {
            specimen.specimenExaminations.forEach((se: any) => {
                const exam = se.examination || se;
                const name = exam.name;

                if (name && !seen.has(name)) {
                    seen.add(name);
                    list.push({ id: exam.id || se.examination_id, name });
                }
            });
        }

        if (list.length === 0 && specimen.examination?.name) {
            list.push({
                id: specimen.examination.id,
                name: specimen.examination.name,
            });
        }

        return list;
    }, [specimen]);

    const examinationNames = useMemo(() => {
        return (
            specimenExaminationsList.map((e: any) => e.name).join(', ') ||
            specimen.examination?.name ||
            ''
        );
    }, [specimenExaminationsList, specimen]);

    const handleUpdateDate = (dateVal: string) => {
        if (!dateVal) {
            return;
        }

        const match = dateVal.match(/\d{4}-\d{2}-\d{2}/);
        const sanitized = match ? match[0] : dateVal;

        setReportDate(sanitized);

        if (dateDoc) {
            const ytext = dateDoc.getText('content');

            if (ytext.toString().trim() !== sanitized) {
                dateDoc.transact(() => {
                    ytext.delete(0, ytext.length);
                    ytext.insert(0, sanitized);
                });
            }
        }

        // Also persist directly to database
        saveReportEditor(specimen.sequence_code, { report_date: sanitized })
            .then(() => {
                router.reload({ only: ['specimen', 'report'] });
            })
            .catch((err) => {
                console.error('Failed to persist report_date:', err);
            });
    };

    const handleUpdateSampleCollectionDate = (dateVal: string) => {
        if (!dateVal) {
            return;
        }

        const match = dateVal.match(/\d{4}-\d{2}-\d{2}/);
        const sanitized = match ? match[0] : dateVal;

        setSampleCollectionDate(sanitized);

        if (sampleCollectionDateDoc) {
            const ytext = sampleCollectionDateDoc.getText('content');

            if (ytext.toString().trim() !== sanitized) {
                sampleCollectionDateDoc.transact(() => {
                    ytext.delete(0, ytext.length);
                    ytext.insert(0, sanitized);
                });
            }
        }

        saveReportEditor(specimen.sequence_code, {
            sample_collection_date: sanitized,
        })
            .then(() => {
                router.reload({ only: ['specimen', 'report'] });
            })
            .catch((err) => {
                console.error('Failed to persist sample_collection_date:', err);
            });
    };

    const handleToggleSampleCollectionDateNa = (checked: boolean) => {
        setSampleCollectionDateNa(checked);
        specimen.sample_collection_date_na = checked;

        saveReportEditor(specimen.sequence_code, {
            sample_collection_date_na: checked,
        })
            .then(() => {
                router.reload({ only: ['specimen', 'report'] });
            })
            .catch((err) => {
                console.error(
                    'Failed to persist sample_collection_date_na:',
                    err,
                );
            });
    };

    const handleUpdateFinalizationDate = (dateVal: string) => {
        if (!dateVal) {
            return Promise.resolve();
        }

        const match = dateVal.match(/\d{4}-\d{2}-\d{2}/);
        const sanitized = match ? match[0] : dateVal;

        setFinalizationDate(sanitized);

        if (finalizationDateDoc) {
            const ytext = finalizationDateDoc.getText('content');

            if (ytext.toString().trim() !== sanitized) {
                finalizationDateDoc.transact(() => {
                    ytext.delete(0, ytext.length);
                    ytext.insert(0, sanitized);
                });
            }
        }

        return saveReportEditor(specimen.sequence_code, {
            finalization_date: sanitized,
        })
            .then(() => {
                router.reload({ only: ['specimen', 'report'] });
            })
            .catch((err) => {
                console.error('Failed to persist finalization_date:', err);
            });
    };

    const handleToggleAutoFinalizationDate = (checked: boolean) => {
        setAutoFinalizationDate(checked);

        if (report) {
            report.auto_finalization_date = checked;
        }

        if (checked) {
            toast.info(
                'Fecha de finalización automática activada: La fecha de finalización se actualizará automáticamente a la fecha del día en que se finalice el reporte (si se genera una previsualización del reporte NO se actualizará la fecha de finalización, únicamente cuando se finalice la muestra).',
                { duration: 6000 },
            );
        } else {
            toast.info(
                'Fecha de finalización automática desactivada: La fecha de finalización permanecerá estática en el valor que selecciones y no cambiará al finalizar el reporte.',
                { duration: 6000 },
            );
        }

        saveReportEditor(specimen.sequence_code, {
            auto_finalization_date: checked,
        })
            .then(() => {
                router.reload({ only: ['specimen', 'report'] });
            })
            .catch((err) => {
                console.error('Failed to persist auto_finalization_date:', err);
            });
    };

    const {
        handleTransitionState,
        unsignedPathologists,
        showSignatureWarning,
        setShowSignatureWarning,
    } = useTransitionState({
        specimen,
        statusDoc,
        specimenStatusRef,
        setSessionEditingEnabled,
    });

    const {
        isGeneratingPdf,
        showCompleteMicroscopyDialog,
        setShowCompleteMicroscopyDialog,
        tempPdfUrl,
        handleStartMicroscopyFinalization,
    } = useFinalizeReport({
        specimenSequenceCode: specimen.sequence_code,
        onUpdateFinalizationDate: handleUpdateFinalizationDate,
        onTransitionState: handleTransitionState,
        onBeforeSave: saveReportEditorAsync,
        autoFinalizationDate,
        finalizationDate,
    });

    // Loader for 300ms
    if (isLoading) {
        return <LoadingReportScreen specimen={specimen} />;
    }

    // Blank screen when report does not exist
    if (!report) {
        return (
            <BlankReportScreen
                specimen={specimen}
                templates={templates}
                isAssigned={isAssigned}
            />
        );
    }

    const isMacroscopyEditable =
        (['macroscopic_review', 'processing', 'microscopic_review'].includes(
            specimen.status,
        ) ||
            (isFinished && sessionEditingEnabled)) &&
        hasMacroAccess;
    const isMicroscopyEditable =
        (specimen.status === 'microscopic_review' ||
            (isFinished && sessionEditingEnabled)) &&
        hasMicroAccess;
    const totalPages = pages.length > 0 ? pages.length : 1;

    const renderPreviewPage = (pageNum: number) => {
        const pageBlocks = pages[pageNum - 1] || [];
        const totalNumPages = pages.length > 0 ? pages.length : 1;

        return (
            <PagePreview
                pageNum={pageNum}
                totalPages={totalNumPages}
                pageBlocks={pageBlocks}
                specimen={specimen}
                sampleCollectionDate={sampleCollectionDate}
                reportDate={reportDate}
                finalizationDate={finalizationDate}
                customEditorStyles={editorStyles}
            />
        );
    };

    return (
        <DebugReportProvider pagePropsDebugReport={debugReport}>
            <EditorRegistryContext.Provider value={{ registerEditor }}>
                <EditorLayout
                    breadcrumbs={[
                        { title: 'Mis Asignaciones', href: '/my-assignments' },
                        {
                            title: specimen.sequence_code,
                            href: `/specimens?specimen=${specimen.sequence_code}&action=view`,
                        },
                        { title: 'Editor de Informe', href: '#' },
                    ]}
                    headerRight={
                        <div className="flex items-center gap-3">
                            <CollaboratorsList users={allCollaborators} />
                            <div className="h-6 w-px bg-border/80" />
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
                                {globalSaveState === 'saving' ? (
                                    <>
                                        <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                                        <span className="animate-pulse font-medium text-amber-600 dark:text-amber-500">
                                            Guardando...
                                        </span>
                                    </>
                                ) : isTyping ? (
                                    <>
                                        <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
                                        <span className="animate-pulse font-medium text-indigo-600 dark:text-indigo-500">
                                            Escribiendo...
                                        </span>
                                    </>
                                ) : globalSaveState === 'saved' ? (
                                    <>
                                        <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                                        <span className="font-medium text-emerald-600 dark:text-emerald-500">
                                            ¡Guardado!
                                        </span>
                                    </>
                                ) : globalSaveState === 'error' ? (
                                    <>
                                        <div className="h-2 w-2 rounded-full bg-red-500" />
                                        <span className="font-medium text-red-600 dark:text-red-500">
                                            Error al guardar
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                        <span className="font-medium text-emerald-600 dark:text-emerald-500">
                                            {timeString}
                                        </span>
                                    </>
                                )}
                            </div>
                            <button
                                data-slot="button"
                                onClick={handleManualSave}
                                disabled={
                                    globalSaveState === 'saving' ||
                                    isManualSaving
                                }
                                className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium whitespace-nowrap text-white shadow-xs transition-[color,box-shadow] outline-none hover:bg-emerald-600/90 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 has-[>svg]:px-3 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:w-auto dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                            >
                                {globalSaveState === 'saving' ||
                                isManualSaving ? (
                                    <>
                                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : globalSaveState === 'saved' ? (
                                    <>
                                        <Check className="mr-1 h-4 w-4 text-white" />
                                        ¡Guardado!
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-1 h-4 w-4" />
                                        Guardar
                                    </>
                                )}
                            </button>
                        </div>
                    }
                >
                    <Head
                        title={`Editor de Informe - ${specimen.sequence_code}`}
                    />
                    <style dangerouslySetInnerHTML={{ __html: editorStyles }} />

                    <div className="h-[100vh] items-start bg-slate-50/50 dark:bg-slate-900/10">
                        {/* LEFT COLUMN: Inputs and Editors */}
                        <div className="h-[calc(100vh-64px)] w-screen overflow-auto lg:w-[50vw]">
                            {/* Header bar with Back button and Status Badge */}
                            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-6">
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            router.visit('/my-assignments')
                                        }
                                        className="h-8 w-8 cursor-pointer"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <h1 className="text-xl font-bold tracking-tight">
                                                    Editor de Informe
                                                </h1>
                                                <p className="text-xs text-muted-foreground">
                                                    {specimen.type?.name || ''}
                                                    {examinationNames
                                                        ? ` • ${examinationNames}`
                                                        : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isFinished && !sessionEditingEnabled && (
                                        <EnableEditingDialog
                                            onConfirm={() => {
                                                setSessionEditingEnabled(true);
                                                toast.success(
                                                    'Edición activada para esta sesión',
                                                );
                                            }}
                                        />
                                    )}
                                    {isFinished && sessionEditingEnabled && (
                                        <div className="flex items-center gap-2">
                                            <span className="animate-pulse rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                                                Edición Activa
                                            </span>
                                            <Button
                                                onClick={
                                                    handleStartMicroscopyFinalization
                                                }
                                                disabled={isGeneratingPdf}
                                                size="sm"
                                                className="cursor-pointer gap-2 bg-fuchsia-600 font-semibold text-white shadow-sm hover:bg-fuchsia-700"
                                            >
                                                {isGeneratingPdf ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        <span>
                                                            Generando...
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check className="h-4 w-4" />
                                                        <span>
                                                            Finalizar Reporte
                                                        </span>
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] tracking-tight text-muted-foreground uppercase">
                                                Fase actual
                                            </span>
                                            <span
                                                className="rounded-full px-2.5 py-1 text-xs font-semibold tracking-wider uppercase"
                                                style={{
                                                    backgroundColor:
                                                        specimen.status ===
                                                        'macroscopic_review'
                                                            ? '#8b5cf620'
                                                            : specimen.status ===
                                                                'processing'
                                                              ? '#f59e0b20'
                                                              : specimen.status ===
                                                                  'microscopic_review'
                                                                ? '#d946ef20'
                                                                : '#10b98120',
                                                    color:
                                                        specimen.status ===
                                                        'macroscopic_review'
                                                            ? '#8b5cf6'
                                                            : specimen.status ===
                                                                'processing'
                                                              ? '#d97706'
                                                              : specimen.status ===
                                                                  'microscopic_review'
                                                                ? '#d946ef'
                                                                : '#059669',
                                                    border: `1px solid ${specimen.status === 'macroscopic_review' ? '#8b5cf630' : specimen.status === 'processing' ? '#d9770630' : specimen.status === 'microscopic_review' ? '#d946ef30' : '#05966930'}`,
                                                }}
                                            >
                                                {specimen.status ===
                                                'macroscopic_review'
                                                    ? 'Macroscopía'
                                                    : specimen.status ===
                                                        'processing'
                                                      ? 'Procesando'
                                                      : specimen.status ===
                                                          'microscopic_review'
                                                        ? 'Microscopía'
                                                        : 'Finalizado'}
                                            </span>
                                            {hasCuttingsPermission && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 cursor-pointer text-violet-600 hover:bg-violet-100 hover:text-violet-700 dark:text-violet-400 dark:hover:bg-violet-900/30"
                                                    onClick={() =>
                                                        setIsManageCuttingsOpen(
                                                            true,
                                                        )
                                                    }
                                                    title="Gestionar Cortes"
                                                >
                                                    <Scissors className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] tracking-tight text-muted-foreground uppercase">
                                                Su acceso:
                                            </span>
                                            <span
                                                className="text-[11px] font-bold tracking-wider uppercase"
                                                style={{
                                                    color: accessBadgeStyle.color,
                                                }}
                                            >
                                                {accessBadgeLabel}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Contextual Formatting Toolbar */}
                            {activeEditor &&
                                !activeEditor.isDestroyed &&
                                activeEditor.view && (
                                    <div className="sticky top-[93px] z-10 bg-background/95 transition-all duration-205">
                                        <div className="justify-strech flex items-center border-b border-border bg-muted/40 px-6">
                                            <div className="flex min-h-[36px] w-full justify-between overflow-x-auto">
                                                <EditorToolbar
                                                    editor={activeEditor}
                                                    specimenSequenceCode={
                                                        specimen.sequence_code
                                                    }
                                                    reportId={report?.id ?? 0}
                                                    field={activeField}
                                                    isSheetOpen={isAISheetOpen}
                                                    onSheetOpenChange={
                                                        updateAISheetOpen
                                                    }
                                                    onPopoverOpenChange={
                                                        updatePopoverOpen
                                                    }
                                                    isDictationSheetOpen={
                                                        isDictationSheetOpen
                                                    }
                                                    onDictationSheetOpenChange={
                                                        updateDictationSheetOpen
                                                    }
                                                />
                                            </div>

                                            {activeField &&
                                                (() => {
                                                    const getBadgeInfo = () => {
                                                        switch (activeField) {
                                                            case 'clinical_details':
                                                                return {
                                                                    label: 'Datos Clínicos',
                                                                    colorClass:
                                                                        'bg-emerald-500',
                                                                };
                                                            case 'diagnosis':
                                                                return {
                                                                    label: 'Diagnóstico',
                                                                    colorClass:
                                                                        'bg-blue-500',
                                                                };
                                                            case 'macroscopy':
                                                                return {
                                                                    label: 'Macroscopía',
                                                                    colorClass:
                                                                        'bg-violet-500',
                                                                };
                                                            case 'microscopy':
                                                                return {
                                                                    label: 'Microscopía',
                                                                    colorClass:
                                                                        'bg-fuchsia-500',
                                                                };
                                                            case 'comments_notes':
                                                                return {
                                                                    label: 'Comentarios y Notas',
                                                                    colorClass:
                                                                        'bg-amber-500',
                                                                };
                                                            case 'protocols':
                                                                return {
                                                                    label: 'Protocolos',
                                                                    colorClass:
                                                                        'bg-blue-600',
                                                                };
                                                            case 'legend':
                                                                return {
                                                                    label: 'Leyenda',
                                                                    colorClass:
                                                                        'bg-slate-500',
                                                                };
                                                            case 'open_text':
                                                                return {
                                                                    label:
                                                                        openTextLabel?.trim() ||
                                                                        'Texto Libre',
                                                                    colorClass:
                                                                        'bg-amber-600',
                                                                };
                                                            case 'addendum':
                                                                return {
                                                                    label: 'Addendum',
                                                                    colorClass:
                                                                        'bg-violet-500',
                                                                };
                                                            default:
                                                                return null;
                                                        }
                                                    };

                                                    const badge =
                                                        getBadgeInfo();

                                                    if (!badge) {
                                                        return null;
                                                    }

                                                    return (
                                                        <div className="flex h-[36px] items-center">
                                                            <div className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-semibold">
                                                                <div
                                                                    className={cn(
                                                                        'h-2 w-2 animate-pulse rounded-full',
                                                                        badge.colorClass,
                                                                    )}
                                                                />
                                                                <span className="text-center text-[8px] font-bold tracking-wider text-muted-foreground uppercase">
                                                                    {
                                                                        badge.label
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                        </div>
                                    </div>
                                )}

                            <div className="flex flex-col gap-5 p-6">
                                {/* Specimen and Customer Summary Card */}
                                <div className="relative rounded-xl border border-border/80 bg-card p-5 shadow-xs">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h3 className="text-md flex items-center gap-2 font-semibold text-primary">
                                            <UserRound className="h-4 w-4" />{' '}
                                            Resumen de Paciente y Muestra{' '}
                                            {specimen.sequence_code}
                                        </h3>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    setIsSpecimenSheetOpen(true)
                                                }
                                                className="h-7 w-7 cursor-pointer rounded-full text-muted-foreground hover:bg-primary/5 hover:text-primary"
                                                title="Ver detalles de la muestra"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {(canEditSpecimen ||
                                                canEditCustomer ||
                                                canEditReferrer ||
                                                canViewWorkOrders ||
                                                canCreateWorkOrder) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 cursor-pointer rounded-full text-muted-foreground hover:bg-primary/5 hover:text-primary"
                                                            title="Acciones"
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {canEditSpecimen && (
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    setIsEditSpecimenOpen(
                                                                        true,
                                                                    )
                                                                }
                                                                className="cursor-pointer"
                                                            >
                                                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                                                <span>
                                                                    Editar
                                                                    Muestra
                                                                </span>
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canEditCustomer && (
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    setIsEditCustomerOpen(
                                                                        true,
                                                                    )
                                                                }
                                                                className="cursor-pointer"
                                                            >
                                                                <UserRound className="mr-2 h-4 w-4" />
                                                                <span>
                                                                    Editar
                                                                    Paciente
                                                                </span>
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canEditReferrer && (
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    setIsEditReferrerOpen(
                                                                        true,
                                                                    )
                                                                }
                                                                className="cursor-pointer"
                                                            >
                                                                <UserPlus className="mr-2 h-4 w-4" />
                                                                <span>
                                                                    Editar
                                                                    Remitente
                                                                </span>
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canViewWorkOrders && (
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    setIsWorkOrdersSheetOpen(
                                                                        true,
                                                                    )
                                                                }
                                                                className="cursor-pointer"
                                                            >
                                                                <ClipboardList className="mr-2 h-4 w-4" />
                                                                <span>
                                                                    Ver Órdenes
                                                                    de Trabajo
                                                                </span>
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canCreateWorkOrder && (
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    setIsCreateWorkOrderOpen(
                                                                        true,
                                                                    )
                                                                }
                                                                className="cursor-pointer"
                                                            >
                                                                <ClipboardList className="mr-2 h-4 w-4" />
                                                                <span>
                                                                    Crear Orden
                                                                    de Trabajo
                                                                </span>
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mb-3 grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
                                        <div className="space-y-2">
                                            <p>
                                                <span className="font-medium text-muted-foreground">
                                                    Paciente:
                                                </span>{' '}
                                                <strong className="text-card-foreground">
                                                    {
                                                        specimen
                                                            .customer_relation
                                                            .name
                                                    }{' '}
                                                    (
                                                    {specimen.customer_relation
                                                        .type === 'empresa'
                                                        ? 'Empresa'
                                                        : 'Cliente'}
                                                    )
                                                </strong>
                                            </p>
                                            <p>
                                                <span className="font-medium text-muted-foreground">
                                                    Edad / Sexo:
                                                </span>{' '}
                                                <strong className="text-card-foreground">
                                                    {specimen.customer_relation
                                                        .age ?? 'N/A'}{' '}
                                                    años (
                                                    {
                                                        specimen
                                                            .customer_relation
                                                            .gender
                                                    }
                                                    )
                                                </strong>
                                            </p>
                                            <p>
                                                <span className="font-medium text-muted-foreground">
                                                    Remitente:
                                                </span>{' '}
                                                <strong className="text-card-foreground">
                                                    {
                                                        specimen
                                                            .referrer_relation
                                                            .name
                                                    }
                                                </strong>
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <p>
                                                <span className="font-medium text-muted-foreground">
                                                    Tipo:
                                                </span>{' '}
                                                <strong className="text-card-foreground">
                                                    {specimen.type?.name ||
                                                        'N/A'}
                                                    {examinationNames
                                                        ? ` - ${examinationNames}`
                                                        : ''}
                                                </strong>
                                            </p>
                                            <p>
                                                <span className="font-medium text-muted-foreground">
                                                    Diagnóstico:
                                                </span>{' '}
                                                <strong className="text-card-foreground">
                                                    {specimen.diagnosis ||
                                                        'N/A'}
                                                </strong>
                                            </p>
                                            <p>
                                                <span className="font-medium text-muted-foreground">
                                                    Sitio Anatómico:
                                                </span>{' '}
                                                <strong className="text-card-foreground">
                                                    {specimen.anatomic_site ||
                                                        'N/A'}
                                                </strong>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex w-full flex-row flex-nowrap items-center justify-stretch gap-5 pt-3">
                                        <div className="flex w-full flex-col items-start gap-1.5">
                                            <div className="flex w-full items-center justify-between gap-2">
                                                <label
                                                    htmlFor="sample-collection-date"
                                                    className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-foreground"
                                                >
                                                    <Calendar className="h-3 w-3 text-muted-foreground" />{' '}
                                                    Fecha de la toma
                                                </label>
                                                <div className="flex items-center gap-1.5">
                                                    <Switch
                                                        id="sample-collection-date-na"
                                                        checked={
                                                            sampleCollectionDateNa
                                                        }
                                                        disabled={
                                                            (isFinished &&
                                                                !sessionEditingEnabled) ||
                                                            (!hasMacroAccess &&
                                                                !hasMicroAccess)
                                                        }
                                                        onCheckedChange={
                                                            handleToggleSampleCollectionDateNa
                                                        }
                                                    />
                                                    <label
                                                        htmlFor="sample-collection-date-na"
                                                        className="cursor-pointer text-[10px] font-medium tracking-tighter text-muted-foreground select-none"
                                                    >
                                                        N/A
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="w-full">
                                                <DatePicker
                                                    value={sampleCollectionDate}
                                                    disabled={
                                                        sampleCollectionDateNa ||
                                                        (isFinished &&
                                                            !sessionEditingEnabled) ||
                                                        (!hasMacroAccess &&
                                                            !hasMicroAccess)
                                                    }
                                                    onChange={
                                                        handleUpdateSampleCollectionDate
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className="flex w-full flex-col items-start gap-1.5">
                                            <label
                                                htmlFor="report-date"
                                                className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-foreground"
                                            >
                                                <Calendar className="h-3 w-3 text-muted-foreground" />{' '}
                                                Fecha de Recepción
                                            </label>
                                            <div className="w-full">
                                                <DatePicker
                                                    value={reportDate}
                                                    disabled={
                                                        (isFinished &&
                                                            !sessionEditingEnabled) ||
                                                        (!hasMacroAccess &&
                                                            !hasMicroAccess)
                                                    }
                                                    onChange={handleUpdateDate}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex w-full flex-col items-start gap-1.5">
                                            <div className="flex w-full items-center justify-between gap-2">
                                                <label
                                                    htmlFor="finalization-date"
                                                    className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-foreground"
                                                >
                                                    <Calendar className="h-3 w-3 text-muted-foreground" />{' '}
                                                    Fecha de finalización
                                                </label>
                                                <TooltipProvider
                                                    delayDuration={200}
                                                >
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex items-center gap-1.5">
                                                                <Switch
                                                                    id="auto-finalization-date"
                                                                    checked={
                                                                        autoFinalizationDate
                                                                    }
                                                                    disabled={
                                                                        (isFinished &&
                                                                            !sessionEditingEnabled) ||
                                                                        (!hasMacroAccess &&
                                                                            !hasMicroAccess)
                                                                    }
                                                                    onCheckedChange={
                                                                        handleToggleAutoFinalizationDate
                                                                    }
                                                                />
                                                                <label
                                                                    htmlFor="auto-finalization-date"
                                                                    className="cursor-pointer text-[10px] font-medium tracking-tighter text-muted-foreground select-none"
                                                                >
                                                                    AUTO
                                                                </label>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent
                                                            side="top"
                                                            className="max-w-xs text-xs"
                                                        >
                                                            <p>
                                                                {autoFinalizationDate
                                                                    ? 'Activo: La fecha de finalización se establecerá automáticamente al día en que se finalice el reporte.'
                                                                    : 'Inactivo: Puedes seleccionar una fecha de finalización estática manual que no cambiará al finalizar el reporte.'}
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                            <div className="w-full">
                                                <DatePicker
                                                    value={finalizationDate}
                                                    disabled={
                                                        autoFinalizationDate ||
                                                        (isFinished &&
                                                            !sessionEditingEnabled) ||
                                                        (!hasMacroAccess &&
                                                            !hasMicroAccess)
                                                    }
                                                    onChange={
                                                        handleUpdateFinalizationDate
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <SpecimenInsumosCard
                                    specimen={specimen}
                                    products={products}
                                    isFinished={isFinished}
                                    sessionEditingEnabled={
                                        sessionEditingEnabled
                                    }
                                    hasMacroAccess={hasMacroAccess}
                                    hasMicroAccess={hasMicroAccess}
                                />

                                {/* Template Selector */}
                                <TemplateSelector
                                    templates={templates}
                                    isFinished={isFinished}
                                    hasMacroAccess={hasMacroAccess}
                                    hasMicroAccess={hasMicroAccess}
                                    onApplyTemplate={handleApplyTemplate}
                                />

                                <DragDropContext onDragEnd={handleDragEnd}>
                                    <Droppable droppableId="report-editors">
                                        {(provided) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className="space-y-6"
                                            >
                                                {sectionsOrder.map(
                                                    (section, index) => (
                                                        <Draggable
                                                            key={section.key}
                                                            draggableId={
                                                                section.key
                                                            }
                                                            index={index}
                                                            isDragDisabled={
                                                                !hasMacroAccess &&
                                                                !hasMicroAccess
                                                            }
                                                        >
                                                            {(
                                                                provided,
                                                                snapshot,
                                                            ) => (
                                                                <div
                                                                    ref={
                                                                        provided.innerRef
                                                                    }
                                                                    {...provided.draggableProps}
                                                                    className={cn(
                                                                        'space-y-3 rounded-xl border border-transparent transition-all duration-200',
                                                                        snapshot.isDragging &&
                                                                            'rotate-1 border-primary/20 bg-card/65 shadow-lg ring-1 ring-primary/10 backdrop-blur-xs',
                                                                    )}
                                                                >
                                                                    {section.key ===
                                                                        'clinical_details_html' && (
                                                                        <ClinicalDetailsEditor
                                                                            reportId={
                                                                                report.id
                                                                            }
                                                                            specimen={
                                                                                specimen
                                                                            }
                                                                            auth={
                                                                                auth
                                                                            }
                                                                            clinicalDetailsHtml={
                                                                                clinicalDetailsHtml
                                                                            }
                                                                            setClinicalDetailsHtml={
                                                                                setClinicalDetailsHtml
                                                                            }
                                                                            setClinicalDetailsUsers={
                                                                                setClinicalDetailsUsers
                                                                            }
                                                                            clinicalDetailsDoc={
                                                                                clinicalDetailsDoc
                                                                            }
                                                                            clinicalDetailsProvider={
                                                                                clinicalDetailsProvider
                                                                            }
                                                                            headingsToggles={
                                                                                headingsToggles
                                                                            }
                                                                            handleHeadingToggle={
                                                                                handleHeadingToggle
                                                                            }
                                                                            isAssigned={
                                                                                isAssigned
                                                                            }
                                                                            isFinished={
                                                                                isFinished
                                                                            }
                                                                            sessionEditingEnabled={
                                                                                sessionEditingEnabled
                                                                            }
                                                                            hasMacroAccess={
                                                                                hasMacroAccess
                                                                            }
                                                                            hasMicroAccess={
                                                                                hasMicroAccess
                                                                            }
                                                                            handleEditorFocus={
                                                                                handleEditorFocus
                                                                            }
                                                                            handleEditorBlur={
                                                                                handleEditorBlur
                                                                            }
                                                                            dragHandleProps={
                                                                                provided.dragHandleProps
                                                                            }
                                                                        />
                                                                    )}

                                                                    {section.key ===
                                                                        'diagnosis_html' && (
                                                                        <DiagnosisEditor
                                                                            reportId={
                                                                                report.id
                                                                            }
                                                                            specimen={
                                                                                specimen
                                                                            }
                                                                            auth={
                                                                                auth
                                                                            }
                                                                            diagnosisHtml={
                                                                                diagnosisHtml
                                                                            }
                                                                            setDiagnosisHtml={
                                                                                setDiagnosisHtml
                                                                            }
                                                                            setDiagnosisUsers={
                                                                                setDiagnosisUsers
                                                                            }
                                                                            diagnosisDoc={
                                                                                diagnosisDoc
                                                                            }
                                                                            diagnosisProvider={
                                                                                diagnosisProvider
                                                                            }
                                                                            headingsToggles={
                                                                                headingsToggles
                                                                            }
                                                                            handleHeadingToggle={
                                                                                handleHeadingToggle
                                                                            }
                                                                            isAssigned={
                                                                                isAssigned
                                                                            }
                                                                            isFinished={
                                                                                isFinished
                                                                            }
                                                                            sessionEditingEnabled={
                                                                                sessionEditingEnabled
                                                                            }
                                                                            hasMacroAccess={
                                                                                hasMacroAccess
                                                                            }
                                                                            hasMicroAccess={
                                                                                hasMicroAccess
                                                                            }
                                                                            handleEditorFocus={
                                                                                handleEditorFocus
                                                                            }
                                                                            handleEditorBlur={
                                                                                handleEditorBlur
                                                                            }
                                                                            dragHandleProps={
                                                                                provided.dragHandleProps
                                                                            }
                                                                        />
                                                                    )}

                                                                    {section.key ===
                                                                        'macroscopy_html' && (
                                                                        <MacroscopyEditor
                                                                            reportId={
                                                                                report.id
                                                                            }
                                                                            specimen={
                                                                                specimen
                                                                            }
                                                                            auth={
                                                                                auth
                                                                            }
                                                                            macroscopyHtml={
                                                                                macroscopyHtml
                                                                            }
                                                                            setMacroscopyHtml={
                                                                                setMacroscopyHtml
                                                                            }
                                                                            setMacroscopyUsers={
                                                                                setMacroscopyUsers
                                                                            }
                                                                            macroscopyDoc={
                                                                                macroscopyDoc
                                                                            }
                                                                            macroscopyProvider={
                                                                                macroscopyProvider
                                                                            }
                                                                            headingsToggles={
                                                                                headingsToggles
                                                                            }
                                                                            handleHeadingToggle={
                                                                                handleHeadingToggle
                                                                            }
                                                                            isAssigned={
                                                                                isAssigned
                                                                            }
                                                                            isFinished={
                                                                                isFinished
                                                                            }
                                                                            sessionEditingEnabled={
                                                                                sessionEditingEnabled
                                                                            }
                                                                            hasMacroAccess={
                                                                                hasMacroAccess
                                                                            }
                                                                            hasMicroAccess={
                                                                                hasMicroAccess
                                                                            }
                                                                            isMacroscopyEditable={
                                                                                isMacroscopyEditable
                                                                            }
                                                                            hasCuttingsPermission={
                                                                                hasCuttingsPermission
                                                                            }
                                                                            onManageCuttingsClick={() =>
                                                                                setIsManageCuttingsOpen(
                                                                                    true,
                                                                                )
                                                                            }
                                                                            onTransitionState={
                                                                                handleTransitionState
                                                                            }
                                                                            handleEditorFocus={
                                                                                handleEditorFocus
                                                                            }
                                                                            handleEditorBlur={
                                                                                handleEditorBlur
                                                                            }
                                                                            dragHandleProps={
                                                                                provided.dragHandleProps
                                                                            }
                                                                        />
                                                                    )}

                                                                    {section.key ===
                                                                        'microscopy_html' && (
                                                                        <MicroscopyEditor
                                                                            reportId={
                                                                                report.id
                                                                            }
                                                                            specimen={
                                                                                specimen
                                                                            }
                                                                            auth={
                                                                                auth
                                                                            }
                                                                            microscopyHtml={
                                                                                microscopyHtml
                                                                            }
                                                                            setMicroscopyHtml={
                                                                                setMicroscopyHtml
                                                                            }
                                                                            setMicroscopyUsers={
                                                                                setMicroscopyUsers
                                                                            }
                                                                            microscopyDoc={
                                                                                microscopyDoc
                                                                            }
                                                                            microscopyProvider={
                                                                                microscopyProvider
                                                                            }
                                                                            headingsToggles={
                                                                                headingsToggles
                                                                            }
                                                                            handleHeadingToggle={
                                                                                handleHeadingToggle
                                                                            }
                                                                            isAssigned={
                                                                                isAssigned
                                                                            }
                                                                            isFinished={
                                                                                isFinished
                                                                            }
                                                                            sessionEditingEnabled={
                                                                                sessionEditingEnabled
                                                                            }
                                                                            hasMacroAccess={
                                                                                hasMacroAccess
                                                                            }
                                                                            hasMicroAccess={
                                                                                hasMicroAccess
                                                                            }
                                                                            isMicroscopyEditable={
                                                                                isMicroscopyEditable
                                                                            }
                                                                            isGeneratingPdf={
                                                                                isGeneratingPdf
                                                                            }
                                                                            onTransitionState={
                                                                                handleTransitionState
                                                                            }
                                                                            onStartMicroscopyFinalization={
                                                                                handleStartMicroscopyFinalization
                                                                            }
                                                                            handleEditorFocus={
                                                                                handleEditorFocus
                                                                            }
                                                                            handleEditorBlur={
                                                                                handleEditorBlur
                                                                            }
                                                                            dragHandleProps={
                                                                                provided.dragHandleProps
                                                                            }
                                                                        />
                                                                    )}

                                                                    {section.key ===
                                                                        'comments_notes_html' && (
                                                                        <CommentsNotesEditor
                                                                            reportId={
                                                                                report.id
                                                                            }
                                                                            specimen={
                                                                                specimen
                                                                            }
                                                                            auth={
                                                                                auth
                                                                            }
                                                                            commentsNotesHtml={
                                                                                commentsNotesHtml
                                                                            }
                                                                            setCommentsNotesHtml={
                                                                                setCommentsNotesHtml
                                                                            }
                                                                            setCommentsNotesUsers={
                                                                                setCommentsNotesUsers
                                                                            }
                                                                            commentsNotesDoc={
                                                                                commentsNotesDoc
                                                                            }
                                                                            commentsNotesProvider={
                                                                                commentsNotesProvider
                                                                            }
                                                                            headingsToggles={
                                                                                headingsToggles
                                                                            }
                                                                            handleHeadingToggle={
                                                                                handleHeadingToggle
                                                                            }
                                                                            isAssigned={
                                                                                isAssigned
                                                                            }
                                                                            isFinished={
                                                                                isFinished
                                                                            }
                                                                            sessionEditingEnabled={
                                                                                sessionEditingEnabled
                                                                            }
                                                                            hasMacroAccess={
                                                                                hasMacroAccess
                                                                            }
                                                                            hasMicroAccess={
                                                                                hasMicroAccess
                                                                            }
                                                                            handleEditorFocus={
                                                                                handleEditorFocus
                                                                            }
                                                                            handleEditorBlur={
                                                                                handleEditorBlur
                                                                            }
                                                                            dragHandleProps={
                                                                                provided.dragHandleProps
                                                                            }
                                                                        />
                                                                    )}

                                                                    {section.key ===
                                                                        'protocols_html' && (
                                                                        <ProtocolsEditor
                                                                            reportId={
                                                                                report.id
                                                                            }
                                                                            specimen={
                                                                                specimen
                                                                            }
                                                                            auth={
                                                                                auth
                                                                            }
                                                                            protocolsHtml={
                                                                                protocolsHtml
                                                                            }
                                                                            setProtocolsHtml={
                                                                                setProtocolsHtml
                                                                            }
                                                                            setProtocolsUsers={
                                                                                setProtocolsUsers
                                                                            }
                                                                            protocolsDoc={
                                                                                protocolsDoc
                                                                            }
                                                                            protocolsProvider={
                                                                                protocolsProvider
                                                                            }
                                                                            headingsToggles={
                                                                                headingsToggles
                                                                            }
                                                                            handleHeadingToggle={
                                                                                handleHeadingToggle
                                                                            }
                                                                            isAssigned={
                                                                                isAssigned
                                                                            }
                                                                            isFinished={
                                                                                isFinished
                                                                            }
                                                                            sessionEditingEnabled={
                                                                                sessionEditingEnabled
                                                                            }
                                                                            hasMacroAccess={
                                                                                hasMacroAccess
                                                                            }
                                                                            hasMicroAccess={
                                                                                hasMicroAccess
                                                                            }
                                                                            handleEditorFocus={
                                                                                handleEditorFocus
                                                                            }
                                                                            handleEditorBlur={
                                                                                handleEditorBlur
                                                                            }
                                                                            dragHandleProps={
                                                                                provided.dragHandleProps
                                                                            }
                                                                        />
                                                                    )}

                                                                    {section.key ===
                                                                        'legend_html' && (
                                                                        <LegendEditor
                                                                            reportId={
                                                                                report.id
                                                                            }
                                                                            specimen={
                                                                                specimen
                                                                            }
                                                                            auth={
                                                                                auth
                                                                            }
                                                                            legendHtml={
                                                                                legendHtml
                                                                            }
                                                                            setLegendHtml={
                                                                                setLegendHtml
                                                                            }
                                                                            setLegendUsers={
                                                                                setLegendUsers
                                                                            }
                                                                            legendDoc={
                                                                                legendDoc
                                                                            }
                                                                            legendProvider={
                                                                                legendProvider
                                                                            }
                                                                            headingsToggles={
                                                                                headingsToggles
                                                                            }
                                                                            handleHeadingToggle={
                                                                                handleHeadingToggle
                                                                            }
                                                                            isAssigned={
                                                                                isAssigned
                                                                            }
                                                                            isFinished={
                                                                                isFinished
                                                                            }
                                                                            sessionEditingEnabled={
                                                                                sessionEditingEnabled
                                                                            }
                                                                            hasMacroAccess={
                                                                                hasMacroAccess
                                                                            }
                                                                            hasMicroAccess={
                                                                                hasMicroAccess
                                                                            }
                                                                            handleEditorFocus={
                                                                                handleEditorFocus
                                                                            }
                                                                            handleEditorBlur={
                                                                                handleEditorBlur
                                                                            }
                                                                            dragHandleProps={
                                                                                provided.dragHandleProps
                                                                            }
                                                                        />
                                                                    )}

                                                                    {section.key ===
                                                                        'open_text_html' && (
                                                                        <OpenTextEditor
                                                                            reportId={
                                                                                report.id
                                                                            }
                                                                            specimen={
                                                                                specimen
                                                                            }
                                                                            auth={
                                                                                auth
                                                                            }
                                                                            openTextHtml={
                                                                                openTextHtml
                                                                            }
                                                                            setOpenTextHtml={
                                                                                setOpenTextHtml
                                                                            }
                                                                            setOpenTextUsers={
                                                                                setOpenTextUsers
                                                                            }
                                                                            openTextDoc={
                                                                                openTextDoc
                                                                            }
                                                                            openTextProvider={
                                                                                openTextProvider
                                                                            }
                                                                            openTextLabel={
                                                                                openTextLabel
                                                                            }
                                                                            onOpenTextLabelChange={
                                                                                handleOpenTextLabelChange
                                                                            }
                                                                            headingsToggles={
                                                                                headingsToggles
                                                                            }
                                                                            handleHeadingToggle={
                                                                                handleHeadingToggle
                                                                            }
                                                                            isAssigned={
                                                                                isAssigned
                                                                            }
                                                                            isFinished={
                                                                                isFinished
                                                                            }
                                                                            sessionEditingEnabled={
                                                                                sessionEditingEnabled
                                                                            }
                                                                            hasMacroAccess={
                                                                                hasMacroAccess
                                                                            }
                                                                            hasMicroAccess={
                                                                                hasMicroAccess
                                                                            }
                                                                            handleEditorFocus={
                                                                                handleEditorFocus
                                                                            }
                                                                            handleEditorBlur={
                                                                                handleEditorBlur
                                                                            }
                                                                            dragHandleProps={
                                                                                provided.dragHandleProps
                                                                            }
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ),
                                                )}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>

                                <AddendumEditor
                                    reportId={report.id}
                                    specimen={specimen}
                                    auth={auth}
                                    addendumHtml={addendumHtml}
                                    setAddendumHtml={setAddendumHtml}
                                    setAddendumUsers={setAddendumUsers}
                                    addendumDoc={addendumDoc}
                                    addendumProvider={addendumProvider}
                                    headingsToggles={headingsToggles}
                                    handleHeadingToggle={handleHeadingToggle}
                                    isAssigned={isAssigned}
                                    isFinished={isFinished}
                                    sessionEditingEnabled={
                                        sessionEditingEnabled
                                    }
                                    hasMacroAccess={hasMacroAccess}
                                    hasMicroAccess={hasMicroAccess}
                                    handleEditorFocus={handleEditorFocus}
                                    handleEditorBlur={handleEditorBlur}
                                />
                            </div>
                        </div>

                        <LivePdfPreview
                            specimen={specimen}
                            isFinished={isFinished}
                            isLoading={isLoading}
                            totalPages={totalPages}
                            renderPreviewPage={renderPreviewPage}
                            pages={pages}
                            onBeforeDownload={saveReportEditorAsync}
                        />
                    </div>

                    <SpecimenViewSheet
                        key={
                            isSpecimenSheetOpen
                                ? `view_${specimen.id}_${specimen.sample_collection_date || ''}_${specimen.report?.report_date || ''}`
                                : 'closed_view'
                        }
                        specimen={specimen}
                        open={isSpecimenSheetOpen}
                        onOpenChange={setIsSpecimenSheetOpen}
                        onEditClick={() => {
                            setIsSpecimenSheetOpen(false);
                            setIsEditSpecimenOpen(true);
                        }}
                        onAssignPathologistClick={() =>
                            setIsAssignSheetOpen(true)
                        }
                    />

                    <SpecimenPathologistSheet
                        specimen={specimen}
                        open={isAssignSheetOpen}
                        onOpenChange={setIsAssignSheetOpen}
                        pathologists={pathologists}
                    />

                    <ManageCuttingsSheet
                        specimen={specimen}
                        cuttingCodes={cutting_codes}
                        cuttingPrefixes={cutting_prefixes}
                        cuttingSlideTypes={cutting_slide_types}
                        users={users}
                        open={isManageCuttingsOpen}
                        onOpenChange={setIsManageCuttingsOpen}
                        canEdit={isAssigned}
                        onInsertConcatenatedString={
                            handleInsertConcatenatedString
                        }
                    />
                    <CustomerSheet
                        customer={specimen.customer_relation as any}
                        open={isEditCustomerOpen}
                        onOpenChange={setIsEditCustomerOpen}
                        onSuccess={() => {
                            router.reload({
                                only: ['specimen'],
                                onSuccess: () => {
                                    notifyCollaborationServer();
                                },
                            });
                        }}
                    />

                    <ReferrerSheet
                        referrer={specimen.referrer_relation as any}
                        referrerTypes={referrerTypes}
                        open={isEditReferrerOpen}
                        onOpenChange={setIsEditReferrerOpen}
                        onSuccess={() => {
                            router.reload({
                                only: ['specimen'],
                                onSuccess: () => {
                                    notifyCollaborationServer();
                                },
                            });
                        }}
                    />

                    <SpecimenQuickEditSheet
                        key={
                            isEditSpecimenOpen
                                ? `edit_${specimen.id}_${specimen.sample_collection_date || ''}_${specimen.report?.report_date || ''}`
                                : 'closed_edit'
                        }
                        specimen={specimen}
                        open={isEditSpecimenOpen}
                        onOpenChange={setIsEditSpecimenOpen}
                        onSuccess={() => {
                            router.reload({
                                only: ['specimen'],
                                onSuccess: () => {
                                    notifyCollaborationServer();
                                },
                            });
                        }}
                    />

                    <MissingSignaturesDialog
                        open={showSignatureWarning}
                        onOpenChange={setShowSignatureWarning}
                        unsignedPathologists={unsignedPathologists}
                    />

                    {/* Navigation guard: prompts to save before leaving with unsaved changes */}
                    <UnsavedChangesDialog
                        open={showNavGuard}
                        isSaving={isSavingForNav}
                        onCancel={() => {
                            setShowNavGuard(false);
                            pendingNavigationRef.current = null;
                        }}
                        onLeave={() => {
                            isDirtyRef.current = false;
                            setShowNavGuard(false);
                            pendingNavigationRef.current?.();
                            pendingNavigationRef.current = null;
                        }}
                        onSaveAndLeave={async () => {
                            setIsSavingForNav(true);

                            try {
                                await saveReportEditorAsync();
                                toast.success('Reporte guardado con éxito');
                            } catch (err: any) {
                                toast.error(
                                    err.message ||
                                        'Error al guardar el reporte',
                                );
                            } finally {
                                setIsSavingForNav(false);
                                setShowNavGuard(false);
                                pendingNavigationRef.current?.();
                                pendingNavigationRef.current = null;
                            }
                        }}
                    />

                    <CompleteMicroscopyDialog
                        open={showCompleteMicroscopyDialog}
                        onOpenChange={setShowCompleteMicroscopyDialog}
                        tempPdfUrl={tempPdfUrl}
                        onConfirm={() => handleTransitionState('finalized')}
                    />

                    <SpecimenWorkOrdersSheet
                        specimen={specimen}
                        open={isWorkOrdersSheetOpen}
                        onOpenChange={setIsWorkOrdersSheetOpen}
                        workOrderTypes={
                            workOrderTypes.length
                                ? workOrderTypes
                                : cutting_slide_types
                        }
                        workOrderTasks={workOrderTasks}
                        usersList={usersList.length ? usersList : users}
                    />

                    <WorkOrderSheet
                        specimenId={specimen.id}
                        workOrderTypes={
                            workOrderTypes.length
                                ? workOrderTypes
                                : cutting_slide_types
                        }
                        workOrderTasks={workOrderTasks}
                        usersList={usersList.length ? usersList : users}
                        open={isCreateWorkOrderOpen}
                        onOpenChange={setIsCreateWorkOrderOpen}
                    />
                </EditorLayout>
            </EditorRegistryContext.Provider>
        </DebugReportProvider>
    );
}
