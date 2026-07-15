<?php

namespace App\Http\Controllers;

use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\SpecimenTypeTemplate;
use App\Models\User;
use App\Models\UserTemplatePermission;
use App\Services\ImageOptimizerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class MySpecimenTypeTemplateController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('my_specimen_type_templates.view');

        $sharedTemplateIds = UserTemplatePermission::where('shared_with_id', Auth::id())
            ->pluck('template_id');

        $query = SpecimenTypeTemplate::query()
            ->with(['specimenType', 'specimenTypeExamination', 'user'])
            ->where(function ($q) use ($sharedTemplateIds) {
                $q->where('user_id', Auth::id())
                    ->orWhereIn('id', $sharedTemplateIds);
            })
            ->orderBy('created_at', 'desc');

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->whereHas('specimenType', function ($q2) use ($search) {
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
            ->where('id', '!=', Auth::id())
            ->orderBy('name')
            ->get();

        $examinations = SpecimenTypeExamination::where('active', true)
            ->orderBy('name')
            ->get();

        $sharedPermissions = UserTemplatePermission::with(['specimenType', 'specimenTypeExamination', 'sharedWith'])
            ->where('owner_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('my-specimen-type-templates/index', [
            'templates' => $templates,
            'specimenTypes' => $specimenTypes,
            'users' => $users,
            'examinations' => $examinations,
            'sharedPermissions' => $sharedPermissions,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('my_specimen_type_templates.manage');

        $userId = Auth::id();

        $validated = $request->validate([
            'specimen_type_ids' => 'required|array|min:1',
            'specimen_type_ids.*' => 'exists:specimen_type,id',
            'specimen_type_examination_ids' => 'required|array|min:1',
            'specimen_type_examination_ids.*' => 'exists:specimen_type_examination,id',
            'clinical_details_html' => 'nullable|string',
            'diagnosis_html' => 'nullable|string',
            'macroscopy_html' => 'nullable|string',
            'microscopy_html' => 'nullable|string',
            'comments_notes_html' => 'nullable|string',
            'protocols_html' => 'nullable|string',
            'legend_html' => 'nullable|string',
            'sections_order' => 'nullable|array',
            'sections_order.*.key' => 'required|string',
            'sections_order.*.order' => 'required|integer',
            'sections_order.*.active' => 'required|boolean',
            'headings_toggles' => 'nullable|array',
            'headings_toggles.*' => 'boolean',
        ]);

        $sectionsOrder = $request->input('sections_order', [
            ['key' => 'clinical_details_html', 'order' => 1, 'active' => true],
            ['key' => 'diagnosis_html', 'order' => 2, 'active' => true],
            ['key' => 'macroscopy_html', 'order' => 3, 'active' => true],
            ['key' => 'microscopy_html', 'order' => 4, 'active' => true],
            ['key' => 'comments_notes_html', 'order' => 5, 'active' => true],
            ['key' => 'protocols_html', 'order' => 6, 'active' => true],
            ['key' => 'legend_html', 'order' => 7, 'active' => true],
        ]);

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
            $exists = SpecimenTypeTemplate::where('user_id', $userId)
                ->where('specimen_type_id', $exam->specimen_type)
                ->where('specimen_type_examination_id', $exam->id)
                ->exists();

            if ($exists) {
                continue;
            }

            SpecimenTypeTemplate::create([
                'user_id' => $userId,
                'specimen_type_id' => $exam->specimen_type,
                'specimen_type_examination_id' => $exam->id,
                'clinical_details_html' => $validated['clinical_details_html'] ?? null,
                'diagnosis_html' => $validated['diagnosis_html'] ?? null,
                'macroscopy_html' => $validated['macroscopy_html'] ?? null,
                'microscopy_html' => $validated['microscopy_html'] ?? null,
                'comments_notes_html' => $validated['comments_notes_html'] ?? null,
                'protocols_html' => $validated['protocols_html'] ?? null,
                'legend_html' => $validated['legend_html'] ?? null,
                'sections_order' => $sectionsOrder,
                'headings_toggles' => $validated['headings_toggles'] ?? null,
            ]);

            $createdCount++;
        }

        if ($createdCount === 0) {
            return redirect()->back()->withErrors([
                'specimen_type_examination_ids' => 'Ya existen plantillas para todas las combinaciones de tipo de muestra y examen seleccionadas.',
            ]);
        }

        return redirect()->back();
    }

    public function update(Request $request, SpecimenTypeTemplate $my_specimen_type_template)
    {
        Gate::authorize('my_specimen_type_templates.manage');

        $isOwner = $my_specimen_type_template->user_id === Auth::id();
        $isShared = UserTemplatePermission::where('template_id', $my_specimen_type_template->id)
            ->where('shared_with_id', Auth::id())
            ->exists();

        if (! $isOwner && ! $isShared) {
            abort(403, 'No autorizado para editar esta plantilla.');
        }

        $userId = $my_specimen_type_template->user_id;

        $validated = $request->validate([
            'specimen_type_id' => 'required|exists:specimen_type,id',
            'specimen_type_examination_id' => [
                'required',
                'exists:specimen_type_examination,id',
                Rule::unique('specimen_type_templates')
                    ->where('user_id', $userId)
                    ->where('specimen_type_examination_id', $request->specimen_type_examination_id)
                    ->ignore($my_specimen_type_template->id),
            ],
            'clinical_details_html' => 'nullable|string',
            'diagnosis_html' => 'nullable|string',
            'macroscopy_html' => 'nullable|string',
            'microscopy_html' => 'nullable|string',
            'comments_notes_html' => 'nullable|string',
            'protocols_html' => 'nullable|string',
            'legend_html' => 'nullable|string',
            'sections_order' => 'nullable|array',
            'sections_order.*.key' => 'required|string',
            'sections_order.*.order' => 'required|integer',
            'sections_order.*.active' => 'required|boolean',
            'headings_toggles' => 'nullable|array',
            'headings_toggles.*' => 'boolean',
        ]);

        $validated['user_id'] = $userId;

        $my_specimen_type_template->update($validated);

        return redirect()->back();
    }

    public function destroy(SpecimenTypeTemplate $my_specimen_type_template)
    {
        Gate::authorize('my_specimen_type_templates.manage');

        if ($my_specimen_type_template->user_id !== Auth::id()) {
            abort(403, 'No autorizado para eliminar esta plantilla.');
        }

        $my_specimen_type_template->delete();

        return redirect()->back();
    }

    public function uploadImage(Request $request)
    {
        if (! Gate::allows('my_specimen_type_templates.manage')) {
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

    public function share(Request $request)
    {
        Gate::authorize('my_specimen_type_templates.manage');

        $validated = $request->validate([
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id',
            'specimen_type_ids' => 'required|array|min:1',
            'specimen_type_ids.*' => 'exists:specimen_type,id',
            'specimen_type_examination_ids' => 'required|array|min:1',
            'specimen_type_examination_ids.*' => 'exists:specimen_type_examination,id',
        ]);

        $userId = Auth::id();

        // Retrieve examinations that belong to the selected specimen types
        $examinations = SpecimenTypeExamination::whereIn('id', $validated['specimen_type_examination_ids'])
            ->whereIn('specimen_type', $validated['specimen_type_ids'])
            ->get();

        if ($examinations->isEmpty()) {
            return redirect()->back()->withErrors([
                'specimen_type_examination_ids' => 'Ninguno de los exámenes seleccionados pertenece a los tipos de muestra seleccionados.',
            ]);
        }

        // Find all templates owned by the current user that match the selected combinations
        $templates = SpecimenTypeTemplate::where('user_id', $userId)
            ->where(function ($query) use ($examinations) {
                foreach ($examinations as $exam) {
                    $query->orWhere(function ($q) use ($exam) {
                        $q->where('specimen_type_id', $exam->specimen_type)
                            ->where('specimen_type_examination_id', $exam->id);
                    });
                }
            })
            ->get();

        if ($templates->isEmpty()) {
            return redirect()->back()->withErrors([
                'specimen_type_examination_ids' => 'No tiene plantillas creadas para las combinaciones de tipo de muestra y examen seleccionadas.',
            ]);
        }

        $sharedCount = 0;

        foreach ($templates as $template) {
            foreach ($validated['user_ids'] as $sharedWithId) {
                if ($sharedWithId == $userId) {
                    continue;
                }

                UserTemplatePermission::updateOrCreate(
                    [
                        'owner_id' => $userId,
                        'specimen_type_id' => $template->specimen_type_id,
                        'specimen_type_examination_id' => $template->specimen_type_examination_id,
                        'template_id' => $template->id,
                        'shared_with_id' => $sharedWithId,
                    ]
                );
                $sharedCount++;
            }
        }

        if ($sharedCount === 0) {
            return redirect()->back()->withErrors([
                'user_ids' => 'No se pudo compartir ninguna plantilla.',
            ]);
        }

        return redirect()->back();
    }

    public function revokeShare(UserTemplatePermission $permission)
    {
        Gate::authorize('my_specimen_type_templates.manage');

        if ($permission->owner_id !== Auth::id()) {
            abort(403, 'No autorizado para revocar este permiso.');
        }

        $permission->delete();

        return redirect()->back();
    }

    public function bulkRevokeShare(Request $request)
    {
        Gate::authorize('my_specimen_type_templates.manage');

        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:user_templates_permissions,id',
        ]);

        UserTemplatePermission::whereIn('id', $validated['ids'])
            ->where('owner_id', Auth::id())
            ->delete();

        return redirect()->back();
    }
}
