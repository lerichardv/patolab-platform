import { Check, Loader2, Plus, Search, X } from 'lucide-react';
import * as React from 'react';

import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

export interface CustomerOption {
	id: number;
	name: string;
	id_number?: string | null;
	phone?: string | null;
	email?: string | null;
	gender?: string | null;
	type?: string | null;
	age?: number | null;
}

interface Props {
	value: string;
	onChange: (id: string, customer?: CustomerOption) => void;
	placeholder?: string;
	disabled?: boolean;
	initialCustomer?: CustomerOption | null;
	onCreateNew?: () => void;
	allowClear?: boolean;
}

const MIN_CHARS = 4;
const DEBOUNCE_MS = 300;

export default function AsyncCustomerCombobox({
	value,
	onChange,
	placeholder = 'Seleccionar cliente',
	disabled = false,
	initialCustomer,
	onCreateNew,
	allowClear = false,
}: Props) {
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState('');
	const [results, setResults] = React.useState<CustomerOption[]>([]);
	const [loading, setLoading] = React.useState(false);
	const containerRef = React.useRef<HTMLDivElement>(null);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	const prevQueryRef = React.useRef('');

	const [knownCustomers, setKnownCustomers] = React.useState<Map<number, CustomerOption>>(() => {
		const m = new Map<number, CustomerOption>();

		if (initialCustomer) {
			m.set(initialCustomer.id, initialCustomer);
		}

		return m;
	});

	// Sync the known-customers cache when the initial customer changes
	const prevInitialCustomerId = React.useRef(initialCustomer?.id);
	React.useEffect(() => {
		if (!initialCustomer) {
			return;
		}

		if (initialCustomer.id === prevInitialCustomerId.current) {
			return;
		}

		prevInitialCustomerId.current = initialCustomer.id;

		setKnownCustomers((prev) => {
			const next = new Map(prev);
			next.set(initialCustomer.id, initialCustomer);

			return next;
		});
	}, [initialCustomer]);

	// Close when clicking outside the component
	React.useEffect(() => {
		if (!open) {
			return;
		}

		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);

		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [open]);

	const selectedCustomer = value ? (knownCustomers.get(Number(value)) ?? null) : null;

	// Input shows the query while typing, otherwise the selected name, otherwise empty
	const displayValue = query || (allowClear && !value ? '' : selectedCustomer?.name ?? '');

	const fetchCustomers = React.useCallback(
		async (q: string, selectedId?: number) => {
			if (q.length < MIN_CHARS && !selectedId) {
				setResults([]);
				setLoading(false);

				return;
			}

			setLoading(true);

			try {
				const params = new URLSearchParams();

				if (q.length >= MIN_CHARS) {
					params.set('q', q);
				}

				if (selectedId) {
					params.append('selected_ids[]', String(selectedId));
				}

				const res = await fetch(`/customers/search?${params.toString()}`, {
					headers: { Accept: 'application/json' },
					credentials: 'same-origin',
				});

				if (!res.ok) {
					throw new Error('Search failed');
				}

				const json = await res.json();
				const customers: CustomerOption[] = json.data ?? [];

				setKnownCustomers((prev) => {
					const next = new Map(prev);
					customers.forEach((c) => next.set(c.id, c));

					return next;
				});

				setResults(customers);
			} catch {
				setResults([]);
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	const handleQueryChange = React.useCallback(
		(q: string) => {
			setQuery(q);

			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}

			if (q.length < MIN_CHARS) {
				setResults([]);
				setLoading(false);

				return;
			}

			setLoading(true);
			debounceRef.current = setTimeout(() => {
				fetchCustomers(q, value ? Number(value) : undefined);
			}, DEBOUNCE_MS);
		},
		[fetchCustomers, value],
	);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const q = e.target.value;
		const isDeleting = q.length < prevQueryRef.current.length;
		prevQueryRef.current = q;

		// Clear selection whenever the input becomes empty (backspace, select-all-delete, etc.)
		if (q === '' && value) {
			onChange('', undefined);
		}

		if (isDeleting) {
			setQuery(q);

			if (q.length < MIN_CHARS) {
				setResults([]);
				setLoading(false);
			}

			if (!open) {
				setOpen(true);
			}

			return;
		}

		handleQueryChange(q);

		if (!open) {
			setOpen(true);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key !== 'Enter') {
			return;
		}

		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
			debounceRef.current = null;
		}

		if (query.length >= MIN_CHARS) {
			setLoading(true);
			fetchCustomers(query, value ? Number(value) : undefined);
		}
	};

	const handleInputFocus = () => {
		setOpen(true);

		if (results.length === 0 && value) {
			fetchCustomers('', Number(value));
		}
	};

	const handleSelect = (customer: CustomerOption) => {
		onChange(String(customer.id), customer);
		setOpen(false);
		setQuery('');
		prevQueryRef.current = '';
	};

	const handleClear = () => {
		onChange('', undefined);
		setQuery('');
		setOpen(false);
		inputRef.current?.focus();
	};

	return (
		<div ref={containerRef} className="relative w-full">
			<div className="relative">
				<Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<input
					ref={inputRef}
					type="text"
					value={displayValue}
					onChange={handleInputChange}
					onFocus={handleInputFocus}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					disabled={disabled}
					className={cn(
						'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-8 pr-8 text-sm shadow-sm transition-colors',
						'placeholder:text-muted-foreground',
						'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
						'disabled:cursor-not-allowed disabled:opacity-50',
						!query && selectedCustomer && 'font-medium',
					)}
				/>
				{loading ? (
					<Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
				) : displayValue ? (
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => {
							e.stopPropagation();
							handleClear();
						}}
						className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100"
					>
						<X className="h-3.5 w-3.5" />
					</button>
				) : null}
			</div>

			{open && (
				<div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
					<Command shouldFilter={false}>
						<CommandList>
							{loading ? (
								<div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
									<Loader2 className="h-4 w-4 animate-spin" />
									Buscando...
								</div>
							) : (
								<>
									<CommandEmpty>
										{query.length < MIN_CHARS
											? `Escribe ${MIN_CHARS} o más caracteres para buscar.`
											: 'No se encontraron clientes.'}
									</CommandEmpty>
									<CommandGroup>
										{allowClear && (
											<CommandItem
												value=""
												onSelect={() => {
													onChange('', undefined);
													setOpen(false);
													setQuery('');
												}}
											>
												<Check
													className={cn('mr-2 h-4 w-4 shrink-0', !value ? 'opacity-100' : 'opacity-0')}
												/>
												<span className="truncate">Todos los clientes</span>
											</CommandItem>
										)}
										{results.map((customer) => (
											<CommandItem
												key={customer.id}
												value={String(customer.id)}
												onSelect={() => handleSelect(customer)}
											>
												<Check
													className={cn('mr-2 h-4 w-4 shrink-0', value === String(customer.id) ? 'opacity-100' : 'opacity-0')}
												/>
												<span className="truncate">{customer.name}</span>
												{customer.id_number && (
													<span className="ml-auto shrink-0 text-xs text-muted-foreground">{customer.id_number}</span>
												)}
											</CommandItem>
										))}
									</CommandGroup>
								</>
							)}
						</CommandList>
						{onCreateNew && (
							<div className="border-t p-2">
								<button
									type="button"
									onClick={() => {
										setOpen(false);
										onCreateNew();
									}}
									className="flex w-full cursor-pointer items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm font-medium text-primary hover:bg-accent hover:text-white"
								>
									<Plus className="h-4 w-4" />
									Nuevo cliente
								</button>
							</div>
						)}
					</Command>
				</div>
			)}
		</div>
	);
}
