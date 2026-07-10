import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import CuttingForm from './cutting-form';

interface Cutting {
	id?: number;
	code_id: number;
	specimen_id: number;
	description: string;
	number_of_cuttings: number;
	cuttings_description: string;
	number_of_slides: number | null;
	cutting_slide_types: number[] | null;
	status: 'processing' | 'macroscopy' | 'delivered';
	comments: string | null;
	responsible_id: number;
}

interface CuttingCode {
	id: number;
	code: string;
	color: string;
}

interface CuttingSlideType {
	id: number;
	name: string;
}

interface User {
	id: number;
	name: string;
}

interface Props {
	cutting?: Cutting | null;
	specimen: {
		id: number;
		sequence_code: string;
	};
	cuttingCodes: CuttingCode[];
	cuttingSlideTypes: CuttingSlideType[];
	users: User[];
	isDuplicate?: boolean;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	className?: string;
	overlayClassName?: string;
}

export default function CuttingSheet({
	cutting,
	specimen,
	cuttingCodes,
	cuttingSlideTypes,
	users,
	isDuplicate = false,
	open,
	onOpenChange,
	className,
	overlayClassName,
}: Props) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				className={cn(
					'w-full overflow-y-auto sm:max-w-[640px]',
					className,
				)}
				overlayClassName={overlayClassName}
			>
				<HeadingSheet
					title={
						cutting
							? isDuplicate
								? 'Duplicar Corte'
								: 'Editar Corte'
							: 'Registrar Nuevo Corte'
					}
					description={
						cutting
							? isDuplicate
								? 'Configure los nuevos campos de destino para el corte copiado.'
								: 'Actualice la información del corte de la muestra aquí.'
							: 'Complete los campos para registrar un nuevo corte para esta muestra.'
					}
				/>
				<CuttingForm
					cutting={cutting}
					specimen={specimen}
					cuttingCodes={cuttingCodes}
					cuttingSlideTypes={cuttingSlideTypes}
					users={users}
					isDuplicate={isDuplicate}
					onSuccess={() => onOpenChange(false)}
				/>
			</SheetContent>
		</Sheet>
	);
}
