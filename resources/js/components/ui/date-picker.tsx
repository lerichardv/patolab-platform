import * as React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerProps {
    value?: string; // yyyy-MM-dd
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
    popoverClassName?: string;
    modal?: boolean;
}

export function DatePicker({
    value,
    onChange,
    disabled = false,
    placeholder = 'Seleccione fecha...',
    className,
    popoverClassName,
    modal = true,
}: DatePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    
    // Parse the value (yyyy-MM-dd) to a Date object, or default to today
    const selectedDate = value ? new Date(value + 'T00:00:00') : undefined;
    const [currentMonth, setCurrentMonth] = React.useState(selectedDate || new Date());

    // Keep currentMonth in sync if value changes externally
    React.useEffect(() => {
        if (selectedDate) {
            setCurrentMonth(selectedDate);
        }
    }, [value]);

    const handleSelect = (date: Date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        onChange(`${yyyy}-${mm}-${dd}`);
        setIsOpen(false);
    };

    const nextMonth = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentMonth(addMonths(currentMonth, 1));
    };

    const prevMonth = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    // Calendar grid calculations
    const startOfCurrentMonth = startOfMonth(currentMonth);
    const endOfCurrentMonth = endOfMonth(currentMonth);
    
    const daysInMonth = eachDayOfInterval({
        start: startOfCurrentMonth,
        end: endOfCurrentMonth,
    });

    // getDay returns 0 for Sunday, 1 for Monday, etc.
    // Let's adjust to make Monday start of week: 0 for Mon, 1 for Tue... 6 for Sun
    const rawStartDay = getDay(startOfCurrentMonth);
    const startDayOffset = rawStartDay === 0 ? 6 : rawStartDay - 1;

    const days = Array.from({ length: startDayOffset }).concat(daysInMonth) as (Date | null)[];

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen} modal={modal}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        'w-full justify-start text-left font-normal h-10 px-3 text-sm border-input bg-card shadow-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-60',
                        !value && 'text-muted-foreground',
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>
                        {selectedDate
                            ? format(selectedDate, 'dd/MM/yyyy')
                            : placeholder}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className={cn("w-auto p-0 z-[120] bg-card border rounded-md shadow-md", popoverClassName)} align="start">
                <div className="p-3 w-[280px]">
                    <div className="flex items-center justify-between mb-2">
                        <Button
                            variant="outline"
                            size="icon"
                            type="button"
                            className="h-7 w-7 p-0"
                            onClick={prevMonth}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-semibold capitalize">
                            {format(currentMonth, 'MMMM yyyy', { locale: es })}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            type="button"
                            className="h-7 w-7 p-0"
                            onClick={nextMonth}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-1">
                        <span>Lu</span>
                        <span>Ma</span>
                        <span>Mi</span>
                        <span>Ju</span>
                        <span>Vi</span>
                        <span>Sá</span>
                        <span>Do</span>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, index) => {
                            if (!day) {
                                return <div key={`empty-${index}`} />;
                            }
                            
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isTodayDate = isSameDay(day, new Date());
                            
                            return (
                                <button
                                    key={day.toISOString()}
                                    type="button"
                                    onClick={() => handleSelect(day)}
                                    className={cn(
                                        'h-8 w-8 rounded-md text-xs transition-colors hover:bg-accent hover:text-accent-foreground flex items-center justify-center cursor-pointer',
                                        isSelected && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-semibold',
                                        isTodayDate && !isSelected && 'border border-primary text-primary font-medium'
                                    )}
                                >
                                    {day.getDate()}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-3 pt-2 border-t flex justify-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            className="w-full text-xs font-semibold text-primary hover:text-primary hover:bg-primary/5 cursor-pointer h-7"
                            onClick={() => handleSelect(new Date())}
                        >
                            Hoy
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
