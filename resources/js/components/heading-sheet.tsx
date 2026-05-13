import {
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';

interface HeadingSheetProps {
    title: string;
    description: string;
}

export default function HeadingSheet({ title, description }: HeadingSheetProps) {
    return (
        <SheetHeader className="px-5 pt-4">
            <SheetTitle className="text-2xl">{title}</SheetTitle>
            <SheetDescription>
                {description}
            </SheetDescription>
        </SheetHeader>
    );
}
