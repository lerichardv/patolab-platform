<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('user can log out via GET request to /logout and is redirected to root', function () {
    $user = User::factory()->create();

    $this->actingAs($user);
    expect(auth()->check())->toBeTrue();

    $response = $this->get('/logout');

    $response->assertRedirect('/');
    expect(auth()->check())->toBeFalse();
});

test('user can log out via POST request to /logout and is redirected to root', function () {
    $user = User::factory()->create();

    $this->actingAs($user);
    expect(auth()->check())->toBeTrue();

    $response = $this->post(route('logout'));

    $response->assertRedirect('/');
    expect(auth()->check())->toBeFalse();
});

test('inertia logout request receives 409 conflict with x-inertia-location pointing to root', function () {
    $user = User::factory()->create();

    $this->actingAs($user);
    expect(auth()->check())->toBeTrue();

    $response = $this->withHeaders([
        'X-Inertia' => 'true',
    ])->post(route('logout'));

    $response->assertStatus(409);
    $response->assertHeader('X-Inertia-Location', '/');
    expect(auth()->check())->toBeFalse();
});
