<?php

namespace App\Http\Controllers;

use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use App\Models\UserCommissionRule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class UserCommissionRuleController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('user_commission_rules.view');

        $query = UserCommissionRule::query()
            ->with(['user', 'specimenType', 'specimenTypeExamination']);

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($uq) use ($search) {
                    $uq->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                })
                    ->orWhereHas('specimenType', function ($stq) use ($search) {
                        $stq->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('specimenTypeExamination', function ($steq) use ($search) {
                        $steq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        // Apply filters
        if ($request->filled('user_id')) {
            $query->where('user_commission_rules.user_id', $request->get('user_id'));
        }
        if ($request->filled('specimen_type_id')) {
            $query->where('user_commission_rules.specimen_type_id', $request->get('specimen_type_id'));
        }
        if ($request->filled('specimen_type_examination_id')) {
            $query->where('user_commission_rules.specimen_type_examination_id', $request->get('specimen_type_examination_id'));
        }

        // Apply sorting
        $sortField = $request->get('sort_field');
        $sortDirection = $request->get('sort_direction', 'desc');
        if (! in_array($sortDirection, ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }

        if ($sortField === 'name') {
            $query->join('users', 'user_commission_rules.user_id', '=', 'users.id')
                ->select('user_commission_rules.*')
                ->orderBy('users.name', $sortDirection);
        } elseif ($sortField === 'specimen_type') {
            $query->join('specimen_type', 'user_commission_rules.specimen_type_id', '=', 'specimen_type.id')
                ->select('user_commission_rules.*')
                ->orderBy('specimen_type.name', $sortDirection);
        } elseif ($sortField === 'examination') {
            $query->join('specimen_type_examination', 'user_commission_rules.specimen_type_examination_id', '=', 'specimen_type_examination.id')
                ->select('user_commission_rules.*')
                ->orderBy('specimen_type_examination.name', $sortDirection);
        } else {
            $query->orderBy('user_commission_rules.id', 'desc');
        }

        $rules = $query->paginate(10)->withQueryString();

        // Fetch active options for form sheets
        $users = User::where('active', true)->orderBy('name')->get();
        $specimenTypes = SpecimenType::where('active', true)->orderBy('name')->get();
        $examinations = SpecimenTypeExamination::where('active', true)->orderBy('name')->get();

        return Inertia::render('user-commission-rules/index', [
            'rules' => $rules,
            'users' => $users,
            'specimenTypes' => $specimenTypes,
            'examinations' => $examinations,
            'filters' => $request->only(['search', 'user_id', 'specimen_type_id', 'specimen_type_examination_id', 'sort_field', 'sort_direction']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('user_commission_rules.create');

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'specimen_type_ids' => 'required|array|min:1',
            'specimen_type_ids.*' => 'exists:specimen_type,id',
            'specimen_type_examination_ids' => 'required|array|min:1',
            'specimen_type_examination_ids.*' => 'exists:specimen_type_examination,id',
            'macroscopy_commission_enabled' => 'required|boolean',
            'macroscopy_calculation_type' => 'required_if:macroscopy_commission_enabled,true|nullable|in:fixed,percentage',
            'macroscopy_commission_value' => 'required_if:macroscopy_commission_enabled,true|numeric|min:0',
            'microscopy_commission_enabled' => 'required|boolean',
            'microscopy_calculation_type' => 'required_if:microscopy_commission_enabled,true|nullable|in:fixed,percentage',
            'microscopy_commission_value' => 'required_if:microscopy_commission_enabled,true|numeric|min:0',
        ]);

        // Clean values if disabled
        if (! $validated['macroscopy_commission_enabled']) {
            $validated['macroscopy_calculation_type'] = null;
            $validated['macroscopy_commission_value'] = 0.00;
        }
        if (! $validated['microscopy_commission_enabled']) {
            $validated['microscopy_calculation_type'] = null;
            $validated['microscopy_commission_value'] = 0.00;
        }

        // Retrieve examinations that belong to the selected specimen types
        $examinations = SpecimenTypeExamination::whereIn('id', $validated['specimen_type_examination_ids'])
            ->whereIn('specimen_type', $validated['specimen_type_ids'])
            ->get();

        if ($examinations->isEmpty()) {
            return redirect()->back()->withErrors([
                'specimen_type_examination_ids' => 'Ninguno de los exámenes seleccionados pertenece a los tipos de muestra seleccionados.',
            ]);
        }

        $createdCount = 0;

        foreach ($examinations as $exam) {
            // Verify uniqueness for this combination
            $exists = UserCommissionRule::where('user_id', $validated['user_id'])
                ->where('specimen_type_id', $exam->specimen_type)
                ->where('specimen_type_examination_id', $exam->id)
                ->exists();

            if ($exists) {
                continue;
            }

            UserCommissionRule::create([
                'user_id' => $validated['user_id'],
                'specimen_type_id' => $exam->specimen_type,
                'specimen_type_examination_id' => $exam->id,
                'macroscopy_commission_enabled' => $validated['macroscopy_commission_enabled'],
                'macroscopy_calculation_type' => $validated['macroscopy_calculation_type'],
                'macroscopy_commission_value' => $validated['macroscopy_commission_value'],
                'microscopy_commission_enabled' => $validated['microscopy_commission_enabled'],
                'microscopy_calculation_type' => $validated['microscopy_calculation_type'],
                'microscopy_commission_value' => $validated['microscopy_commission_value'],
            ]);

            $createdCount++;
        }

        if ($createdCount === 0) {
            return redirect()->back()->withErrors([
                'user_id' => 'Ya existen reglas de comisión para todas las combinaciones de tipo de muestra y examen seleccionadas.',
            ]);
        }

        return redirect()->back();
    }

    public function update(Request $request, UserCommissionRule $userCommissionRule)
    {
        Gate::authorize('user_commission_rules.edit');

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'specimen_type_id' => 'required|exists:specimen_type,id',
            'specimen_type_examination_id' => 'required|exists:specimen_type_examination,id',
            'macroscopy_commission_enabled' => 'required|boolean',
            'macroscopy_calculation_type' => 'required_if:macroscopy_commission_enabled,true|nullable|in:fixed,percentage',
            'macroscopy_commission_value' => 'required_if:macroscopy_commission_enabled,true|numeric|min:0',
            'microscopy_commission_enabled' => 'required|boolean',
            'microscopy_calculation_type' => 'required_if:microscopy_commission_enabled,true|nullable|in:fixed,percentage',
            'microscopy_commission_value' => 'required_if:microscopy_commission_enabled,true|numeric|min:0',
        ]);

        // Verify uniqueness (excluding self)
        $exists = UserCommissionRule::where('user_id', $validated['user_id'])
            ->where('specimen_type_id', $validated['specimen_type_id'])
            ->where('specimen_type_examination_id', $validated['specimen_type_examination_id'])
            ->where('id', '!=', $userCommissionRule->id)
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors([
                'user_id' => 'Ya existe otra regla de comisión para este usuario, tipo de muestra y examen.',
            ]);
        }

        // Clean values if disabled
        if (! $validated['macroscopy_commission_enabled']) {
            $validated['macroscopy_calculation_type'] = null;
            $validated['macroscopy_commission_value'] = 0.00;
        }
        if (! $validated['microscopy_commission_enabled']) {
            $validated['microscopy_calculation_type'] = null;
            $validated['microscopy_commission_value'] = 0.00;
        }

        $userCommissionRule->update($validated);

        return redirect()->back();
    }

    public function destroy(UserCommissionRule $userCommissionRule)
    {
        Gate::authorize('user_commission_rules.delete');

        $userCommissionRule->delete();

        return redirect()->back();
    }
}
