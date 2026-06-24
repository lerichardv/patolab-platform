import { usePage } from '@inertiajs/react';
import { format, add, startOfWeek, endOfWeek } from 'date-fns';
import { CalendarClock, ChevronDown } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

    const handleRangeChange = (newRange: DateRange) => {
        if (cookieKey && userId) {
            const fullCookieKey = `${cookieKey}_user_${userId}`;
            setCookie(fullCookieKey, JSON.stringify(newRange));
        }

        onChange(newRange);
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="h-10 w-full justify-between gap-2 border bg-card transition-colors hover:bg-accent/50 lg:justify-start"
                >
                    <span className="flex items-center gap-2 truncate">
                        <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                            {value.from && value.to
                                ? `${format(new Date(value.from + 'T00:00:00'), 'dd/MM/yyyy')} - ${format(new Date(value.to + 'T00:00:00'), 'dd/MM/yyyy')}`
                                : placeholder}
                        </span>
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
                            <Input
                                id="date-from"
                                type="date"
                                value={value.from || ''}
                                onChange={(e) =>
                                    handleRangeChange({
                                        ...value,
                                        from: e.target.value,
                                    })
                                }
                                className="h-9 w-full text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="date-to" className="text-xs">
                                Hasta
                            </Label>
                            <Input
                                id="date-to"
                                type="date"
                                value={value.to || ''}
                                onChange={(e) =>
                                    handleRangeChange({
                                        ...value,
                                        to: e.target.value,
                                    })
                                }
                                className="h-9 w-full text-sm"
                            />
                        </div>
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
                                handleRangeChange({ from, to });
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
                                handleRangeChange({ from, to });
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
                                handleRangeChange({ from, to });
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
                                handleRangeChange(range);
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
                                handleRangeChange({ from, to });
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
                                handleRangeChange({ from: '', to: '' });
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
