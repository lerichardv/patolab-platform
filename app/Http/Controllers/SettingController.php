<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingController extends Controller
{
    public function index()
    {
        $settings = Setting::all()->pluck('setting_value', 'setting_key');

        return Inertia::render('system-settings/index', [
            'settings' => $settings,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'third_age_discount' => 'required|numeric|min:0|max:100',
            'fourth_age_discount' => 'required|numeric|min:0|max:100',
        ]);

        foreach ($validated as $key => $value) {
            Setting::where('setting_key', $key)->update([
                'setting_value' => (string) $value,
            ]);
        }

        return redirect()->back();
    }
}
