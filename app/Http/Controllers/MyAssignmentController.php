<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
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
            ->with(['priority', 'customerRelation', 'type', 'examination', 'category', 'referrerRelation', 'invoiceRelation.creditRelation', 'users'])
            ->get();

        $priorities = \App\Models\Priority::orderBy('order', 'asc')->get();

        return Inertia::render('my-assignments/index', [
            'specimens' => $specimens,
            'priorities' => $priorities,
        ]);
    }
}
