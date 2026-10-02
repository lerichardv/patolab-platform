<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('profile information can be updated with signature subtext', function () {
    $user = User::factory()->create([
        'signature_subtext' => null,
    ]);

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Dr. Test User',
            'email' => $user->email,
            'signature_subtext' => "ANATOMÍA PATOLÓGICA\nMSC. PATOLOGÍA ONCOLÓGICA",
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->signature_subtext)->toBe("ANATOMÍA PATOLÓGICA\nMSC. PATOLOGÍA ONCOLÓGICA");
});

test('profile information can update signature subtext to empty', function () {
    $user = User::factory()->create([
        'signature_subtext' => "ANATOMÍA PATOLÓGICA\nMSC. PATOLOGÍA ONCOLÓGICA",
    ]);

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Dr. Test User',
            'email' => $user->email,
            'signature_subtext' => '',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->signature_subtext)->toBeNull();
});
