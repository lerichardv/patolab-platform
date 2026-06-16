<?php

namespace App\Http\Controllers;

use App\Models\SpecimenType;
use App\Models\SpecimenTypeTemplate;
use App\Services\ImageOptimizerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

use Illuminate\Support\Facades\Gate;

class SpecimenTypeTemplateController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('specimens.manage');
        $query = SpecimenTypeTemplate::query()->with('specimenType')->orderBy('created_at', 'desc');

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->whereHas('specimenType', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }

        $templates = $query->paginate(10)->withQueryString();

        $specimenTypes = SpecimenType::where('active', true)
            ->orderBy('name')
            ->get()
            ->map(function ($type) {
                return [
                    'id' => $type->id,
                    'name' => $type->name,
                    'has_template' => SpecimenTypeTemplate::where('specimen_type_id', $type->id)->exists(),
                ];
            });

        return Inertia::render('specimen-type-templates/index', [
            'templates' => $templates,
            'specimenTypes' => $specimenTypes,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('specimens.manage');
        $validated = $request->validate([
            'specimen_type_id' => 'required|exists:specimen_type,id|unique:specimen_type_templates,specimen_type_id',
            'diagnosis_html' => 'nullable|string',
            'macroscopy_html' => 'nullable|string',
            'microscopy_html' => 'nullable|string',
        ]);

        SpecimenTypeTemplate::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, SpecimenTypeTemplate $specimenTypeTemplate)
    {
        Gate::authorize('specimens.manage');
        $validated = $request->validate([
            'specimen_type_id' => 'required|exists:specimen_type,id|unique:specimen_type_templates,specimen_type_id,'.$specimenTypeTemplate->id,
            'diagnosis_html' => 'nullable|string',
            'macroscopy_html' => 'nullable|string',
            'microscopy_html' => 'nullable|string',
        ]);

        $specimenTypeTemplate->update($validated);

        return redirect()->back();
    }

    public function destroy(SpecimenTypeTemplate $specimenTypeTemplate)
    {
        Gate::authorize('specimens.manage');
        $specimenTypeTemplate->delete();

        return redirect()->back();
    }

    public function uploadImage(Request $request)
    {
        Gate::authorize('specimens.manage');
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
