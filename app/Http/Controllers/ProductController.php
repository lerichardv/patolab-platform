<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('products.view');

        $query = Product::query()->with('prices')->where('active', true);

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->has('unit') && $request->get('unit') !== 'all') {
            $query->where('unit', $request->get('unit'));
        }

        $products = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('products/index', [
            'products' => $products,
            'filters' => $request->only(['search', 'unit']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('products.create');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'unit' => 'required|in:percentage,miligrams,unit',
            'unit_value' => 'required|numeric',
            'purchase_price' => 'required|numeric',
            'isv' => 'required|boolean',
            'prices' => 'nullable|array',
            'prices.*.amount' => 'required|numeric|min:0',
        ]);

        $validated['code'] = Str::upper(Str::random(8));

        // Ensure uniqueness
        while (Product::where('code', $validated['code'])->exists()) {
            $validated['code'] = Str::upper(Str::random(8));
        }

        $product = Product::create([
            'code' => $validated['code'],
            'name' => $validated['name'],
            'description' => $validated['description'] ?? '',
            'unit' => $validated['unit'],
            'unit_value' => $validated['unit_value'],
            'purchase_price' => $validated['purchase_price'],
            'sale_price' => 0,
            'isv' => $validated['isv'],
        ]);

        if (! empty($validated['prices'])) {
            foreach ($validated['prices'] as $priceData) {
                $product->prices()->create([
                    'amount' => $priceData['amount'],
                ]);
            }
        }

        return redirect()->back();
    }

    public function update(Request $request, Product $product)
    {
        Gate::authorize('products.edit');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'unit' => 'required|in:percentage,miligrams,unit',
            'unit_value' => 'required|numeric',
            'purchase_price' => 'required|numeric',
            'isv' => 'required|boolean',
            'prices' => 'nullable|array',
            'prices.*.id' => 'nullable|integer',
            'prices.*.amount' => 'required|numeric|min:0',
        ]);

        $product->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? '',
            'unit' => $validated['unit'],
            'unit_value' => $validated['unit_value'],
            'purchase_price' => $validated['purchase_price'],
            'isv' => $validated['isv'],
        ]);

        $priceIdsToKeep = [];

        if (isset($validated['prices'])) {
            foreach ($validated['prices'] as $priceData) {
                if (isset($priceData['id'])) {
                    $price = $product->prices()->find($priceData['id']);
                    if ($price) {
                        $price->update(['amount' => $priceData['amount']]);
                        $priceIdsToKeep[] = $price->id;
                    }
                } else {
                    $price = $product->prices()->create(['amount' => $priceData['amount']]);
                    $priceIdsToKeep[] = $price->id;
                }
            }
        }

        $product->prices()->whereNotIn('id', $priceIdsToKeep)->delete();

        return redirect()->back();
    }

    public function destroy(Product $product)
    {
        Gate::authorize('products.delete');

        $product->update(['active' => false]);

        return redirect()->back();
    }
}
