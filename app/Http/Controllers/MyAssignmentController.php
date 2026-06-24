<?php

namespace App\Http\Controllers;

use App\Models\Priority;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use Inertia\Inertia;

class MyAssignmentController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        $specimens = $user->specimens()
            ->where('specimen.active', true)
            ->join('priorities', 'specimen.priority_id', '=', 'priorities.id')
            ->select('specimen.*')
            ->orderBy('priorities.order', 'asc')
            ->orderBy('specimen.created_at', 'desc')
            ->with(['priority', 'customerRelation', 'type', 'examination', 'category', 'referrerRelation', 'invoiceRelation.creditRelation', 'invoiceRelation.transferBank', 'users', 'group.invoice.creditRelation', 'group.invoice.transferBank'])
            ->get();

        $priorities = Priority::orderBy('order', 'asc')->get();
        $specimenTypes = SpecimenType::where('active', true)->get();
        $examinations = SpecimenTypeExamination::where('active', true)->get();

        return Inertia::render('my-assignments/index', [
            'specimens' => $specimens,
            'priorities' => $priorities,
            'specimenTypes' => $specimenTypes,
            'examinations' => $examinations,
        ]);
    }
}
