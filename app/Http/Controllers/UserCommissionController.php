<?php

namespace App\Http\Controllers;

use App\Models\SpecimenType;
use App\Models\User;
use App\Models\UserCommission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class UserCommissionController extends Controller
{
    /**
     * Display a listing of user commissions.
     */
    public function index(Request $request)
    {
        Gate::authorize('user_commission_rules.view');

        $query = UserCommission::query()
            ->select('user_commissions.*')
            ->leftJoin('specimen', 'user_commissions.specimen_id', '=', 'specimen.id')
            ->leftJoin('users', 'user_commissions.user_id', '=', 'users.id')
            ->with([
                'user',
                'specimen.type',
                'specimen.examination',
                'specimen.customerRelation',
                'specimen.priority',
                'specimen.category',
                'specimen.referrerRelation',
                'specimen.users',
                'specimen.invoiceRelation',
                'specimen.group',
                'rule.specimenType',
                'rule.specimenTypeExamination',
                'createdBy',
                'updatedBy',
                'paidBy',
            ]);

        if ($request->has('search') && $request->filled('search')) {
            $search = trim($request->get('search'));
            $query->where(function ($q) use ($search) {
                $q->where('users.name', 'like', "%{$search}%")
                    ->orWhere('users.email', 'like', "%{$search}%")
                    ->orWhere('specimen.sequence_code', 'like', "%{$search}%");
            });
        }

        if ($request->has('status') && $request->filled('status')) {
            $query->where('user_commissions.status', $request->get('status'));
        }

        if ($request->has('user_id') && $request->filled('user_id')) {
            $query->where('user_commissions.user_id', $request->get('user_id'));
        }

        if ($request->has('specimen_type_id') && $request->filled('specimen_type_id')) {
            $query->where('specimen.specimen_type', $request->get('specimen_type_id'));
        }

        if ($request->has('date_from') && $request->filled('date_from')) {
            $query->whereDate('user_commissions.created_at', '>=', $request->get('date_from'));
        }

        if ($request->has('date_to') && $request->filled('date_to')) {
            $query->whereDate('user_commissions.created_at', '<=', $request->get('date_to'));
        }

        // Apply sorting
        $sortField = $request->get('sort_field');
        $sortDirection = $request->get('sort_direction', 'desc');
        if (! in_array($sortDirection, ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }

        if ($sortField === 'name') {
            $query->orderBy('users.name', $sortDirection);
        } elseif ($sortField === 'specimen') {
            $query->orderBy('specimen.sequence_code', $sortDirection);
        } elseif ($sortField === 'base_amount') {
            $query->orderBy('user_commissions.specimen_base_amount', $sortDirection);
        } elseif ($sortField === 'amount') {
            $query->orderBy('user_commissions.calculated_comission_amount', $sortDirection);
        } elseif ($sortField === 'date') {
            $query->orderBy('user_commissions.created_at', $sortDirection);
        } else {
            $query->orderBy('user_commissions.id', 'desc');
        }

        $commissions = $query->paginate(10)->withQueryString();

        $users = User::where('active', true)->orderBy('name')->get();
        $specimenTypes = SpecimenType::where('active', true)->orderBy('name')->get();

        return Inertia::render('user-commissions/index', [
            'commissions' => $commissions,
            'users' => $users,
            'specimenTypes' => $specimenTypes,
            'filters' => $request->only([
                'search',
                'status',
                'user_id',
                'specimen_type_id',
                'date_from',
                'date_to',
                'sort_field',
                'sort_direction',
            ]),
        ]);
    }

    /**
     * Update the status of a user commission.
     */
    public function update(Request $request, UserCommission $userCommission)
    {
        Gate::authorize('user_commission_rules.edit');

        $validated = $request->validate([
            'status' => 'required|string|in:pending,paid,cancelled',
        ]);

        $data = [
            'status' => $validated['status'],
        ];

        if ($validated['status'] === 'paid') {
            $data['paid_at'] = now();
            $data['paid_by'] = auth()->id();
        } else {
            $data['paid_at'] = null;
            $data['paid_by'] = null;
        }

        $userCommission->update($data);

        return redirect()->back();
    }

    /**
     * Remove the user commission record.
     */
    public function destroy(UserCommission $userCommission)
    {
        Gate::authorize('user_commission_rules.delete');

        $userCommission->delete();

        return redirect()->back();
    }
}
