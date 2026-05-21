<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Invoice::with([
            'customer',
            'caiRange',
            'specimen.type',
            'specimen.examination',
            'specimen.category',
            'specimen.referrerRelation',
            'specimen.priority',
            'creditRelation'
        ]);

        // Filter by search query (Invoice number, Customer name or Customer ID/RTN)
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('full_invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('customer', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%")
                         ->orWhere('id_number', 'like', "%{$search}%");
                  });
            });
        }

        // Filter by payment type
        if ($request->has('payment_type') && $request->get('payment_type') !== 'all') {
            $query->where('payment_type', $request->get('payment_type'));
        }

        $invoices = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('invoices/index', [
            'invoices' => $invoices,
            'filters' => $request->only(['search', 'payment_type']),
        ]);
    }
}
