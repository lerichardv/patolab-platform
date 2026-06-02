<?php

use App\Http\Controllers\CustomerController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::get('specimen/{specimen_code}', [\App\Http\Controllers\SpecimenController::class, 'showPublic'])->name('specimens.show-public');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        $specimensCount = \App\Models\Specimen::where('active', true)->count();
        $moneyMadeToday = \App\Models\Invoice::whereDate('created_at', \Carbon\Carbon::today())->sum('total');
        $customersCount = \App\Models\Customer::where('active', true)->count();

        $startOfWeek = \Carbon\Carbon::now()->startOfWeek();
        $endOfWeek = \Carbon\Carbon::now()->endOfWeek();

        $specimensThisWeekCount = \App\Models\Specimen::where('active', true)
            ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
            ->count();

        // Get specimens created this week, grouped by date
        $specimensThisWeek = \App\Models\Specimen::where('active', true)
            ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->pluck('count', 'date');

        // Get invoices created this week, grouped by date
        $invoicesThisWeek = \App\Models\Invoice::whereBetween('created_at', [$startOfWeek, $endOfWeek])
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
                'count' => (int)($specimensThisWeek[$dateStr] ?? 0),
                'earnings' => (float)($invoicesThisWeek[$dateStr] ?? 0),
            ];
        }

        $todaySpecimens = \App\Models\Specimen::where('active', true)
            ->whereDate('created_at', \Carbon\Carbon::today())
            ->with(['customerRelation', 'type', 'examination', 'priority', 'invoiceRelation'])
            ->orderBy('created_at', 'desc')
            ->get();

        return inertia('dashboard', [
            'specimensCount' => $specimensCount,
            'specimensThisWeekCount' => $specimensThisWeekCount,
            'moneyMadeToday' => (float)$moneyMadeToday,
            'customersCount' => $customersCount,
            'specimensWeeklyData' => $weeklyData,
            'todaySpecimens' => $todaySpecimens,
        ]);
    })->name('dashboard');
    Route::inertia('test-page', 'test-page')->name('test-page');
    Route::get('customers/export', [CustomerController::class, 'export'])->name('customers.export');
    Route::resource('customers', CustomerController::class);

    Route::get('departments', function () {
        return response()->json(\App\Models\Department::orderBy('name')->get());
    })->name('departments.index');

    Route::get('departments/{department}/municipalities', function (\App\Models\Department $department) {
        return response()->json($department->municipalities()->orderBy('name')->get());
    })->name('departments.municipalities.index');
    Route::resource('users', UserController::class);
    Route::resource('roles', \App\Http\Controllers\RoleController::class);
    Route::post('specimens/update-order', [\App\Http\Controllers\SpecimenController::class, 'updateOrder'])->name('specimens.update-order');
    Route::post('specimens/bulk-action', [\App\Http\Controllers\SpecimenController::class, 'bulkAction'])->name('specimens.bulk-action');
    Route::post('specimens/{specimen}/assign-user', [\App\Http\Controllers\SpecimenController::class, 'assignUser'])->name('specimens.assign-user');
    Route::post('specimens/{specimen}/unassign-user', [\App\Http\Controllers\SpecimenController::class, 'unassignUser'])->name('specimens.unassign-user');
    Route::get('my-assignments', [\App\Http\Controllers\MyAssignmentController::class, 'index'])->name('my-assignments.index');
    Route::post('specimen-groups', [\App\Http\Controllers\SpecimenGroupController::class, 'store'])->name('specimen-groups.store');
    Route::resource('specimens', \App\Http\Controllers\SpecimenController::class);
    Route::get('invoices/export', [\App\Http\Controllers\InvoiceController::class, 'export'])->name('invoices.export');
    Route::resource('invoices', \App\Http\Controllers\InvoiceController::class)->only(['index', 'update']);
    Route::get('credits/export', [\App\Http\Controllers\CreditController::class, 'export'])->name('credits.export');
    Route::resource('credits', \App\Http\Controllers\CreditController::class)->only(['index']);
    Route::post('credits/{credit}/pay', [\App\Http\Controllers\CreditController::class, 'pay'])->name('credits.pay');
    Route::resource('specimen-categories', \App\Http\Controllers\SpecimenCategoryController::class);
    Route::resource('specimen-types', \App\Http\Controllers\SpecimenTypeController::class);
    Route::resource('specimen-type-examinations', \App\Http\Controllers\SpecimenTypeExaminationController::class);
    Route::resource('referrers', \App\Http\Controllers\ReferrerController::class);
    Route::resource('referrer-types', \App\Http\Controllers\ReferrerTypeController::class);
    Route::resource('locations', \App\Http\Controllers\LocationController::class);
    Route::resource('cai-ranges', \App\Http\Controllers\CaiRangeController::class);
    Route::resource('sequences', \App\Http\Controllers\SequenceController::class);
    Route::resource('storages', \App\Http\Controllers\StorageController::class);
    Route::resource('products', \App\Http\Controllers\ProductController::class);
    Route::post('inventories/abastecer', [\App\Http\Controllers\InventoryController::class, 'abastecer'])->name('inventories.abastecer');
    Route::resource('inventories', \App\Http\Controllers\InventoryController::class);
    Route::get('inventory-movements', [\App\Http\Controllers\InventoryMovementController::class, 'index'])->name('inventory-movements.index');

    Route::get('settings/system', [\App\Http\Controllers\SettingController::class, 'index'])->name('settings.system.index');
    Route::put('settings/system', [\App\Http\Controllers\SettingController::class, 'update'])->name('settings.system.update');
});

require __DIR__.'/settings.php';
