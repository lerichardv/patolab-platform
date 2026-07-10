import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface NumberPickerProps {
	id?: string;
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	className?: string;
}

export function NumberPicker({
	id,
	value,
	onChange,
	min = 1,
	max = 9999,
	step = 1,
	disabled = false,
	className,
}: NumberPickerProps) {
	const [inputValue, setInputValue] = React.useState(value.toString());

	React.useEffect(() => {
		setInputValue(value.toString());
	}, [value]);

	const handleDecrement = () => {
		const newValue = Math.max(min, value - step);
		onChange(newValue);
	};

	const handleIncrement = () => {
		const newValue = Math.min(max, value + step);
		onChange(newValue);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value;
		setInputValue(raw);
		const parsed = parseInt(raw, 10);
		if (!isNaN(parsed)) {
			const clamped = Math.max(min, Math.min(max, parsed));
			onChange(clamped);
		}
	};

	const handleBlur = () => {
		const parsed = parseInt(inputValue, 10);
		if (isNaN(parsed) || parsed < min || parsed > max) {
			setInputValue(value.toString());
		}
	};

	return (
		<div className={cn('flex items-start', className)}>
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="h-9 w-9 rounded-r-none border-r-0 select-none shrink-0"
				onClick={handleDecrement}
				disabled={disabled || value <= min}
			>
				<Minus className="h-4 w-4" />
			</Button>
			<Input
				id={id}
				type="number"
				value={inputValue}
				onChange={handleInputChange}
				onBlur={handleBlur}
				disabled={disabled}
				className="h-9 w-14 rounded-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-semibold focus-visible:z-10"
				min={min}
				max={max}
			/>
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="h-9 w-9 rounded-l-none border-l-0 select-none shrink-0"
				onClick={handleIncrement}
				disabled={disabled || value >= max}
			>
				<Plus className="h-4 w-4" />
			</Button>
		</div>
	);
}
