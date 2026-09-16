import { format, formatDistanceToNow, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { addWithoutWeekends } from '@/lib/utils';

export const UNIT_LABELS: Record<string, string> = {
    minutes: 'Minutos',
    hours: 'Horas',
    days: 'Días',
    weeks: 'Semanas',
};

export interface DeliveryDuration {
    quantity: number;
    unit: string;
    isManual: boolean;
}

export interface DueDateInfo {
    timeDefined: string;
    dueDateFormatted: string;
    fullDueDate: string;
    colorClass: string;
    isExpired: boolean;
    dueDate: Date;
    isManual?: boolean;
}

/**
 * Adds delivery duration to a date excluding weekends (business days).
 */
export function addDeliveryDuration(
    startDate: Date | string,
    quantity: number,
    unit: string,
): Date {
    return addWithoutWeekends(startDate, quantity, unit);
}

/**
 * Returns the resolved internal delivery duration for a specimen,
 * preferring manual override over specimen category.
 */
export function getInternalDeliveryDuration(specimen: any): DeliveryDuration | null {
    if (!specimen) {
        return null;
    }

    if (specimen.is_manual_delivery_date_intern_enabled) {
        const qty = Number(specimen.delivery_date_intern_quantity ?? 0);
        const unit = specimen.delivery_date_intern_unit || 'minutes';

        if (qty > 0 && unit) {
            return { quantity: qty, unit, isManual: true };
        }
    }

    if (specimen.category?.intern_quantity && specimen.category?.intern_unit) {
        return {
            quantity: Number(specimen.category.intern_quantity),
            unit: specimen.category.intern_unit,
            isManual: false,
        };
    }

    return null;
}

/**
 * Returns the resolved client delivery duration for a specimen,
 * preferring manual override over specimen category.
 */
export function getClientDeliveryDuration(specimen: any): DeliveryDuration | null {
    if (!specimen) {
        return null;
    }

    if (specimen.is_manual_delivery_date_enabled) {
        const qty = Number(specimen.delivery_date_quantity ?? 0);
        const unit = specimen.delivery_date_unit || 'minutes';

        if (qty > 0 && unit) {
            return { quantity: qty, unit, isManual: true };
        }
    }

    if (specimen.category?.quantity && specimen.category?.unit) {
        return {
            quantity: Number(specimen.category.quantity),
            unit: specimen.category.unit,
            isManual: false,
        };
    }

    return null;
}

/**
 * Calculates the internal estimated finalization date for a specimen.
 */
export function getEstimatedDate(specimen: any): Date | null {
    if (!specimen || !specimen.created_at) {
        return null;
    }

    const duration = getInternalDeliveryDuration(specimen);

    if (!duration) {
        return null;
    }

    const createdAt = new Date(specimen.created_at);

    return addDeliveryDuration(createdAt, duration.quantity, duration.unit);
}

/**
 * Calculates the customer-facing estimated delivery date for a specimen.
 */
export function getClientEstimatedDate(specimen: any): Date | null {
    if (!specimen || !specimen.created_at) {
        return null;
    }

    const duration = getClientDeliveryDuration(specimen);

    if (!duration) {
        return null;
    }

    const createdAt = new Date(specimen.created_at);

    return addDeliveryDuration(createdAt, duration.quantity, duration.unit);
}

/**
 * Formats a duration unit to Spanish text.
 */
export function formatUnitSpanish(unit: string): string {
    switch (unit) {
        case 'minutes':
            return 'minutos';
        case 'hours':
            return 'horas';
        case 'days':
            return 'días';
        case 'weeks':
            return 'semanas';
        default:
            return unit;
    }
}

/**
 * Formats badge duration text (e.g. "Int: 24 horas" or "Cli: 3 días (Personalizado)").
 * Supports both (prefix, duration) and (duration, prefix) orderings.
 */
export function formatDurationText(
    prefixOrDuration: 'Int' | 'Cli' | DeliveryDuration | null,
    durationOrPrefix?: DeliveryDuration | 'Int' | 'Cli' | null,
): string | null {
    let prefix: 'Int' | 'Cli';
    let duration: DeliveryDuration | null;

    if (typeof prefixOrDuration === 'string') {
        prefix = prefixOrDuration as 'Int' | 'Cli';
        duration = (durationOrPrefix as DeliveryDuration | null) ?? null;
    } else {
        duration = prefixOrDuration;
        prefix = (durationOrPrefix as 'Int' | 'Cli') ?? 'Int';
    }

    if (!duration || !duration.quantity || !duration.unit) {
        return null;
    }

    const unitStr = formatUnitSpanish(duration.unit);
    const manualTag = duration.isManual ? ' (Personalizado)' : '';

    return `${prefix}: ${duration.quantity} ${unitStr}${manualTag}`;
}

/**
 * Returns the effective due date for a specimen (prioritizes internal over client delivery).
 */
export function getSpecimenDueDate(specimen: any): Date {
    const createdAt = new Date(specimen?.created_at || Date.now());

    const internalDuration = getInternalDeliveryDuration(specimen);

    if (internalDuration) {
        return addDeliveryDuration(createdAt, internalDuration.quantity, internalDuration.unit);
    }

    const clientDuration = getClientDeliveryDuration(specimen);

    if (clientDuration) {
        return addDeliveryDuration(createdAt, clientDuration.quantity, clientDuration.unit);
    }

    return createdAt;
}

/**
 * Returns formatted due date information, status colors, and countdown text
 * for Kanban cards and table listings.
 */
export function getSpecimenDueDateInfo(specimen: any): DueDateInfo | null {
    if (!specimen) {
        return null;
    }

    const duration =
        getInternalDeliveryDuration(specimen) ||
        getClientDeliveryDuration(specimen);

    if (!duration) {
        return null;
    }

    const createdAt = new Date(specimen.created_at || Date.now());
    const dueDate = addDeliveryDuration(
        createdAt,
        duration.quantity,
        duration.unit,
    );

    const isCompleted = ['finalized', 'delivered', 'cancelled'].includes(
        specimen.status,
    );

    const timeDefined = `${duration.quantity} ${formatUnitSpanish(duration.unit)}${duration.isManual ? ' (Personalizado)' : ''}`;

    const dueDateFormatted = formatDistanceToNow(dueDate, {
        addSuffix: true,
        locale: es,
    });
    const fullDueDate = format(dueDate, 'dd/MM/yyyy HH:mm');

    const isExpired = isPast(dueDate);
    const isWithinOneDay =
        !isExpired && dueDate.getTime() - Date.now() <= 24 * 60 * 60 * 1000;

    let colorClass =
        'bg-secondary text-secondary-foreground border-transparent';

    if (!isCompleted) {
        if (isExpired) {
            colorClass =
                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50';
        } else if (isWithinOneDay) {
            colorClass =
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50';
        } else {
            colorClass =
                'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50';
        }
    }

    return {
        timeDefined,
        dueDateFormatted,
        fullDueDate,
        colorClass,
        isExpired,
        dueDate,
        isManual: duration.isManual,
    };
}
