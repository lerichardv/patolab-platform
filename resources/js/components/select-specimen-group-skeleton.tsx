import { Skeleton } from '@/components/ui/skeleton';

interface Props {
    count?: number;
}

const DEFAULT_ITEMS = [
    {
        titleWidth: 'w-48 sm:w-60',
        invoiceWidth: 'w-24',
        patientWidth: 'w-44 sm:w-56',
        badges: ['w-24', 'w-28', 'w-20'],
    },
    {
        titleWidth: 'w-40 sm:w-52',
        invoiceWidth: 'w-20',
        patientWidth: 'w-36 sm:w-48',
        badges: ['w-28', 'w-24'],
    },
    {
        titleWidth: 'w-56 sm:w-72',
        invoiceWidth: 'w-24',
        patientWidth: 'w-48 sm:w-60',
        badges: ['w-20', 'w-28', 'w-24'],
    },
    {
        titleWidth: 'w-44 sm:w-56',
        invoiceWidth: 'w-20',
        patientWidth: 'w-40 sm:w-52',
        badges: ['w-24'],
    },
    {
        titleWidth: 'w-52 sm:w-64',
        invoiceWidth: 'w-24',
        patientWidth: 'w-44 sm:w-56',
        badges: ['w-28', 'w-20'],
    },
    {
        titleWidth: 'w-36 sm:w-48',
        invoiceWidth: 'w-20',
        patientWidth: 'w-32 sm:w-44',
        badges: ['w-24', 'w-24'],
    },
];

export default function SelectSpecimenGroupSkeleton({ count = 6 }: Props) {
    const items = DEFAULT_ITEMS.slice(0, count);

    return (
        <div
            className="animate-pulse divide-y divide-border"
            data-testid="select-specimen-group-skeleton"
        >
            {items.map((item, index) => (
                <div
                    key={index}
                    className="flex w-full items-start gap-4 p-3 text-left"
                >
                    {/* Radio indicator placeholder */}
                    <div className="mt-1 flex shrink-0 items-center justify-center">
                        <Skeleton className="h-4 w-4 rounded-full" />
                    </div>

                    {/* Group content placeholders */}
                    <div className="flex flex-1 flex-col gap-1.5">
                        <div className="flex items-start justify-between gap-2">
                            <Skeleton className={`h-4 ${item.titleWidth}`} />
                            <Skeleton
                                className={`h-4 ${item.invoiceWidth} rounded`}
                            />
                        </div>
                        <Skeleton className={`h-3 ${item.patientWidth}`} />

                        <div className="mt-1 flex flex-wrap gap-1">
                            {item.badges.map((badgeWidth, bIdx) => (
                                <Skeleton
                                    key={bIdx}
                                    className={`h-4 ${badgeWidth} rounded`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
