# PatoLab — Design System & UI Specifications

> **MANDATORY FOR ALL AGENTS & DEVELOPERS:**
> Before generating, modifying, or refactoring any UI component, page, form, filter, table, modal, drawer, or card, **you MUST read and follow the specifications in this document**.
> Never invent ad-hoc styling, unapproved Tailwind classes, or duplicate existing components. Always compose from `@/components/ui` and `@/components`.

---

## 1. Design Principles & Theme Foundations

PatoLab is a modern, high-density laboratory and clinical diagnostic management system. The interface is optimized for speed, clarity, data density, and reliability under intense daily clinical workflows.

### 1.1 Technology Stack & Engine
- **CSS Engine**: Tailwind CSS v4 (`@import 'tailwindcss';` with `@theme`)
- **Animations**: `tw-animate-css`
- **Color Format**: OKLCH color spaces for high perceptual accuracy in light and dark modes
- **Typography**: `'Instrument Sans', ui-sans-serif, system-ui, sans-serif`
- **Component Primitives**: shadcn/ui (New York style), Radix UI primitives, Lucide React icons

---

## 2. Design Tokens & Core Classes

### 2.1 Color Tokens & Semantic Mappings

| Token | Light Mode (OKLCH) | Dark Mode (OKLCH) | Usage & Context |
|---|---|---|---|
| `bg-background` | `oklch(1 0 0)` (Pure White) | `oklch(0.145 0 0)` (Dark Surface) | Root application background |
| `text-foreground` | `oklch(0.145 0 0)` (Deep Charcoal) | `oklch(0.985 0 0)` (Off White) | Primary body & heading text |
| `bg-card` / `text-card-foreground` | White / Charcoal | `oklch(0.145 0 0)` / Off White | Table containers, cards, filter bars |
| `bg-popover` / `text-popover-foreground` | White / Charcoal | `oklch(0.145 0 0)` / Off White | Dropdowns, comboboxes, tooltips |
| `bg-primary` / `text-primary-foreground` | `oklch(0.35 0.16 265)` (Deep Indigo) | `oklch(0.7 0.14 265)` (Bright Indigo) | Primary buttons, active tabs, main accents |
| `text-primary` | Indigo accent text | Bright Indigo accent text | Key identifiers, section icons, active links |
| `bg-secondary` / `text-secondary-foreground` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Secondary buttons, subtle badges |
| `bg-muted` / `text-muted-foreground` | `oklch(0.97 0 0)` / `oklch(0.556 0 0)` | `oklch(0.269 0 0)` / `oklch(0.708 0 0)` | Table header backgrounds, placeholders, timestamps |
| `bg-accent` / `text-accent-foreground` | `oklch(0.57 0.14 235)` (Cyan/Blue) | `oklch(0.75 0.12 235)` | Hover backgrounds (`hover:bg-accent/50`), highlights |
| `bg-destructive` / `text-destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.396 0.141 25.723)` | Delete buttons, cancel actions, error messages |
| `border-border` / `border-input` | `oklch(0.922 0 0)` | `oklch(0.269 0 0)` | Card borders, table borders, input outlines |
| `ring-ring` | Matches primary | Matches primary | Focus rings (`focus-visible:ring-ring/50`) |

### 2.2 Border Radius (`--radius: 0.625rem`)

| Tailwind Class | Calculated Size | Applied Elements |
|---|---|---|
| `rounded-lg` | `10px` (`var(--radius)`) | Kanban columns, selection summary banners, dialog modals |
| `rounded-md` | `8px` (`calc(var(--radius) - 2px)`) | Inputs, buttons, table containers, cards, select triggers |
| `rounded-sm` | `6px` (`calc(var(--radius) - 4px)`) | Dropdown items, inner badge pills, combobox options |
| `rounded-full` | Circular / Pill (`9999px`) | Status pills, counters, avatars, category badges, dot indicators |

### 2.3 Spacing & Layout Rhythm

- **Page Container**: `flex h-full flex-1 flex-col gap-4 p-4` (add `mb-20` if fixed floating action bar or bottom pagination clearance is needed).
- **Header Rhythm**: `flex flex-col gap-4 md:flex-row md:items-center md:justify-between`.
- **Filter Bar Gaps**:
  - Grid mode: `gap-4`.
  - Dense toolbar mode: `gap-2 sm:flex-row sm:items-center`.
  - Two-tier filter area: `flex w-full flex-col gap-4`.
- **Card Padding**: `p-3` for compact Kanban cards; `p-5` or `p-6` for full summary cards.
- **Form Groups**: `grid gap-2` between label and input; `gap-4` between field rows.
- **Standard Heights**:
  - Inputs & Select Triggers: `h-10`
  - Primary / Action Buttons: `h-10`
  - Compact / Filter Trigger Buttons: `h-10` or `h-9`
  - Table Rows: `h-12` (minimum `h-10`)
  - Icon Action Buttons in tables/cards: `h-8 w-8` or `h-6 w-6`

### 2.4 Typography Hierarchy

```tsx
// Page Title
<div className="flex items-center gap-2">
    <Icon className="h-6 w-6 text-primary" />
    <h1 className="text-2xl font-bold tracking-tight">Título de la Página</h1>
</div>

// Page Subtitle / Description
<p className="text-muted-foreground">Descripción explicativa de la sección o vista.</p>

// Section / Drawer Title
<h2 className="text-xl font-semibold tracking-tight">Subtítulo de Sección</h2>

// Data Cell / Primary Text
<span className="text-sm font-medium text-foreground">Nombre de Cliente o Entidad</span>

// Secondary / Metadata Text
<span className="text-xs text-muted-foreground">Teléfono, fecha, notas secundarias</span>

// Monospace Code Identifiers (Muestra, Factura, RTN)
<span className="font-mono text-xs font-bold text-primary">B-2026-0042</span>
```

---

## 3. UI Page Archetypes

Every page in PatoLab follows one of three core page archetypes derived from `referrers/index.tsx`, `invoices/index.tsx`, and `specimens/index.tsx`.

---

### Archetype 1: Standard Management / CRUD Table (Referrers Pattern)

Used for standard catalog, master data, and entity administration (e.g. Referrers, Categories, Products, Users).

```tsx
// Structure:
// 1. Head & Page Container
<Head title="Gestión de Remitentes" />
<div className="flex h-full flex-1 flex-col gap-4 p-4">
    {/* 2. Header: Title + Primary Action */}
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
            <div className="flex items-center gap-2">
                <UserRound className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight">Remitentes</h1>
            </div>
            <p className="text-muted-foreground">
                Administre los médicos y clínicas que remiten muestras.
            </p>
        </div>
        {canCreate && (
            <div className="flex gap-2">
                <Button onClick={handleCreate} className="h-10 w-full px-5 text-sm md:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Remitente
                </Button>
            </div>
        )}
    </div>

    {/* 3. Filter Grid: Search + Dropdowns */}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <div className="relative">
            <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Buscar por nombre, correo..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>
        <Select value={filters.type || 'all'} onValueChange={(v) => handleFilterChange('type', v)}>
            <SelectTrigger>
                <SelectValue placeholder="Tipo de Remitente" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {types.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>

    {/* 4. Bordered Table Container */}
    <div className="rounded-md border bg-card">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.data.length > 0 ? (
                    items.data.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.id}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                    {item.type?.name || 'N/A'}
                                </span>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col text-sm">
                                    <span>{item.phone || 'Sin teléfono'}</span>
                                    <span className="text-xs text-muted-foreground">{item.email}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(item)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            No se encontraron resultados.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </div>

    {/* 5. Pagination */}
    <Pagination links={items.links} meta={{ from: items.from, to: items.to, total: items.total }} />
</div>
```

---

### Archetype 2: Advanced Faceted Data Table (Invoices Pattern)

Used for high-volume transactions, audit trails, and multi-criteria queries (e.g. Invoices, Work Orders, Payments, Financial Records).

#### Key Characteristics:
1. **Header Action Group**: Contains `Limpiar filtros`, `Exportar` (CSV/Excel dropdown), and compound `Nueva Muestra / Factura` dropdown button.
2. **Two-Tier Filter Structure**:
   - **Row 1**: Instant search inputs (Invoice #, Customer name) with clear `X` button + `DateRangePicker` with cookie persistence.
   - **Row 2**: Grid (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5`) of labeled selectors (`Payment method`, `AsyncCustomerCombobox`, `Credit filter`, `Invoice type`, `Group Combobox`).
3. **Deferred Loading State**:
   ```tsx
   <Deferred data="invoices" fallback={<InvoiceTableSkeleton />}>
   ```
4. **Active Loading Bar**:
   ```tsx
   {isTableLoading && (
       <div className="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-primary/20">
           <div className="h-full w-full animate-pulse bg-primary" />
       </div>
   )}
   ```
5. **Sticky Column with Gradient Shadow**:
   First column is sticky on md+ screens (`md:sticky md:left-0 z-10 border-r border-border bg-card`) with a gradient drop shadow (`after:bg-gradient-to-r after:from-black/[0.06] dark:after:from-black/[0.2]`).
6. **Detailed Table Head**:
   Header cells support multi-field sort indicators (`renderSortHeader`) and uppercase sub-labels (`text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase`).

---

### Archetype 3: Multi-Column Kanban Board (Specimens Pattern)

Used for workflow stage progression, real-time status management, and visual specimen tracking.

#### 1. Kanban Header & Top Filters:
- Section icon + title: `<Microscope className="h-6 w-6 text-primary" /> <h1 className="text-2xl font-bold tracking-tight">Muestras</h1>`.
- Multi-status filter popover with counter badge: `Estados (${selectedStatuses.length})` with Select All / Clear toggle.
- Group selector combobox popover: `Popover` + `Command` (`Todos los grupos` / Specific group).
- DateRangePicker: Cookie-backed (`cookieKey="date_filter_specimens"`).
- Reset button: `<Button variant="outline" className="h-10 px-5 text-sm">Limpiar filtros</Button>`.
- Create specimen compound dropdown (`Muestra Individual`, `Grupo de Muestras`, `Agregar a Grupo`).

#### 2. Sub-Toolbar Quick Filters:
- Instant search input: `h-10 w-full sm:w-72 bg-card pl-9`.
- Multi-select popovers: `Tipos (${count})`, `Exámenes (${count})`.
- Toggle switch pills:
  ```tsx
  <div
      className="flex h-10 w-full shrink-0 cursor-pointer items-center justify-between gap-2 rounded-md border bg-card px-3 transition-colors select-none hover:bg-accent/50 sm:w-auto sm:justify-start"
      onClick={() => setShowExpiredOnly((prev) => !prev)}
  >
      <span className="text-sm font-medium">Solo vencidos</span>
      <Switch checked={showExpiredOnly} onCheckedChange={setShowExpiredOnly} onClick={(e) => e.stopPropagation()} />
  </div>
  ```
- Sort direction pill: `Orden vencimiento` with `ArrowUp` / `ArrowDown`.
- Selection mode pill: `Seleccionar` switch enabling batch actions.

#### 3. Kanban Column Layout:
```tsx
<div className="relative flex w-85 min-w-85 flex-col overflow-hidden rounded-lg p-3">
    {/* Dynamic Background Tint */}
    <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{ backgroundColor: priority.color }}
    />

    {/* Column Header */}
    <div className="relative z-10 mb-4 flex items-center gap-2 px-1 text-sm font-semibold">
        <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: priority.color }} />
        <span>{priority.name}</span>
        <span className="ml-auto rounded-full bg-background/60 px-2 py-0.5 text-xs text-muted-foreground">
            {totalCount}
        </span>
    </div>

    {/* Droppable Card Stack */}
    <div className="flex min-h-[150px] flex-1 flex-col gap-3">
        {specimens.map((specimen, index) => (
            <KanbanCard key={specimen.id} specimen={specimen} index={index} ... />
        ))}
        {/* Infinite Scroll Sentinel */}
        {hasMore && <KanbanColumnSentinel priorityId={priority.id} onLoadMore={...} />}
    </div>
</div>
```

#### 4. Kanban Card Anatomy:
```tsx
<div
    className={`relative flex cursor-pointer flex-col gap-2 rounded-md border p-3 shadow-sm transition-all duration-200 hover:border-primary/50 ${
        isDragging
            ? 'z-50 scale-[1.02] rotate-2 opacity-90 shadow-xl ring-2 ring-primary/20'
            : isSelected
              ? 'border-primary bg-primary/[0.02] ring-1 ring-primary/30'
              : hasAssignedUsers
                ? 'border-sky-300/80 bg-sky-50/50 dark:border-sky-850 dark:bg-sky-950/20'
                : 'bg-card'
    }`}
>
    {/* Top Badges (Group / Individual) */}
    <div className="flex items-start">
        <Badge variant="secondary" className="border-none bg-purple-500/10 px-1.5 py-0 text-[9px] font-semibold text-purple-600 dark:bg-purple-500/20 dark:text-purple-300">
            {specimen.group.name}
        </Badge>
    </div>

    {/* Customer Name */}
    <div className="text-sm font-medium">{customer.name}</div>

    {/* Sequence Code & Examinations */}
    <div className="w-fit rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
        {specimen.sequence_code}
    </div>
    <div className="text-[11px] font-semibold text-muted-foreground">{specimen.type.name}</div>

    {/* Due Date & Category Pill */}
    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
        <div className="inline-flex w-fit items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <Tag className="h-3 w-3" /> {category.name}
        </div>
        <div className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${dueInfo.colorClass}`}>
            <CalendarClock className="h-3 w-3" /> {dueInfo.isExpired ? 'Vencida:' : 'Est:'} {dueInfo.formatted}
        </div>
    </div>

    {/* Bottom Status & Timestamp */}
    <div className="mt-1 flex items-center justify-between text-xs">
        <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
            style={{ backgroundColor: specimen.status_color }}
        >
            {statusLabel}
        </span>
        <span className="text-muted-foreground capitalize">{formattedCreatedDate}</span>
    </div>
</div>
```

---

## 4. Filter Organization & Standards

### 4.1 Debounced Search Input with Clear Button
Every search input MUST implement debouncing (300ms), a leading search icon, and a clear button (`X`) when a value exists:

```tsx
<div className="relative w-full">
    <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
    <Input
        placeholder="Buscar por código, cliente o RTN..."
        className="w-full pr-8 pl-8"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
            if (e.key === 'Enter') {
                debouncedSearch.flush();
            }
        }}
    />
    {search && (
        <button
            type="button"
            onClick={() => {
                setSearch('');
                debouncedSearch.cancel();
                handleFilterChange('search', '');
            }}
            className="absolute top-2.5 right-2.5 text-muted-foreground transition-colors hover:text-foreground"
            title="Limpiar búsqueda"
        >
            <X className="h-4 w-4" />
        </button>
    )}
</div>
```

### 4.2 Date Range Picker Standard
Always import and use `DateRangePicker` from `@/components/date-range-picker`.
- Provide a unique `cookieKey` (e.g. `date_filter_invoices`, `date_filter_specimens`) so the user's filter choice persists across reloads.
- Supports presets: Hoy (`today`), Últimos 7 días (`7_days`), Últimos 14 días (`14_days`), Últimos 30 días (`30_days`), Este mes (`this_month`), and Rango personalizado.

### 4.3 Select & Combobox Standards
- **Standard Select**: Use `Select` from `@/components/ui/select` for static enums (1–7 options). Always include `<SelectItem value="all">Todos...</SelectItem>`.
- **Searchable Combobox**: Use `FormCombobox` from `@/components/form-combobox` for longer lists (categories, priorities, banks).
- **Customer Selector**: Always use `AsyncCustomerCombobox` from `@/components/async-customer-combobox` for customer search. Never write raw inputs or plain selects for customers.

### 4.4 Filter Reset Action
Every filterable page must include a "Limpiar filtros" button:
- Resets the Inertia router state.
- Resets stored user cookie preferences back to the system default (e.g. last 14 days, active statuses).

---

## 5. Component Reusability Catalog

### 5.1 Shared App Components (`resources/js/components/`)

| Component | Import Path | Primary Use Case & Key Props |
|---|---|---|
| `Pagination` | `@/components/pagination` | Server-side pagination bar. Props: `links`, `meta: { from, to, total }`, optional `perPageOptions`, `onPerPageChange`. |
| `DateRangePicker` | `@/components/date-range-picker` | Persistent date range filter. Props: `value: { from, to }`, `onChange`, `cookieKey`. |
| `AsyncCustomerCombobox` | `@/components/async-customer-combobox` | Debounced async customer search & selection. Props: `value`, `onChange`, `allowClear`, `initialCustomer`. |
| `FormCombobox` | `@/components/form-combobox` | Searchable dropdown with checkmark. Props: `options: { label, value, color? }[]`, `value`, `onChange`, `placeholder`. |
| `Heading` | `@/components/heading` | Page/section headers. Props: `title`, `description?`, `variant?: 'default' \| 'small'`. |
| `HeadingSheet` | `@/components/heading-sheet` | Standard drawer sheet header. Props: `title`, `description`. |
| `InputError` | `@/components/input-error` | Validation error display. Props: `message?: string`. |
| `PasswordInput` | `@/components/password-input` | Password field with reveal eye toggle. |
| `DeliveryDatePreview` | `@/components/delivery-date-preview` | Calculated specimen delivery time preview with urgency color. |
| `CancelSpecimenDialog` | `@/components/cancel-specimen-dialog` | Modal with reason requirement to cancel specimens. |
| `InvoicePreviewDialog` | `@/components/invoice-preview-dialog` | Modal to preview generated invoice documents. |

---

### 5.2 UI Primitives Catalog (`resources/js/components/ui/`)

| Primitive | Usage Rules & Variants |
|---|---|
| `Button` | Variants: `default` (primary action), `outline` (secondary/filters), `ghost` (table actions, icon buttons), `destructive` (danger). Heights: `h-10` default, `h-8` compact. Always include `<Spinner className="mr-2" />` when `processing`. |
| `Badge` | Variants: `default`, `secondary`, `destructive`, `outline`. Use for status indicators, counts, and pill tags (`rounded-full px-2 py-0.5 text-[10px] font-medium`). |
| `Card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. Bordered card containers with `bg-card text-card-foreground rounded-xl border shadow-sm`. |
| `Table` | Always wrap in `<div className="rounded-md border bg-card">`. Use `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`. Add empty state row when length === 0. |
| `Sheet` | Slide-over drawer for entity creation/editing. Standard size: `sm:max-w-[540px]`. Always pair with `HeadingSheet`. |
| `Dialog` | General modal dialogs for targeted flows (e.g. previews, merges, bulk assignments). |
| `AlertDialog` | Mandatory for all destructive confirmations (Delete, Void, Invalidate). Red action button: `bg-destructive text-white hover:bg-destructive/90`. |
| `DropdownMenu` | Used for row actions (`MoreVertical`), table export actions, and compound create buttons (`Nueva Muestra` with arrow). |
| `Popover` | Used for custom multi-select filters, calendar pickers, and inline filters. |
| `Command` | Used inside `Popover` for fuzzy search and selection menus (`CommandInput`, `CommandList`, `CommandItem`). |
| `Switch` | Used for binary filters (`Solo vencidos`, `Seleccionar`) inside filter pill containers. |
| `Checkbox` | Accessible checkbox for multi-select table rows and Kanban bulk selection. |
| `Tooltip` | Wrap disabled action buttons with `Tooltip` explaining *why* the action is unavailable. |
| `Skeleton` | Animated skeleton loader used inside `<Deferred>` fallbacks for tables and cards. |
| `Sonner` | Global toast notifications. Call `toast.success('...')` or `toast.error('...')`. |

---

## 6. Drawers (Sheets), Dialogs & Form Guidelines

### 6.1 Drawer Form Pattern (Create / Edit Workflows)
In PatoLab, entity creation and editing should default to a side drawer (`Sheet`) rather than navigating away to a separate page, preserving the user's filtered list state.

```tsx
<Sheet open={isOpen} onOpenChange={setIsOpen}>
    <SheetContent className="overflow-y-auto sm:max-w-[540px]">
        <HeadingSheet
            title={entity ? 'Editar Registro' : 'Nuevo Registro'}
            description="Complete los datos solicitados en el formulario."
        />
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
            <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Ej. Dr. Mario Estrada"
                />
                {errors.name && (
                    <p className="text-sm font-medium text-destructive">{errors.name}</p>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={processing} className="w-full md:w-auto">
                    {processing && <Spinner className="mr-2" />}
                    {entity ? 'Guardar Cambios' : 'Crear Registro'}
                </Button>
            </div>
        </form>
    </SheetContent>
</Sheet>
```

### 6.2 Destructive Action Dialog Pattern
Always use `AlertDialog` for deletions or cancellations:

```tsx
<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este elemento?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta acción desactivará permanentemente a <strong>{item?.name}</strong>.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
            >
                Eliminar
            </AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>
```

---

## 7. Interactive Feedback & Polish

1. **Table Loading State**: Whenever re-fetching or filtering an Inertia table, dim the table (`opacity-60 pointer-events-none`) and show the top animated pulse progress line.
2. **Empty States**: Never show a blank whitespace area. Always render a centered message row with `h-24 text-center text-muted-foreground` (e.g. `No se encontraron resultados.`).
3. **Toasts**: Always notify users upon action completion using `toast.success('...')` or `toast.error('...')`.
4. **Action Tooltips**: Never render a silently disabled button; wrap it in `<Tooltip>` explaining the missing permission or prerequisite.
5. **Dark Mode Integrity**: Always test colors against dark mode variables. Do not use hardcoded hex or tailwind gray values (e.g. `bg-gray-100` / `border-gray-200`) without dark mode counter-classes (`dark:bg-muted/10 dark:border-border/60`). Prefer semantic tokens (`bg-card`, `bg-muted`, `border-border`).

