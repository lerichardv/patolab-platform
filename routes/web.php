<?php

use App\Http\Controllers\CaiRangeController;
use App\Http\Controllers\CreditController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\Editor\ReportEditorController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\InventoryMovementController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\MyAssignmentController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReferrerController;
use App\Http\Controllers\ReferrerTypeController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SequenceController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\SpecimenCategoryController;
use App\Http\Controllers\SpecimenController;
use App\Http\Controllers\SpecimenGroupController;
use App\Http\Controllers\SpecimenTypeController;
use App\Http\Controllers\SpecimenTypeExaminationController;
use App\Http\Controllers\StorageController;
use App\Http\Controllers\UserController;
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
    Route::inertia('test-page', 'test-page')->name('test-page');
    Route::get('customers/export', [CustomerController::class, 'export'])->name('customers.export');
    Route::resource('customers', CustomerController::class);

    Route::get('departments', function () {
        return response()->json(Department::orderBy('name')->get());
    })->name('departments.index');

    Route::get('departments/{department}/municipalities', function (Department $department) {
        return response()->json($department->municipalities()->orderBy('name')->get());
    })->name('departments.municipalities.index');
    Route::resource('users', UserController::class);
    Route::resource('roles', RoleController::class);
    Route::post('specimens/update-order', [SpecimenController::class, 'updateOrder'])->name('specimens.update-order');
    Route::post('specimens/bulk-action', [SpecimenController::class, 'bulkAction'])->name('specimens.bulk-action');
    Route::post('specimens/{specimen}/assign-user', [SpecimenController::class, 'assignUser'])->name('specimens.assign-user');
    Route::post('specimens/{specimen}/unassign-user', [SpecimenController::class, 'unassignUser'])->name('specimens.unassign-user');
    Route::get('my-assignments', [MyAssignmentController::class, 'index'])->name('my-assignments.index');
    Route::post('specimen-groups', [SpecimenGroupController::class, 'store'])->name('specimen-groups.store');

    // Specimen Report Editor routes
    Route::get('specimens/{specimen:sequence_code}/report-editor', [ReportEditorController::class, 'show'])->name('specimens.report-editor');
    Route::post('specimens/{specimen:sequence_code}/report-editor', [ReportEditorController::class, 'store'])->name('specimens.report-editor.store');
    Route::post('specimens/{specimen:sequence_code}/report-editor/save', [ReportEditorController::class, 'save'])->name('specimens.report-editor.save');
    Route::post('specimens/{specimen:sequence_code}/report-editor/update-date', [ReportEditorController::class, 'updateDate'])->name('specimens.report-editor.update-date');
    Route::post('specimens/{specimen:sequence_code}/report-editor/transition-state', [ReportEditorController::class, 'transitionState'])->name('specimens.report-editor.transition-state');
    Route::post('specimens/{specimen:sequence_code}/report-editor/upload-image', [ReportEditorController::class, 'uploadImage'])->name('specimens.report-editor.upload-image');
    Route::get('specimens/{specimen:sequence_code}/report-editor/pdf', [ReportEditorController::class, 'downloadPdf'])->name('specimens.report-editor.pdf');

    Route::resource('specimens', SpecimenController::class);
    Route::get('invoices/export', [InvoiceController::class, 'export'])->name('invoices.export');
    Route::resource('invoices', InvoiceController::class)->only(['index', 'update']);
    Route::get('credits/export', [CreditController::class, 'export'])->name('credits.export');
    Route::resource('credits', CreditController::class)->only(['index']);
    Route::post('credits/{credit}/pay', [CreditController::class, 'pay'])->name('credits.pay');
    Route::resource('specimen-categories', SpecimenCategoryController::class);
    Route::resource('specimen-types', SpecimenTypeController::class);
    Route::resource('specimen-type-examinations', SpecimenTypeExaminationController::class);
    Route::resource('referrers', ReferrerController::class);
    Route::resource('referrer-types', ReferrerTypeController::class);
    Route::resource('locations', LocationController::class);
    Route::resource('cai-ranges', CaiRangeController::class);
    Route::resource('sequences', SequenceController::class);
    Route::resource('storages', StorageController::class);
    Route::resource('products', ProductController::class);
    Route::post('inventories/abastecer', [InventoryController::class, 'abastecer'])->name('inventories.abastecer');
    Route::resource('inventories', InventoryController::class);
    Route::get('inventory-movements', [InventoryMovementController::class, 'index'])->name('inventory-movements.index');

    Route::get('settings/system', [SettingController::class, 'index'])->name('settings.system.index');
    Route::put('settings/system', [SettingController::class, 'update'])->name('settings.system.update');
});

require __DIR__.'/settings.php';
