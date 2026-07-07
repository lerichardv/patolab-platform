import * as React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './select';

interface TimePickerProps {
    value: string; // format: "HH:MM"
    onChange: (value: string) => void;
    id?: string;
}

export function TimePicker({ value, onChange, id }: TimePickerProps) {
    // Parse 24h format "HH:MM" to 12h representation
    const parse24To12 = (time24: string) => {
        const parts = (time24 || '12:00').split(':');
        const hour24 = parseInt(parts[0] || '12', 10);
        const minute = parts[1] || '00';

        let period = 'AM';
        let hour12 = hour24;

        if (hour24 >= 12) {
            period = 'PM';
            if (hour24 > 12) {
                hour12 = hour24 - 12;
            }
        } else if (hour24 === 0) {
            hour12 = 12;
        }

        return {
            hour12: String(hour12).padStart(2, '0'),
            minute,
            period,
        };
    };

    const { hour12, minute, period } = parse24To12(value);

    // Convert 12h components back to 24h string
    const to24Hour = (h12: string, min: string, p: string) => {
        const hVal = parseInt(h12, 10);
        let h24 = hVal;

        if (p === 'PM') {
            if (hVal < 12) {
                h24 = hVal + 12;
            }
        } else {
            if (hVal === 12) {
                h24 = 0;
            }
        }

        return `${String(h24).padStart(2, '0')}:${min}`;
    };

    const setHour = (h: string) => {
        onChange(to24Hour(h, minute, period));
    };

    const setMin = (m: string) => {
        onChange(to24Hour(hour12, m, period));
    };

    const setPeriod = (p: string) => {
        onChange(to24Hour(hour12, minute, p));
    };

    // Hours 01-12
    const hours = Array.from({ length: 12 }, (_, i) =>
        String(i + 1).padStart(2, '0'),
    );
    // Minutes 00-59
    const minutes = Array.from({ length: 60 }, (_, i) =>
        String(i).padStart(2, '0'),
    );

    return (
        <div id={id} className="flex items-center gap-1.5">
            {/* Hour select */}
            <Select value={hour12} onValueChange={setHour}>
                <SelectTrigger className="w-[72px] font-mono">
                    <SelectValue placeholder="HH" />
                </SelectTrigger>
                <SelectContent className="max-h-[220px] min-w-[72px]">
                    {hours.map((h) => (
                        <SelectItem key={h} value={h}>
                            {h}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <span className="text-muted-foreground font-medium">:</span>

            {/* Minute select */}
            <Select value={minute} onValueChange={setMin}>
                <SelectTrigger className="w-[72px] font-mono">
                    <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent className="max-h-[220px] min-w-[72px]">
                    {minutes.map((m) => (
                        <SelectItem key={m} value={m}>
                            {m}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* AM/PM select */}
            <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[76px] font-semibold">
                    <SelectValue placeholder="AM/PM" />
                </SelectTrigger>
                <SelectContent className="min-w-[76px]">
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
