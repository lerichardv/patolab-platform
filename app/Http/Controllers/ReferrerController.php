<?php

namespace App\Http\Controllers;

use App\Models\Referrer;
use App\Models\ReferrerType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReferrerController extends Controller
{
    public function index(Request $request)
    {
        $query = Referrer::query()->with('type')->where('active', true)->orderBy('created_at', 'desc');

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->has('referrer_type')) {
            $query->where('referrer_type', $request->get('referrer_type'));
        }

        return Inertia::render('referrers/index', [
            'referrers' => $query->paginate(10)->withQueryString(),
            'referrerTypes' => ReferrerType::where('active', true)->get(),
            'filters' => $request->only(['search', 'referrer_type']),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'referrer_type' => 'required|exists:referrer_types,id',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        Referrer::create($request->all() + ['active' => true]);

        return redirect()->back();
    }

    public function update(Request $request, Referrer $referrer)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'referrer_type' => 'required|exists:referrer_types,id',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $referrer->update($request->all());

        return redirect()->back();
    }

    public function destroy(Referrer $referrer)
    {
        $referrer->update(['active' => false]);
        return redirect()->back();
    }
}
