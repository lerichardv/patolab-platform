<?php

namespace App\Http\Controllers;

use App\Models\InventoryProvider;
use App\Models\InventoryPurchaseOrder;
use App\Models\InventoryPurchaseOrderProduct;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Spatie\Browsershot\Browsershot;

class InventoryPurchaseOrderController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        Gate::authorize('inventory.view');

        $query = InventoryPurchaseOrder::query()
            ->with(['provider', 'requester', 'products.product']);

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhereHas('provider', function ($pq) use ($search) {
                        $pq->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('requester', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->has('status') && $request->get('status') !== 'all') {
            $query->where('status', $request->get('status'));
        }

        $purchaseOrders = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('inventory-purchase-orders/index', [
            'purchaseOrders' => $purchaseOrders,
            'providers' => InventoryProvider::all(),
            'products' => Product::where('active', true)->get(),
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        Gate::authorize('inventory.manage');

        $validated = $request->validate([
            'provider_id' => 'required|exists:inventory_providers,id',
            'date_requested' => 'required|date',
            'date_delivered' => 'nullable|date',
            'status' => 'required|in:pending,received',
            'products' => 'required|array|min:1',
            'products.*.product_id' => 'required|exists:products,id',
            'products.*.specification' => 'required|string|max:255',
            'products.*.quantity' => 'required|integer|min:1',
            'products.*.unit_price' => 'required|numeric|min:0',
        ]);

        $purchaseOrder = null;
        DB::transaction(function () use ($validated, &$purchaseOrder) {
            do {
                $code = bin2hex(random_bytes(4));
            } while (InventoryPurchaseOrder::where('code', $code)->exists());

            $purchaseOrder = InventoryPurchaseOrder::create([
                'code' => $code,
                'provider_id' => $validated['provider_id'],
                'requester_id' => Auth::id(),
                'date_requested' => $validated['date_requested'],
                'date_delivered' => $validated['status'] === 'received' ? ($validated['date_delivered'] ?? now()) : null,
                'status' => $validated['status'],
            ]);

            foreach ($validated['products'] as $productData) {
                InventoryPurchaseOrderProduct::create([
                    'order_id' => $purchaseOrder->id,
                    'product_id' => $productData['product_id'],
                    'specification' => $productData['specification'],
                    'quantity' => $productData['quantity'],
                    'unit_price' => $productData['unit_price'],
                    'total_price' => $productData['quantity'] * $productData['unit_price'],
                ]);
            }
        });

        if ($purchaseOrder) {
            $this->generatePdf($purchaseOrder);
            session()->flash('new_purchase_order_url', asset('storage/'.$purchaseOrder->purchase_order_file));
        }

        return redirect()->back();
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, InventoryPurchaseOrder $inventoryPurchaseOrder)
    {
        Gate::authorize('inventory.manage');

        $validated = $request->validate([
            'provider_id' => 'required|exists:inventory_providers,id',
            'date_requested' => 'required|date',
            'date_delivered' => 'nullable|date',
            'status' => 'required|in:pending,received',
            'products' => 'required|array|min:1',
            'products.*.product_id' => 'required|exists:products,id',
            'products.*.specification' => 'required|string|max:255',
            'products.*.quantity' => 'required|integer|min:1',
            'products.*.unit_price' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($validated, $inventoryPurchaseOrder) {
            $inventoryPurchaseOrder->update([
                'provider_id' => $validated['provider_id'],
                'date_requested' => $validated['date_requested'],
                'date_delivered' => $validated['status'] === 'received' ? ($validated['date_delivered'] ?? now()) : null,
                'status' => $validated['status'],
            ]);

            // Sync products: delete old ones and recreate
            $inventoryPurchaseOrder->products()->delete();

            foreach ($validated['products'] as $productData) {
                InventoryPurchaseOrderProduct::create([
                    'order_id' => $inventoryPurchaseOrder->id,
                    'product_id' => $productData['product_id'],
                    'specification' => $productData['specification'],
                    'quantity' => $productData['quantity'],
                    'unit_price' => $productData['unit_price'],
                    'total_price' => $productData['quantity'] * $productData['unit_price'],
                ]);
            }
        });

        $this->generatePdf($inventoryPurchaseOrder);
        session()->flash('new_purchase_order_url', asset('storage/'.$inventoryPurchaseOrder->purchase_order_file));

        return redirect()->back();
    }

    /**
     * Update the status of the purchase order.
     */
    public function updateStatus(Request $request, InventoryPurchaseOrder $inventoryPurchaseOrder)
    {
        Gate::authorize('inventory.manage');

        $validated = $request->validate([
            'status' => 'required|in:pending,received',
        ]);

        $updateData = [
            'status' => $validated['status'],
        ];

        if ($validated['status'] === 'received') {
            $updateData['date_delivered'] = now();
        } else {
            $updateData['date_delivered'] = null;
        }

        $inventoryPurchaseOrder->update($updateData);

        return redirect()->back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(InventoryPurchaseOrder $inventoryPurchaseOrder)
    {
        Gate::authorize('inventory.manage');

        $inventoryPurchaseOrder->delete();

        return redirect()->back();
    }

    /**
     * Generate PDF for a purchase order using Spatie Browsershot.
     */
    protected function generatePdf(InventoryPurchaseOrder $purchaseOrder)
    {
        try {
            $purchaseOrder->load(['provider', 'products.product']);

            $htmlContent = view('pdf.purchase_order', ['order' => $purchaseOrder])->render();

            if ($purchaseOrder->purchase_order_file && Storage::disk('public')->exists($purchaseOrder->purchase_order_file)) {
                Storage::disk('public')->delete($purchaseOrder->purchase_order_file);
            }

            $filename = 'purchase_order_'.$purchaseOrder->id.'_'.time().'.pdf';
            $pdfPath = 'purchase_orders/'.$filename;

            $browsershot = Browsershot::html($htmlContent);

            if (app()->environment('production')) {
                $browsershot->setIncludePath(env('BROWSERSHOT_INCLUDE_PATH', '$PATH:/usr/local/bin:/usr/bin'))
                    ->setNodeBinary(env('BROWSERSHOT_NODE_BINARY', '/usr/local/bin/node'))
                    ->setNpmBinary(env('BROWSERSHOT_NPM_BINARY', '/usr/local/bin/npm'))
                    ->setChromePath(env('BROWSERSHOT_CHROME_PATH', '/usr/bin/google-chrome-stable'));
            }

            $pdfContent = $browsershot->addChromiumArguments([
                'disable-crash-reporter',
                'disable-dev-shm-usage',
                'no-sandbox',
            ])
                ->noSandbox()
                ->margins(10, 10, 10, 10)
                ->format('A4')
                ->pdf();

            Storage::disk('public')->put($pdfPath, $pdfContent);
            $purchaseOrder->update(['purchase_order_file' => $pdfPath]);
        } catch (\Exception $e) {
            \Log::warning('Error generating purchase order PDF: '.$e->getMessage());
        }
    }
}
