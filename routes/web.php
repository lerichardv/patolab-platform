<?php

use App\Http\Controllers\CustomerController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::inertia('test-page', 'test-page')->name('test-page');
    Route::get('customers/export', [CustomerController::class, 'export'])->name('customers.export');
    Route::resource('customers', CustomerController::class);
    Route::resource('users', UserController::class);
    Route::post('specimens/update-order', [\App\Http\Controllers\SpecimenController::class, 'updateOrder'])->name('specimens.update-order');
    Route::resource('specimens', \App\Http\Controllers\SpecimenController::class);
    Route::resource('invoices', \App\Http\Controllers\InvoiceController::class)->only(['index']);
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
    Route::post('inventories/{inventory}/abastecer', [\App\Http\Controllers\InventoryController::class, 'abastecer'])->name('inventories.abastecer');
    Route::resource('inventories', \App\Http\Controllers\InventoryController::class);
    Route::get('inventory-movements', [\App\Http\Controllers\InventoryMovementController::class, 'index'])->name('inventory-movements.index');
});

require __DIR__.'/settings.php';
