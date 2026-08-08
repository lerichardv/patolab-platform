import { usePage } from '@inertiajs/react';
import { format, add, startOfWeek, endOfWeek } from 'date-fns';
import { CalendarClock, ChevronDown } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

export interface DateRange {
    from: string;
    to: string;
}

interface DateRangePickerProps {
    value: DateRange;
    onChange: (value: DateRange) => void;
    placeholder?: string;
    align?: 'start' | 'center' | 'end';
    cookieKey?: string;
}

export function getCookie(name: string): string | null {
    if (typeof document === 'undefined') {
        return null;
    }

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);

    if (parts.length === 2) {
        return decodeURIComponent(parts.pop()?.split(';').shift() || '');
    }

    return null;
}

export function setCookie(name: string, value: string, days = 365) {
    if (typeof document === 'undefined') {
        return;
    }

    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `; expires=${date.toUTCString()}`;
    document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
}

export function determineRange(from: string, to: string): string {
    if (!from && !to) {
        return 'all';
    }

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const resolvedTo = to === 'today' ? todayStr : to;
    const resolvedFrom = from === 'today' ? todayStr : from;

    const startOfWeekVal = format(
        startOfWeek(today, { weekStartsOn: 1 }),
        'yyyy-MM-dd',
    );
    const endOfWeekVal = format(
        endOfWeek(today, { weekStartsOn: 1 }),
        'yyyy-MM-dd',
    );

    const sevenDaysAgo = format(add(today, { days: -7 }), 'yyyy-MM-dd');
    const fourteenDaysAgo = format(add(today, { days: -14 }), 'yyyy-MM-dd');
    const thirtyDaysAgo = format(add(today, { days: -30 }), 'yyyy-MM-dd');

    if (resolvedFrom === todayStr && resolvedTo === todayStr) {
        return 'today';
    }

    if (resolvedFrom === startOfWeekVal && resolvedTo === endOfWeekVal) {
        return 'this_week';
    }

    if (resolvedFrom === sevenDaysAgo && resolvedTo === todayStr) {
        return '7_days';
    }

    if (resolvedFrom === fourteenDaysAgo && resolvedTo === todayStr) {
        return '14_days';
    }

    if (resolvedFrom === thirtyDaysAgo && resolvedTo === todayStr) {
        return '30_days';
    }

    return 'custom';
}

export function getLast2WeeksRange(): DateRange {
    const today = new Date();
    const from = format(add(today, { days: -14 }), 'yyyy-MM-dd');
    const to = format(today, 'yyyy-MM-dd');

    return { from, to };
}

export function DateRangePicker({
    value,
    onChange,
    placeholder = 'Cualquier fecha',
    align = 'end',
    cookieKey,
}: DateRangePickerProps) {
    const { props } = usePage() as any;
    const userId = props.auth?.user?.id;

    const [open, setOpen] = React.useState(false);
    const [localFrom, setLocalFrom] = React.useState(value.from || '');
    const [localTo, setLocalTo] = React.useState(value.to || '');

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);

        if (isOpen) {
            setLocalFrom(value.from || '');
            setLocalTo(value.to || '');
        }
    };

    const handleRangeChange = (newRange: DateRange, rangeName?: string) => {
        if (cookieKey && userId) {
            const fullCookieKey = cookieKey.includes('_user_')
                ? cookieKey
                : `${cookieKey}_user_${userId}`;
            const resolvedRange =
                rangeName || determineRange(newRange.from, newRange.to);
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const isToToday =
                newRange.to === todayStr || newRange.to === 'today';
            const cookieTo = isToToday ? 'today' : newRange.to;

            setCookie(
                fullCookieKey,
                JSON.stringify({
                    range: resolvedRange,
                    from: newRange.from,
                    to: cookieTo,
                }),
            );
        }

        onChange(newRange);
        setOpen(false);
    };

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const isFromToday = value.from === todayStr;
    const isToToday = value.to === todayStr || value.to === 'today';

    let displayText = placeholder;

    if (value.from && value.to) {
        if (isFromToday && isToToday) {
            displayText = 'Hoy';
        } else {
            const displayFrom = format(
                new Date(value.from + 'T00:00:00'),
                'dd/MM/yyyy',
            );
            const displayTo = isToToday
                ? 'Hoy'
                : format(new Date(value.to + 'T00:00:00'), 'dd/MM/yyyy');
            displayText = `${displayFrom} - ${displayTo}`;
        }
    }

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50 lg:justify-start"
                >
                    <span className="flex items-center gap-2 truncate">
                        <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{displayText}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align={align}>
                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-medium">Rango de fechas</h4>
                        <p className="text-xs text-muted-foreground">
                            Filtrar registros creados entre estas fechas.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label htmlFor="date-from" className="text-xs">
                                Desde
                            </Label>
                            <DatePicker
                                value={localFrom}
                                onChange={(val) => setLocalFrom(val)}
                                className="h-9 w-full text-sm"
                                placeholder="Desde..."
                                modal={false}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="date-to" className="text-xs">
                                Hasta
                            </Label>
                            <DatePicker
                                value={localTo}
                                onChange={(val) => setLocalTo(val)}
                                className="h-9 w-full text-sm"
                                placeholder="Hasta..."
                                modal={false}
                            />
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            className="col-span-2 mt-1 h-9 w-full text-sm font-medium"
                            disabled={
                                localFrom === (value.from || '') &&
                                localTo === (value.to || '')
                            }
                            onClick={() => {
                                handleRangeChange({
                                    from: localFrom,
                                    to: localTo,
                                });
                            }}
                        >
                            Aplicar
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 border-t pt-2 text-xs">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-normal"
                            onClick={() => {
                                const today = new Date();
                                const from = format(today, 'yyyy-MM-dd');
                                const to = format(today, 'yyyy-MM-dd');
                                handleRangeChange({ from, to }, 'today');
                            }}
                        >
                            Hoy
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-normal"
                            onClick={() => {
                                const today = new Date();
                                const from = format(
                                    startOfWeek(today, { weekStartsOn: 1 }),
                                    'yyyy-MM-dd',
                                );
                                const to = format(
                                    endOfWeek(today, { weekStartsOn: 1 }),
                                    'yyyy-MM-dd',
                                );
                                handleRangeChange({ from, to }, 'this_week');
                            }}
                        >
                            Esta semana
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-normal"
                            onClick={() => {
                                const today = new Date();
                                const from = format(
                                    add(today, { days: -7 }),
                                    'yyyy-MM-dd',
                                );
                                const to = format(today, 'yyyy-MM-dd');
                                handleRangeChange({ from, to }, '7_days');
                            }}
                        >
                            Últimos 7 días
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-normal"
                            onClick={() => {
                                const range = getLast2WeeksRange();
                                handleRangeChange(range, '14_days');
                            }}
                        >
                            Últimas 2 semanas
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="col-span-2 h-7 text-xs font-normal"
                            onClick={() => {
                                const today = new Date();
                                const from = format(
                                    add(today, { days: -30 }),
                                    'yyyy-MM-dd',
                                );
                                const to = format(today, 'yyyy-MM-dd');
                                handleRangeChange({ from, to }, '30_days');
                            }}
                        >
                            Últimos 30 días
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="col-span-2 h-7 text-xs font-normal text-muted-foreground hover:text-foreground"
                            onClick={() => {
                                handleRangeChange({ from: '', to: '' }, 'all');
                            }}
                        >
                            Limpiar filtros de fecha
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
