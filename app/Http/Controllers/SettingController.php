<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class SettingController extends Controller
{
    public function index()
    {
        Gate::authorize('settings.view');

        $settings = Setting::all()->mapWithKeys(function ($setting) {
            $value = $setting->has_multiple_values
                ? ($setting->setting_value_multiple ?? [])
                : $setting->setting_value;

            return [$setting->setting_key => $value];
        });

        $roles = Role::orderBy('name')->get();

        return Inertia::render('system-settings/index', [
            'settings' => $settings,
            'roles' => $roles,
        ]);
    }

    public function update(Request $request)
    {
        Gate::authorize('settings.edit');

        $validated = $request->validate([
            'third_age_discount' => 'required|numeric|min:0|max:100',
            'fourth_age_discount' => 'required|numeric|min:0|max:100',
            'pathologist_role_id' => 'required|integer|exists:roles,id',
            'pathologist_technician_role_id' => 'required|array',
            'pathologist_technician_role_id.*' => 'integer|exists:roles,id',
        ]);

        foreach ($validated as $key => $value) {
            $setting = Setting::where('setting_key', $key)->first();
            if ($setting) {
                if ($setting->has_multiple_values) {
                    $setting->update([
                        'setting_value_multiple' => (array) $value,
                    ]);
                } else {
                    $setting->update([
                        'setting_value' => (string) $value,
                    ]);
                }
            }
        }

        return redirect()->back();
    }
}
