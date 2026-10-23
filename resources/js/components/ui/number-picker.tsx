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
	size?: 'default' | 'sm';
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
	size = 'default',
}: NumberPickerProps) {
	const [inputValue, setInputValue] = React.useState(value.toString());

	React.useEffect(() => {
		setInputValue(value.toString());
	}, [value]);

	const handleDecrement = () => {
		const newValue = Math.max(min, Math.round((value - step) * 100) / 100);
		onChange(newValue);
	};

	const handleIncrement = () => {
		const newValue = Math.min(max, Math.round((value + step) * 100) / 100);
		onChange(newValue);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value;
		setInputValue(raw);
		const parsed = parseFloat(raw);
		if (!isNaN(parsed)) {
			const clamped = Math.max(min, Math.min(max, parsed));
			onChange(clamped);
		}
	};

	const handleBlur = () => {
		const parsed = parseFloat(inputValue);
		if (isNaN(parsed) || parsed < min || parsed > max) {
			setInputValue(value.toString());
		}
	};

	const isSm = size === 'sm';

	return (
		<div className={cn('flex items-center', className)}>
			<Button
				type="button"
				variant="outline"
				size="icon"
				className={cn(
					'rounded-r-none border-r-0 select-none shrink-0',
					isSm ? 'h-7 w-7' : 'h-9 w-9',
				)}
				onClick={handleDecrement}
				disabled={disabled || value <= min}
			>
				<Minus className={cn(isSm ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
			</Button>
			<Input
				id={id}
				type="number"
				value={inputValue}
				onChange={handleInputChange}
				onBlur={handleBlur}
				disabled={disabled}
				className={cn(
					'rounded-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-semibold focus-visible:z-10',
					isSm ? 'h-7 w-14 text-xs px-1' : 'h-9 w-14',
				)}
				min={min}
				max={max}
				step={step}
			/>
			<Button
				type="button"
				variant="outline"
				size="icon"
				className={cn(
					'rounded-l-none border-l-0 select-none shrink-0',
					isSm ? 'h-7 w-7' : 'h-9 w-9',
				)}
				onClick={handleIncrement}
				disabled={disabled || value >= max}
			>
				<Plus className={cn(isSm ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
			</Button>
		</div>
	);
}
