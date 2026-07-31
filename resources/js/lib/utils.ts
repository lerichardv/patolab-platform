import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

export function addWithoutWeekends(
    startDate: Date | string,
    quantity: number,
    unit: string,
): Date {
    const date = new Date(
        typeof startDate === 'string' ? startDate : startDate.getTime(),
    );

    if (unit === 'days') {
        let addedDays = 0;

        while (addedDays < quantity) {
            date.setDate(date.getDate() + 1);
            const day = date.getDay();

            if (day !== 0 && day !== 6) {
                addedDays++;
            }
        }

        return date;
    }

    if (unit === 'weeks') {
        let addedDays = 0;
        const targetDays = quantity * 5;

        while (addedDays < targetDays) {
            date.setDate(date.getDate() + 1);
            const day = date.getDay();

            if (day !== 0 && day !== 6) {
                addedDays++;
            }
        }

        return date;
    }

    if (unit === 'hours') {
        let addedHours = 0;

        while (addedHours < quantity) {
            date.setHours(date.getHours() + 1);
            const day = date.getDay();

            if (day !== 0 && day !== 6) {
                addedHours++;
            }
        }

        return date;
    }

    if (unit === 'minutes') {
        let addedMinutes = 0;

        while (addedMinutes < quantity) {
            date.setMinutes(date.getMinutes() + 1);
            const day = date.getDay();

            if (day !== 0 && day !== 6) {
                addedMinutes++;
            }
        }

        return date;
    }

    return date;
}
