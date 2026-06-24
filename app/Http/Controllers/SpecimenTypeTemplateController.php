<?php

namespace App\Http\Controllers;

use App\Models\SpecimenType;
use App\Models\SpecimenTypeTemplate;
use App\Models\User;
use App\Services\ImageOptimizerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SpecimenTypeTemplateController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('specimen_type_templates.view');
        $query = SpecimenTypeTemplate::query()
            ->with(['specimenType', 'specimenTypeExamination', 'user'])
            ->orderBy('created_at', 'desc');

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->whereHas('specimenType', function ($q2) use ($search) {
                    $q2->where('name', 'like', "%{$search}%");
                })->orWhereHas('user', function ($q2) use ($search) {
                    $q2->where('name', 'like', "%{$search}%");
                })->orWhereHas('specimenTypeExamination', function ($q2) use ($search) {
                    $q2->where('name', 'like', "%{$search}%");
                });
            });
        }

        $templates = $query->paginate(10)->withQueryString();

        $specimenTypes = SpecimenType::where('active', true)
            ->with(['examinations' => function ($q) {
                $q->where('active', true)->orderBy('name');
            }])
            ->orderBy('name')
            ->get()
            ->map(function ($type) {
                return [
                    'id' => $type->id,
                    'name' => $type->name,
                    'examinations' => $type->examinations->map(function ($exam) {
                        return [
                            'id' => $exam->id,
                            'name' => $exam->name,
                        ];
                    })->values(),
                ];
            });

        $users = User::where('active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return Inertia::render('specimen-type-templates/index', [
            'templates' => $templates,
            'specimenTypes' => $specimenTypes,
            'users' => $users,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('specimen_type_templates.create');
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'specimen_type_id' => 'required|exists:specimen_type,id',
            'specimen_type_examination_id' => [
                'required',
                'exists:specimen_type_examination,id',
                Rule::unique('specimen_type_templates')
                    ->where('user_id', $request->user_id)
                    ->where('specimen_type_examination_id', $request->specimen_type_examination_id),
            ],
            'clinical_details_html' => 'nullable|string',
            'diagnosis_html' => 'nullable|string',
            'macroscopy_html' => 'nullable|string',
            'microscopy_html' => 'nullable|string',
            'comments_notes_html' => 'nullable|string',
            'protocols_html' => 'nullable|string',
            'legend_html' => 'nullable|string',
        ]);

        $validated['sections_order'] = [
            ['key' => 'clinical_details_html', 'order' => 1, 'active' => true],
            ['key' => 'diagnosis_html', 'order' => 2, 'active' => true],
            ['key' => 'macroscopy_html', 'order' => 3, 'active' => true],
            ['key' => 'microscopy_html', 'order' => 4, 'active' => true],
            ['key' => 'comments_notes_html', 'order' => 5, 'active' => true],
            ['key' => 'protocols_html', 'order' => 6, 'active' => true],
            ['key' => 'legend_html', 'order' => 7, 'active' => true],
        ];

        SpecimenTypeTemplate::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, SpecimenTypeTemplate $specimenTypeTemplate)
    {
        Gate::authorize('specimen_type_templates.edit');
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'specimen_type_id' => 'required|exists:specimen_type,id',
            'specimen_type_examination_id' => [
                'required',
                'exists:specimen_type_examination,id',
                Rule::unique('specimen_type_templates')
                    ->where('user_id', $request->user_id)
                    ->where('specimen_type_examination_id', $request->specimen_type_examination_id)
                    ->ignore($specimenTypeTemplate->id),
            ],
            'clinical_details_html' => 'nullable|string',
            'diagnosis_html' => 'nullable|string',
            'macroscopy_html' => 'nullable|string',
            'microscopy_html' => 'nullable|string',
            'comments_notes_html' => 'nullable|string',
            'protocols_html' => 'nullable|string',
            'legend_html' => 'nullable|string',
        ]);

        $specimenTypeTemplate->update($validated);

        return redirect()->back();
    }

    public function destroy(SpecimenTypeTemplate $specimenTypeTemplate)
    {
        Gate::authorize('specimen_type_templates.delete');
        $specimenTypeTemplate->delete();

        return redirect()->back();
    }

    public function uploadImage(Request $request)
    {
        if (! Gate::allows('specimen_type_templates.create') && ! Gate::allows('specimen_type_templates.edit')) {
            abort(403);
        }
        $request->validate([
            'image' => 'required|image|max:10240', // 10 MB max
        ]);

        $optimizer = app(ImageOptimizerService::class);
        $path = $optimizer->optimizeAndStore(
            $request->file('image'),
            'template-images',
            'public'
        );

        return response()->json([
            'url' => Storage::disk('public')->url($path),
        ]);
    }
}
