<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile updated.')]);

        return to_route('profile.edit');
    }

    /**
     * Update the user's signature.
     */
    public function updateSignature(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($request->hasFile('signature_file')) {
            $request->validate([
                'signature_file' => 'required|image|mimes:png|max:2048',
            ]);

            if ($user->user_signature) {
                Storage::disk('public')->delete($user->user_signature);
            }

            $path = $request->file('signature_file')->store('signatures', 'public');
            $user->user_signature = $path;
            $user->save();

            Inertia::flash('toast', ['type' => 'success', 'message' => __('Firma actualizada con éxito.')]);
        } elseif ($request->filled('signature_base64')) {
            $request->validate([
                'signature_base64' => 'required|string',
            ]);

            $base64 = $request->input('signature_base64');
            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $type)) {
                $base64 = substr($base64, strpos($base64, ',') + 1);
                $type = strtolower($type[1]);

                if ($type !== 'png') {
                    return back()->withErrors(['signature_base64' => 'La firma debe ser una imagen PNG.']);
                }
            } else {
                return back()->withErrors(['signature_base64' => 'Formato de imagen inválido.']);
            }

            $decodedData = base64_decode($base64);
            if ($decodedData === false) {
                return back()->withErrors(['signature_base64' => 'Los datos de la firma no son válidos.']);
            }

            if ($user->user_signature) {
                Storage::disk('public')->delete($user->user_signature);
            }

            $filename = 'signatures/'.Str::random(40).'.png';
            Storage::disk('public')->put($filename, $decodedData);

            $user->user_signature = $filename;
            $user->save();

            Inertia::flash('toast', ['type' => 'success', 'message' => __('Firma actualizada con éxito.')]);
        } else {
            return back()->withErrors(['signature_file' => 'Por favor proporcione una firma dibujada o un archivo PNG.']);
        }

        return to_route('profile.edit');
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
