<?php

use App\Http\Controllers\AiAssistantController;
use App\Http\Controllers\CaiRangeController;
use App\Http\Controllers\CreditController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CustomerSearchController;
use App\Http\Controllers\CuttingCodeController;
use App\Http\Controllers\CuttingPrefixController;
use App\Http\Controllers\DashboardController;
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
use App\Http\Controllers\Reports\BillingSummaryReportController;
use App\Http\Controllers\Reports\CreditGroupReportController;
use App\Http\Controllers\Reports\CuttingsReportController;
use App\Http\Controllers\Reports\DeliveryReportController;
use App\Http\Controllers\ReportVerificationController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SequenceController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\SpecimenCategoryController;
use App\Http\Controllers\SpecimenController;
use App\Http\Controllers\SpecimenGroupController;
use App\Http\Controllers\SpecimenSequenceController;
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
use App\Models\Department;
use App\Models\Specimen;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
})->name('home');

Route::get('/v/{report_code}', ReportVerificationController::class)->name('report.verify');

Route::get('/dev-login', function () {
    Auth::loginUsingId(7);

    return redirect('/specimens/BIO-0010-08-2026/report-editor');
});

Route::get('specimen/{specimen_code}', [SpecimenController::class, 'showPublic'])->name('specimens.show-public');
Route::get('specimen-group/{id}', [SpecimenGroupController::class, 'showPublic'])->name('specimen-groups.show-public');
Route::get('maintenance', fn () => response()->view('errors.503'))->name('maintenance');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
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
    Route::post('specimens/reserve-code', [SpecimenSequenceController::class, 'reserve'])->name('specimens.reserve-code');
    Route::post('specimens/update-order', [SpecimenController::class, 'updateOrder'])->name('specimens.update-order');
    Route::post('specimens/bulk-action', [SpecimenController::class, 'bulkAction'])->name('specimens.bulk-action');
    Route::post('specimens/{specimen}/assign-user', [SpecimenController::class, 'assignUser'])->name('specimens.assign-user');
    Route::post('specimens/{specimen}/unassign-user', [SpecimenController::class, 'unassignUser'])->name('specimens.unassign-user');
    Route::post('specimens/{specimen}/assign-collaborator', [SpecimenController::class, 'assignCollaborator'])->name('specimens.assign-collaborator');
    Route::post('specimens/{specimen}/unassign-collaborator', [SpecimenController::class, 'unassignCollaborator'])->name('specimens.unassign-collaborator');
    Route::get('my-assignments', [MyAssignmentController::class, 'index'])->name('my-assignments.index');
    Route::post('specimen-groups', [SpecimenGroupController::class, 'store'])->name('specimen-groups.store');
    Route::post('specimen-groups/{group}/add-specimens', [SpecimenGroupController::class, 'addSpecimens'])->name('specimen-groups.add-specimens');
    Route::get('specimen-groups/search', [SpecimenGroupController::class, 'search'])->name('specimen-groups.search');
    Route::get('specimen-groups/{group}/details', [SpecimenGroupController::class, 'details'])->name('specimen-groups.details');
    Route::get('specimen-groups/{group}/customer-info', [SpecimenGroupController::class, 'customerInfo'])->name('specimen-groups.customer-info');
    Route::put('specimen-groups/{group}/customer', [SpecimenGroupController::class, 'updateCustomer'])->name('specimen-groups.update-customer');

    // Specimen Report Editor routes
    Route::get('specimens/templates/available', [ReportEditorController::class, 'getAvailableTemplates'])->name('specimens.templates.available');
    Route::get('specimens/{specimen:sequence_code}/report-editor', [ReportEditorController::class, 'show'])->name('specimens.report-editor');
    Route::post('specimens/{specimen:sequence_code}/report-editor', [ReportEditorController::class, 'store'])->name('specimens.report-editor.store');
    Route::post('specimens/{specimen:sequence_code}/report-editor/save', [ReportEditorController::class, 'save'])->name('specimens.report-editor.save');
    Route::post('specimens/{specimen:sequence_code}/report-editor/update-date', [ReportEditorController::class, 'updateDate'])->name('specimens.report-editor.update-date');
    Route::post('specimens/{specimen:sequence_code}/report-editor/apply-template', [ReportEditorController::class, 'applyTemplate'])->name('specimens.report-editor.apply-template');
    Route::post('specimens/{specimen:sequence_code}/report-editor/transition-state', [ReportEditorController::class, 'transitionState'])->name('specimens.report-editor.transition-state');

    Route::post('specimens/{specimen:sequence_code}/report-editor/generate-temp-pdf', [ReportEditorController::class, 'generateTempPdf'])->name('specimens.report-editor.generate-temp-pdf');
    Route::post('specimens/{specimen:sequence_code}/report-editor/upload-image', [ReportEditorController::class, 'uploadImage'])->name('specimens.report-editor.upload-image');
    Route::post('specimens/{specimen:sequence_code}/report-editor/update-products', [ReportEditorController::class, 'updateProducts'])->name('specimens.report-editor.update-products');
    Route::get('specimens/{specimen:sequence_code}/report-editor/pdf', [ReportEditorController::class, 'downloadPdf'])->name('specimens.report-editor.pdf');

    // Specimen Cutting routes
    Route::put('cuttings/bulk-update', [CuttingController::class, 'bulkUpdate'])->name('cuttings.bulk-update');
    Route::delete('cuttings/bulk-delete', [CuttingController::class, 'bulkDestroy'])->name('cuttings.bulk-delete');
    Route::post('specimens/{specimen:sequence_code}/cuttings', [CuttingController::class, 'store'])->name('cuttings.store');
    Route::put('cuttings/{cutting}', [CuttingController::class, 'update'])->name('cuttings.update');
    Route::put('cuttings/{cutting}/status', [CuttingController::class, 'updateStatus'])->name('cuttings.update-status');
    Route::delete('cuttings/{cutting}', [CuttingController::class, 'destroy'])->name('cuttings.destroy');
    Route::resource('cutting-codes', CuttingCodeController::class);
    Route::resource('cutting-prefixes', CuttingPrefixController::class);
    Route::post('specimens/{specimen:sequence_code}/generate-report', [SpecimenController::class, 'generateReport'])->name('specimens.generate-report');
    Route::get('specimens/quick-edit-metadata', [SpecimenController::class, 'quickEditMetadata'])->name('specimens.quick-edit-metadata');
    Route::post('specimens/{specimen}/quick-update', [SpecimenController::class, 'quickUpdate'])->name('specimens.quick-update');
    Route::resource('specimens', SpecimenController::class);
    Route::get('invoices/export', [InvoiceController::class, 'export'])->name('invoices.export');
    Route::get('invoices/{invoice}/audit-history', [InvoiceController::class, 'auditHistory'])->name('invoices.audit-history');
    Route::post('invoices/{invoice}/restore-audit-change', [InvoiceController::class, 'restoreAuditChange'])->name('invoices.restore-audit-change');
    Route::resource('invoices', InvoiceController::class)->only(['index', 'update']);
    Route::get('reports/credit-group/export', [CreditGroupReportController::class, 'export'])->name('reports.credit-group.export');
    Route::get('reports/credit-group', [CreditGroupReportController::class, 'index'])->name('reports.credit-group.index');
    Route::get('reports/cuttings/export', [CuttingsReportController::class, 'export'])->name('reports.cuttings.export');
    Route::get('reports/cuttings', [CuttingsReportController::class, 'index'])->name('reports.cuttings.index');
    Route::get('reports/billing-summary/export', [BillingSummaryReportController::class, 'export'])->name('reports.billing-summary.export');
    Route::get('reports/billing-summary', [BillingSummaryReportController::class, 'index'])->name('reports.billing-summary.index');
    Route::get('reports/delivery/export', [DeliveryReportController::class, 'export'])->name('reports.delivery.export');
    Route::get('reports/delivery', [DeliveryReportController::class, 'index'])->name('reports.delivery.index');
    Route::get('credits/export', [CreditController::class, 'export'])->name('credits.export');
    Route::resource('credits', CreditController::class)->only(['index', 'update']);
    Route::post('credits/{credit}/pay', [CreditController::class, 'pay'])->name('credits.pay');
    Route::post('credits/{credit}/pay-final', [CreditController::class, 'payFinal'])->name('credits.pay-final');
    Route::post('credits/{credit}/mark-as-paid', [CreditController::class, 'markAsPaid'])->name('credits.mark-as-paid');
    Route::post('credits/{credit}/extract-specimens', [CreditController::class, 'extractSpecimens'])->name('credits.extract-specimens');

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
    Route::put('work-order-records/{work_order}', [WorkOrderController::class, 'update'])->name('work-order-records.update');
    Route::delete('work-order-records/{work_order}', [WorkOrderController::class, 'destroy'])->name('work-order-records.destroy');
    Route::get('admin-work-orders', [WorkOrderController::class, 'index'])->name('admin-work-orders.index');
    Route::get('my-work-orders', [MyWorkOrderController::class, 'index'])->name('my-work-orders.index');
    Route::put('my-work-orders/{work_order}/status', [MyWorkOrderController::class, 'updateStatus'])->name('my-work-orders.update-status');

    // Histotechnologist Work Orders Control routes
    Route::get('histotechnologist-work-orders', [HistotechnologistWorkOrderController::class, 'index'])->name('histotechnologist-work-orders.index');
    Route::post('histotechnologist-work-orders/{work_order}/users', [HistotechnologistWorkOrderController::class, 'assignTechnician'])->name('histotechnologist-work-orders.assign');
    Route::delete('histotechnologist-work-orders/{work_order}/users/{user}', [HistotechnologistWorkOrderController::class, 'unassignTechnician'])->name('histotechnologist-work-orders.unassign');
    Route::put('histotechnologist-work-orders/{work_order}/status', [HistotechnologistWorkOrderController::class, 'updateStatus'])->name('histotechnologist-work-orders.update-status');
    Route::get('referrers/{referrer}/specimens', [ReferrerController::class, 'specimens'])->name('referrers.specimens');
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
