import axios from 'axios';
import {
    Mail,
    Send,
    Plus,
    X,
    Check,
    FileText,
    User,
    Microscope,
    Loader2,
    AlertCircle,
    Info,
    ExternalLink,
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

export interface ReportEmailData {
    specimen: {
        id: number;
        sequence_code?: string;
        status: string;
        status_color?: string;
        customer_name?: string;
        customer_email?: string;
        referrer_name?: string;
        referrer_email?: string;
        examination_name?: string;
        type_name?: string;
        requires_report?: boolean;
        has_report_file?: boolean;
        report_file_name?: string | null;
        report_file_url?: string | null;
        report_date?: string | null;
    };
    default_subject: string;
    suggested_emails: Array<{
        email: string;
        label: string;
        type: 'customer' | 'referrer';
    }>;
}

interface SendReportFormProps {
    data: ReportEmailData;
    onSuccess?: () => void;
    onCancel?: () => void;
    setIsDirty?: (dirty: boolean) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SendReportForm({
    data,
    onSuccess,
    onCancel,
    setIsDirty,
}: SendReportFormProps) {
    const { specimen, default_subject, suggested_emails } = data;

    // Initialize emails: if customer has an email, pre-populate it by default
    const initialEmails = React.useMemo(() => {
        if (
            specimen.customer_email &&
            EMAIL_REGEX.test(specimen.customer_email)
        ) {
            return [specimen.customer_email.trim().toLowerCase()];
        }

        return [];
    }, [specimen.customer_email]);

    const [emails, setEmails] = useState<string[]>(initialEmails);
    const [inputEmail, setInputEmail] = useState('');
    const [inputError, setInputError] = useState<string | null>(null);
    const [subject, setSubject] = useState(default_subject || '');
    const [customMessage, setCustomMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    const reportPdfUrl = React.useMemo(() => {
        if (!specimen.has_report_file) {
            return null;
        }

        if (specimen.report_file_url) {
            return specimen.report_file_url.replace(/^https?:\/\/[^/]+/, '');
        }

        if (specimen.report_file_name) {
            return `/storage/reports/${specimen.report_file_name}`;
        }

        return `/specimens/${specimen.sequence_code || specimen.id}/report-editor/pdf`;
    }, [
        specimen.has_report_file,
        specimen.report_file_url,
        specimen.report_file_name,
        specimen.sequence_code,
        specimen.id,
    ]);

    const handleOpenReportPdf = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (reportPdfUrl) {
            window.open(reportPdfUrl, '_blank', 'noopener,noreferrer');
        }
    };

    // Track dirty state
    useEffect(() => {
        const isDirty =
            emails.length !== initialEmails.length ||
            emails.some((e, i) => e !== initialEmails[i]) ||
            subject !== default_subject ||
            customMessage.trim().length > 0;

        setIsDirty?.(isDirty);
    }, [
        emails,
        subject,
        customMessage,
        default_subject,
        initialEmails,
        setIsDirty,
    ]);

    const addEmailToList = (rawEmail: string): boolean => {
        const clean = rawEmail.trim().toLowerCase();

        if (!clean) {
            return false;
        }

        if (!EMAIL_REGEX.test(clean)) {
            setInputError(`"${clean}" no es un correo electrónico válido.`);

            return false;
        }

        if (emails.includes(clean)) {
            setInputError(`El correo "${clean}" ya ha sido agregado.`);

            return false;
        }

        setEmails((prev) => [...prev, clean]);
        setInputError(null);

        return true;
    };

    const handleAddCurrentInput = () => {
        if (!inputEmail.trim()) {
            return;
        }

        // Support multiple comma/semicolon/space-separated emails pasted
        const parts = inputEmail
            .split(/[,;\s]+/)
            .map((p) => p.trim())
            .filter(Boolean);

        if (parts.length > 1) {
            const errors: string[] = [];

            parts.forEach((p) => {
                if (!EMAIL_REGEX.test(p)) {
                    errors.push(p);
                } else if (!emails.includes(p.toLowerCase())) {
                    setEmails((prev) => [...prev, p.toLowerCase()]);
                }
            });

            if (errors.length > 0) {
                setInputError(
                    `Correos inválidos ignorados: ${errors.join(', ')}`,
                );
            } else {
                setInputError(null);
            }

            setInputEmail('');
        } else {
            if (addEmailToList(inputEmail)) {
                setInputEmail('');
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddCurrentInput();
        } else if (
            e.key === ',' ||
            e.key === ';' ||
            (e.key === ' ' && inputEmail.trim())
        ) {
            e.preventDefault();
            handleAddCurrentInput();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData.getData('text');

        if (
            pasted &&
            (pasted.includes(',') ||
                pasted.includes(';') ||
                pasted.includes(' ') ||
                pasted.includes('\n'))
        ) {
            e.preventDefault();
            const parts = pasted
                .split(/[,;\s\n]+/)
                .map((p) => p.trim().toLowerCase())
                .filter(Boolean);

            const newEmails: string[] = [];
            const invalidEmails: string[] = [];

            parts.forEach((email) => {
                if (EMAIL_REGEX.test(email)) {
                    if (!emails.includes(email) && !newEmails.includes(email)) {
                        newEmails.push(email);
                    }
                } else {
                    invalidEmails.push(email);
                }
            });

            if (newEmails.length > 0) {
                setEmails((prev) => [...prev, ...newEmails]);
            }

            if (invalidEmails.length > 0) {
                setInputError(
                    `Algunos correos no son válidos: ${invalidEmails.slice(0, 3).join(', ')}`,
                );
            } else {
                setInputError(null);
            }
        }
    };

    const removeEmail = (indexToRemove: number) => {
        setEmails((prev) => prev.filter((_, i) => i !== indexToRemove));
    };

    const toggleSuggestedEmail = (email: string) => {
        const clean = email.trim().toLowerCase();

        if (emails.includes(clean)) {
            setEmails((prev) => prev.filter((e) => e !== clean));
        } else {
            addEmailToList(clean);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // If user typed an email in the input but forgot to hit Enter/Add, try to add it
        const currentEmails = [...emails];

        if (inputEmail.trim()) {
            const clean = inputEmail.trim().toLowerCase();

            if (EMAIL_REGEX.test(clean) && !currentEmails.includes(clean)) {
                currentEmails.push(clean);
                setEmails(currentEmails);
                setInputEmail('');
                setInputError(null);
            } else if (!EMAIL_REGEX.test(clean)) {
                setInputError(`"${clean}" no es un correo electrónico válido.`);

                return;
            }
        }

        if (currentEmails.length === 0) {
            setInputError(
                'Debe ingresar al menos un correo electrónico destinatario.',
            );
            inputRef.current?.focus();

            return;
        }

        setIsSubmitting(true);

        try {
            const response = await axios.post(
                `/specimens/${specimen.id}/send-report`,
                {
                    emails: currentEmails,
                    subject: subject.trim() || undefined,
                    custom_message: customMessage.trim() || undefined,
                },
            );

            if (response.status === 207) {
                toast.warning(
                    response.data.message ||
                        'El reporte se envió con advertencias.',
                );
            } else {
                toast.success(
                    response.data.message || 'Reporte enviado exitosamente.',
                );
            }

            setIsDirty?.(false);
            onSuccess?.();
        } catch (err: any) {
            console.error('Error sending report email:', err);
            const errorMessage =
                err.response?.data?.message ||
                err.response?.data?.errors?.emails?.[0] ||
                err.message ||
                'Error al enviar el reporte por correo.';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-6 px-5 pr-2 pb-8"
        >
            {/* Specimen Summary Card */}
            <div className="space-y-4 rounded-lg border border-border/80 bg-muted/30 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        <FileText className="h-4 w-4 text-primary" />
                        <span>Información de la Muestra</span>
                    </h3>
                    <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold text-white"
                        style={{
                            backgroundColor: specimen.status_color || '#10b981',
                        }}
                    >
                        {specimen.status === 'finalized'
                            ? 'Finalizada'
                            : specimen.status === 'delivered'
                              ? 'Entregada'
                              : specimen.status}
                    </Badge>
                </div>
                <Separator className="opacity-60" />

                <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    {/* Sequence Code */}
                    <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">
                            Código de Muestra:
                        </span>
                        <div className="font-mono text-sm font-bold text-primary">
                            {specimen.sequence_code || `#${specimen.id}`}
                        </div>
                    </div>

                    {/* Patient */}
                    <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">
                            Paciente:
                        </span>
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>
                                {specimen.customer_name || 'No especificado'}
                            </span>
                        </div>
                    </div>

                    {/* Examination / Specimen Type */}
                    <div className="space-y-1 sm:col-span-2">
                        <span className="text-xs font-medium text-muted-foreground">
                            Examen / Estudio:
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-foreground">
                            <Microscope className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">
                                {specimen.examination_name ||
                                    specimen.type_name ||
                                    'Estudio Patológico'}
                            </span>
                            {specimen.type_name &&
                                specimen.examination_name && (
                                    <span className="text-muted-foreground">
                                        ({specimen.type_name})
                                    </span>
                                )}
                        </div>
                    </div>

                    {/* PDF Attachment status */}
                    <div className="sm:col-span-2">
                        <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
                            <div className="flex min-w-0 items-center gap-2">
                                <FileText className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <div className="truncate">
                                    <span className="font-semibold">
                                        Documento Oficial PDF:{' '}
                                    </span>
                                    <span>
                                        {specimen.has_report_file
                                            ? `Reporte_${specimen.sequence_code || specimen.id}.pdf listo para enviar`
                                            : 'Se generará y adjuntará automáticamente el PDF oficial'}
                                    </span>
                                </div>
                            </div>
                            {specimen.has_report_file && reportPdfUrl && (
                                <a
                                    href={reportPdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={handleOpenReportPdf}
                                    className="relative z-10 inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-emerald-600/30 bg-emerald-600/15 px-2.5 py-1 text-[11px] font-medium text-emerald-800 transition-all hover:bg-emerald-600/25 active:scale-95 dark:text-emerald-200"
                                    title="Ver reporte en una nueva pestaña"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span>Ver reporte</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Email Recipients Section */}
            <div className="space-y-3.5 rounded-lg border border-border/80 bg-muted/20 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-foreground uppercase">
                        <Mail className="h-4 w-4 text-primary" />
                        <span>Destinatarios del Correo *</span>
                    </Label>
                    <span className="text-xs text-muted-foreground">
                        {emails.length}{' '}
                        {emails.length === 1 ? 'correo' : 'correos'} agregados
                    </span>
                </div>

                {/* Suggested Emails Pills */}
                {suggested_emails && suggested_emails.length > 0 && (
                    <div className="space-y-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground">
                            Sugerencias de contacto:
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                            {suggested_emails.map((sug) => {
                                const isAdded = emails.includes(
                                    sug.email.trim().toLowerCase(),
                                );

                                return (
                                    <button
                                        key={sug.email}
                                        type="button"
                                        onClick={() =>
                                            toggleSuggestedEmail(sug.email)
                                        }
                                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all ${
                                            isAdded
                                                ? 'border-primary/40 bg-primary/10 font-medium text-primary'
                                                : 'border-border/80 bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/50 hover:text-foreground'
                                        }`}
                                        title={
                                            isAdded
                                                ? 'Haga clic para remover'
                                                : 'Haga clic para agregar'
                                        }
                                    >
                                        {isAdded ? (
                                            <Check className="h-3 w-3 text-primary" />
                                        ) : (
                                            <Plus className="h-3 w-3 text-muted-foreground" />
                                        )}
                                        <span className="font-semibold text-foreground/80">
                                            {sug.label}:
                                        </span>
                                        <span className="font-mono text-[11px]">
                                            {sug.email}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Email Tags Display Area */}
                <div className="min-h-[52px] rounded-lg border border-input bg-background/80 p-2.5 shadow-sm">
                    {emails.length === 0 ? (
                        <div className="flex h-10 items-center justify-center text-xs text-muted-foreground italic">
                            No hay destinatarios agregados aún. Escriba un
                            correo abajo o seleccione una sugerencia.
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {emails.map((email, idx) => {
                                const isCustomer =
                                    specimen.customer_email
                                        ?.trim()
                                        .toLowerCase() === email;
                                const isReferrer =
                                    specimen.referrer_email
                                        ?.trim()
                                        .toLowerCase() === email;

                                return (
                                    <Badge
                                        key={email}
                                        variant="secondary"
                                        className="inline-flex items-center gap-1.5 py-1 pr-1.5 pl-2.5 text-xs font-normal"
                                    >
                                        <Mail className="h-3 w-3 text-muted-foreground" />
                                        <span className="font-mono text-[11px]">
                                            {email}
                                        </span>
                                        {isCustomer && (
                                            <span className="py-0.2 rounded bg-sky-500/10 px-1 text-[9px] font-semibold text-sky-600 dark:text-sky-400">
                                                Paciente
                                            </span>
                                        )}
                                        {isReferrer && (
                                            <span className="py-0.2 rounded bg-purple-500/10 px-1 text-[9px] font-semibold text-purple-600 dark:text-purple-400">
                                                Médico
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeEmail(idx)}
                                            className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none"
                                            title="Eliminar correo"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Add Email Input Row */}
                <div className="space-y-1.5">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                ref={inputRef}
                                type="email"
                                value={inputEmail}
                                onChange={(e) => {
                                    setInputEmail(e.target.value);

                                    if (inputError) {
                                        setInputError(null);
                                    }
                                }}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                placeholder="Escriba un correo y presione Enter o coma..."
                                className="pr-8 text-xs"
                            />
                            {inputEmail && (
                                <button
                                    type="button"
                                    onClick={() => setInputEmail('')}
                                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleAddCurrentInput}
                            disabled={!inputEmail.trim()}
                            className="cursor-pointer text-xs"
                        >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Agregar
                        </Button>
                    </div>

                    {inputError ? (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-destructive">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>{inputError}</span>
                        </div>
                    ) : (
                        <p className="text-[11px] text-muted-foreground">
                            Puede ingresar múltiples correos separándolos con
                            comas, punto y coma o pegando una lista.
                        </p>
                    )}
                </div>
            </div>

            {/* Subject Input */}
            <div className="space-y-2">
                <Label
                    htmlFor="report-email-subject"
                    className="text-xs font-semibold text-foreground"
                >
                    Asunto del Correo
                </Label>
                <Input
                    id="report-email-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Asunto del correo electrónico"
                    className="text-xs"
                    required
                />
            </div>

            {/* Custom Message / Notes Textarea */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label
                        htmlFor="report-email-message"
                        className="text-xs font-semibold text-foreground"
                    >
                        Mensaje Adicional{' '}
                        <span className="font-normal text-muted-foreground">
                            (Opcional)
                        </span>
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                        Se incluirá en el cuerpo del correo
                    </span>
                </div>
                <Textarea
                    id="report-email-message"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Estimado(a), adjuntamos los resultados oficiales correspondientes al estudio..."
                    rows={4}
                    className="resize-y text-xs"
                    maxLength={2000}
                />
            </div>

            {/* Info notice about online portal */}
            <div className="flex items-start gap-2.5 rounded-lg border border-blue-500/20 bg-blue-50/50 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <div className="space-y-1">
                    <p className="font-medium">
                        Portal Digital de Verificación
                    </p>
                    <p className="text-[11px] leading-relaxed text-blue-800/80 dark:text-blue-300/80">
                        El correo incluirá automáticamente un botón de acceso
                        seguro al portal web de PatoLab, donde los destinatarios
                        podrán visualizar el estado del reporte y validar su
                        autenticidad.
                    </p>
                </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-border/80 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="cursor-pointer text-xs"
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={emails.length === 0 || isSubmitting}
                    className="cursor-pointer bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span>Enviando Reporte...</span>
                        </>
                    ) : (
                        <>
                            <Send className="mr-2 h-4 w-4" />
                            <span>Enviar Reporte ({emails.length})</span>
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
