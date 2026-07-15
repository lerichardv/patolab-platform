<?php

use App\Http\Controllers\AiAssistantController;
use App\Http\Controllers\CaiRangeController;
use App\Http\Controllers\CreditController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CustomerSearchController;
use App\Http\Controllers\CuttingCodeController;
use App\Http\Controllers\Editor\CuttingController;
use App\Http\Controllers\Editor\ReportEditorController;
use App\Http\Controllers\HistotechnologistWorkOrderController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\InventoryMovementController;
use App\Http\Controllers\InventoryProviderController;
use App\Http\Controllers\InventoryPurchaseOrderController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\MyAssignmentController;
use App\Http\Controllers\MySpecimenTypeTemplateController;
use App\Http\Controllers\MyWorkOrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReferrerController;
use App\Http\Controllers\ReferrerTypeController;
use App\Http\Controllers\RentalController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SequenceController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\SpecimenCategoryController;
use App\Http\Controllers\SpecimenController;
use App\Http\Controllers\SpecimenGroupController;
use App\Http\Controllers\SpecimenTypeController;
use App\Http\Controllers\SpecimenTypeExaminationController;
use App\Http\Controllers\SpecimenTypeTemplateController;
use App\Http\Controllers\StorageController;
use App\Http\Controllers\UserCommissionController;
use App\Http\Controllers\UserCommissionRuleController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WorkOrderController;
use App\Http\Controllers\WorkOrderTaskController;
use App\Http\Controllers\WorkOrderTypeController;
use App\Models\Customer;
use App\Models\Department;
use App\Models\Invoice;
use App\Models\Specimen;
use Carbon\Carbon;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::get('specimen/{specimen_code}', [SpecimenController::class, 'showPublic'])->name('specimens.show-public');
Route::get('specimen-group/{id}', [SpecimenGroupController::class, 'showPublic'])->name('specimen-groups.show-public');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        $specimensCount = Specimen::where('active', true)->count();
        $moneyMadeToday = Invoice::whereDate('created_at', Carbon::today())->sum('total');
        $customersCount = Customer::where('active', true)->count();

        $startOfWeek = Carbon::now()->startOfWeek();
        $endOfWeek = Carbon::now()->endOfWeek();

        $specimensThisWeekCount = Specimen::where('active', true)
            ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
            ->count();

        // Get specimens created this week, grouped by date
        $specimensThisWeek = Specimen::where('active', true)
            ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->pluck('count', 'date');

        // Get invoices created this week, grouped by date
        $invoicesThisWeek = Invoice::whereBetween('created_at', [$startOfWeek, $endOfWeek])
            ->selectRaw('DATE(created_at) as date, SUM(total) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        // Build a complete list of 7 days (Monday to Sunday)
        $weeklyData = [];
        $daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        for ($i = 0; $i < 7; $i++) {
            $dateStr = $startOfWeek->copy()->addDays($i)->toDateString();
            $weeklyData[] = [
                'day' => $daysOfWeek[$i],
                'date' => $dateStr,
                'count' => (int) ($specimensThisWeek[$dateStr] ?? 0),
                'earnings' => (float) ($invoicesThisWeek[$dateStr] ?? 0),
            ];
        }

        $todaySpecimens = Specimen::where('active', true)
            ->whereDate('created_at', Carbon::today())
            ->with(['customerRelation', 'type', 'examination', 'priority', 'invoiceRelation'])
            ->orderBy('created_at', 'desc')
            ->get();

        return inertia('dashboard', [
            'specimensCount' => $specimensCount,
            'specimensThisWeekCount' => $specimensThisWeekCount,
            'moneyMadeToday' => (float) $moneyMadeToday,
            'customersCount' => $customersCount,
            'specimensWeeklyData' => $weeklyData,
            'todaySpecimens' => $todaySpecimens,
        ]);
    })->name('dashboard');
    Route::get('customers/export', [CustomerController::class, 'export'])->name('customers.export');
    Route::get('customers/import', [CustomerController::class, 'importPage'])->name('customers.import-page');
    Route::post('customers/import/parse', [CustomerController::class, 'parseImport'])->name('customers.import-parse');
    Route::post('customers/import/row', [CustomerController::class, 'importRow'])->name('customers.import-row');
    Route::get('customers/search', [CustomerSearchController::class, 'search'])->name('customers.search');
    Route::resource('customers', CustomerController::class);

    Route::get('departments', function () {
        return response()->json(Department::orderBy('name')->get());
    })->name('departments.index');

    Route::get('departments/{department}/municipalities', function (Department $department) {
        return response()->json($department->municipalities()->orderBy('name')->get());
    })->name('departments.municipalities.index');
    Route::resource('users', UserController::class);
    Route::resource('user-commission-rules', UserCommissionRuleController::class);
    Route::resource('user-commissions', UserCommissionController::class)->only(['index', 'update', 'destroy']);
    Route::resource('roles', RoleController::class);
    Route::post('specimens/update-order', [SpecimenController::class, 'updateOrder'])->name('specimens.update-order');
    Route::post('specimens/bulk-action', [SpecimenController::class, 'bulkAction'])->name('specimens.bulk-action');
    Route::post('specimens/{specimen}/assign-user', [SpecimenController::class, 'assignUser'])->name('specimens.assign-user');
    Route::post('specimens/{specimen}/unassign-user', [SpecimenController::class, 'unassignUser'])->name('specimens.unassign-user');
    Route::get('my-assignments', [MyAssignmentController::class, 'index'])->name('my-assignments.index');
    Route::post('specimen-groups', [SpecimenGroupController::class, 'store'])->name('specimen-groups.store');

    // Specimen Report Editor routes
    Route::get('specimens/templates/available', [ReportEditorController::class, 'getAvailableTemplates'])->name('specimens.templates.available');
    Route::get('specimens/{specimen:sequence_code}/report-editor', [ReportEditorController::class, 'show'])->name('specimens.report-editor');
    Route::post('specimens/{specimen:sequence_code}/report-editor', [ReportEditorController::class, 'store'])->name('specimens.report-editor.store');
    Route::post('specimens/{specimen:sequence_code}/report-editor/save', [ReportEditorController::class, 'save'])->name('specimens.report-editor.save');
    Route::post('specimens/{specimen:sequence_code}/report-editor/update-date', [ReportEditorController::class, 'updateDate'])->name('specimens.report-editor.update-date');
    Route::post('specimens/{specimen:sequence_code}/report-editor/transition-state', [ReportEditorController::class, 'transitionState'])->name('specimens.report-editor.transition-state');
    Route::post('specimens/{specimen:sequence_code}/report-editor/generate-temp-pdf', [ReportEditorController::class, 'generateTempPdf'])->name('specimens.report-editor.generate-temp-pdf');
    Route::post('specimens/{specimen:sequence_code}/report-editor/upload-image', [ReportEditorController::class, 'uploadImage'])->name('specimens.report-editor.upload-image');
    Route::post('specimens/{specimen:sequence_code}/report-editor/update-products', [ReportEditorController::class, 'updateProducts'])->name('specimens.report-editor.update-products');
    Route::get('specimens/{specimen:sequence_code}/report-editor/pdf', [ReportEditorController::class, 'downloadPdf'])->name('specimens.report-editor.pdf');

    // Specimen Cutting routes
    Route::put('cuttings/bulk-update', [CuttingController::class, 'bulkUpdate'])->name('cuttings.bulk-update');
    Route::post('specimens/{specimen:sequence_code}/cuttings', [CuttingController::class, 'store'])->name('cuttings.store');
    Route::put('cuttings/{cutting}', [CuttingController::class, 'update'])->name('cuttings.update');
    Route::put('cuttings/{cutting}/status', [CuttingController::class, 'updateStatus'])->name('cuttings.update-status');
    Route::delete('cuttings/{cutting}', [CuttingController::class, 'destroy'])->name('cuttings.destroy');
    Route::resource('cutting-codes', CuttingCodeController::class);
    Route::post('specimens/{specimen:sequence_code}/generate-report', [SpecimenController::class, 'generateReport'])->name('specimens.generate-report');
    Route::resource('specimens', SpecimenController::class);
    Route::get('invoices/export', [InvoiceController::class, 'export'])->name('invoices.export');
    Route::resource('invoices', InvoiceController::class)->only(['index', 'update']);
    Route::get('credits/export', [CreditController::class, 'export'])->name('credits.export');
    Route::resource('credits', CreditController::class)->only(['index', 'update']);
    Route::post('credits/{credit}/pay', [CreditController::class, 'pay'])->name('credits.pay');

    Route::resource('rentals', RentalController::class)->only(['index', 'store', 'update']);
    Route::post('rentals/{rental}/pay', [RentalController::class, 'pay'])->name('rentals.pay');
    Route::post('specimen-type-templates/upload-image', [SpecimenTypeTemplateController::class, 'uploadImage'])->name('specimen-type-templates.upload-image');
    Route::resource('specimen-type-templates', SpecimenTypeTemplateController::class);

    Route::post('my-specimen-type-templates/upload-image', [MySpecimenTypeTemplateController::class, 'uploadImage'])->name('my-specimen-type-templates.upload-image');
    Route::post('my-specimen-type-templates/share', [MySpecimenTypeTemplateController::class, 'share'])->name('my-specimen-type-templates.share');
    Route::delete('my-specimen-type-templates/share/{permission}', [MySpecimenTypeTemplateController::class, 'revokeShare'])->name('my-specimen-type-templates.revoke-share');
    Route::post('my-specimen-type-templates/share/bulk-revoke', [MySpecimenTypeTemplateController::class, 'bulkRevokeShare'])->name('my-specimen-type-templates.bulk-revoke-share');
    Route::resource('my-specimen-type-templates', MySpecimenTypeTemplateController::class);
    Route::resource('specimen-categories', SpecimenCategoryController::class);
    Route::get('specimen-types/import', [SpecimenTypeController::class, 'importPage'])->name('specimen-types.import-page');
    Route::post('specimen-types/import/parse', [SpecimenTypeController::class, 'parseImport'])->name('specimen-types.import-parse');
    Route::post('specimen-types/import/row', [SpecimenTypeController::class, 'importRow'])->name('specimen-types.import-row');
    Route::resource('specimen-types', SpecimenTypeController::class);
    Route::get('specimen-type-examinations/import', [SpecimenTypeExaminationController::class, 'importPage'])->name('specimen-type-examinations.import-page');
    Route::post('specimen-type-examinations/import/parse', [SpecimenTypeExaminationController::class, 'parseImport'])->name('specimen-type-examinations.import-parse');
    Route::post('specimen-type-examinations/import/row', [SpecimenTypeExaminationController::class, 'importRow'])->name('specimen-type-examinations.import-row');
    Route::resource('specimen-type-examinations', SpecimenTypeExaminationController::class);
    Route::resource('work-orders', WorkOrderTypeController::class)->parameters([
        'work-orders' => 'work_order_type',
    ]);
    Route::resource('work-order-tasks', WorkOrderTaskController::class);
    Route::post('work-order-records', [WorkOrderController::class, 'store'])->name('work-order-records.store');
    Route::get('admin-work-orders', [WorkOrderController::class, 'index'])->name('admin-work-orders.index');
    Route::get('my-work-orders', [MyWorkOrderController::class, 'index'])->name('my-work-orders.index');
    Route::put('my-work-orders/{work_order}/status', [MyWorkOrderController::class, 'updateStatus'])->name('my-work-orders.update-status');

    // Histotechnologist Work Orders Control routes
    Route::get('histotechnologist-work-orders', [HistotechnologistWorkOrderController::class, 'index'])->name('histotechnologist-work-orders.index');
    Route::post('histotechnologist-work-orders/{work_order}/users', [HistotechnologistWorkOrderController::class, 'assignTechnician'])->name('histotechnologist-work-orders.assign');
    Route::delete('histotechnologist-work-orders/{work_order}/users/{user}', [HistotechnologistWorkOrderController::class, 'unassignTechnician'])->name('histotechnologist-work-orders.unassign');
    Route::put('histotechnologist-work-orders/{work_order}/status', [HistotechnologistWorkOrderController::class, 'updateStatus'])->name('histotechnologist-work-orders.update-status');
    Route::resource('referrers', ReferrerController::class);
    Route::resource('referrer-types', ReferrerTypeController::class);
    Route::resource('locations', LocationController::class);
    Route::resource('cai-ranges', CaiRangeController::class);
    Route::resource('sequences', SequenceController::class);
    Route::resource('storages', StorageController::class);
    Route::resource('products', ProductController::class);
    Route::resource('inventory-providers', InventoryProviderController::class);
    Route::put('inventory-purchase-orders/{inventory_purchase_order}/status', [InventoryPurchaseOrderController::class, 'updateStatus'])->name('inventory-purchase-orders.update-status');
    Route::resource('inventory-purchase-orders', InventoryPurchaseOrderController::class);
    Route::post('inventories/abastecer', [InventoryController::class, 'abastecer'])->name('inventories.abastecer');
    Route::resource('inventories', InventoryController::class);
    Route::get('inventory-movements', [InventoryMovementController::class, 'index'])->name('inventory-movements.index');

    Route::get('settings/system', [SettingController::class, 'index'])->name('settings.system.index');
    Route::put('settings/system', [SettingController::class, 'update'])->name('settings.system.update');
    Route::post('ai-assistant/chat', [AiAssistantController::class, 'chat'])->name('ai-assistant.chat');
});

require __DIR__.'/settings.php';
