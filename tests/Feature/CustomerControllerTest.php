<?php

use App\Models\Customer;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);
});

test('customers can be created with duplicate rtn/id_number', function () {
    // Arrange
    Customer::create([
        'name' => 'First Customer',
        'id_number' => '0801-1990-12345',
        'type' => 'cliente',
    ]);

    // Act
    $response = $this->actingAs($this->user)
        ->post(route('customers.store'), [
            'name' => 'Second Customer',
            'id_number' => '0801-1990-12345', // Duplicate
            'type' => 'cliente',
            'phone' => '9999-9999',
            'email' => 'test@example.com',
        ]);

    // Assert
    $response->assertRedirect();
    $this->assertDatabaseCount('customers', 2);
    $customers = Customer::where('id_number', '0801-1990-12345')->get();
    expect($customers)->toHaveCount(2);
});

test('customer can be updated to share rtn/id_number of another customer', function () {
    // Arrange
    $customer1 = Customer::create([
        'name' => 'Customer One',
        'id_number' => '0801-1990-11111',
        'type' => 'cliente',
    ]);

    $customer2 = Customer::create([
        'name' => 'Customer Two',
        'id_number' => '0801-1990-22222',
        'type' => 'cliente',
    ]);

    // Act
    $response = $this->actingAs($this->user)
        ->put(route('customers.update', $customer2->id), [
            'name' => 'Customer Two Updated',
            'id_number' => '0801-1990-11111', // Duplicate of Customer One
            'type' => 'cliente',
            'phone' => '9999-9999',
        ]);

    // Assert
    $response->assertRedirect();
    $customer2->refresh();
    expect($customer2->id_number)->toBe('0801-1990-11111');
});

test('customer can be created with age and age_unit', function () {
    $response = $this->actingAs($this->user)
        ->post(route('customers.store'), [
            'name' => 'Pediatric Patient',
            'id_number' => '0801-2024-00001',
            'type' => 'cliente',
            'age' => 5,
            'age_unit' => 'months',
            'phone' => '8888-8888',
            'email' => 'baby@example.com',
        ]);

    $response->assertRedirect();
    $customer = Customer::where('id_number', '0801-2024-00001')->first();
    expect($customer)->not->toBeNull()
        ->and($customer->age)->toBe(5)
        ->and($customer->age_unit)->toBe('months')
        ->and($customer->formatted_age)->toBe('5 meses');

    $response->assertSessionHas('created_customer', function ($payload) {
        return $payload['age'] === 5 && $payload['age_unit'] === 'months';
    });
});

test('customer age_unit defaults to years when not specified', function () {
    $response = $this->actingAs($this->user)
        ->post(route('customers.store'), [
            'name' => 'Adult Patient',
            'id_number' => '0801-1995-00002',
            'type' => 'cliente',
            'age' => 30,
            'phone' => '8888-8889',
            'email' => 'adult@example.com',
        ]);

    $response->assertRedirect();
    $customer = Customer::where('id_number', '0801-1995-00002')->first();
    expect($customer)->not->toBeNull()
        ->and($customer->age)->toBe(30)
        ->and($customer->age_unit)->toBe('years')
        ->and($customer->formatted_age)->toBe('30 años');
});

test('customer can be updated with different age_unit', function () {
    $customer = Customer::create([
        'name' => 'Infant Patient',
        'id_number' => '0801-2025-00003',
        'type' => 'cliente',
        'age' => 15,
        'age_unit' => 'days',
        'phone' => '8888-8880',
        'email' => 'infant@example.com',
    ]);

    expect($customer->formatted_age)->toBe('15 días');

    $response = $this->actingAs($this->user)
        ->put(route('customers.update', $customer->id), [
            'name' => 'Infant Patient Updated',
            'id_number' => '0801-2025-00003',
            'type' => 'cliente',
            'age' => 1,
            'age_unit' => 'months',
            'phone' => '8888-8880',
            'email' => 'infant@example.com',
        ]);

    $response->assertRedirect();
    $customer->refresh();
    expect($customer->age)->toBe(1)
        ->and($customer->age_unit)->toBe('months')
        ->and($customer->formatted_age)->toBe('1 mes');
});

test('customer validation fails if age_unit is invalid', function () {
    $response = $this->actingAs($this->user)
        ->post(route('customers.store'), [
            'name' => 'Invalid Patient',
            'id_number' => '0801-1990-00004',
            'type' => 'cliente',
            'age' => 10,
            'age_unit' => 'centuries',
            'phone' => '8888-8881',
            'email' => 'invalid@example.com',
        ]);

    $response->assertSessionHasErrors(['age_unit']);
});

test('admin can create customer with portal access and password', function () {
    $response = $this->actingAs($this->user)
        ->post(route('customers.store'), [
            'name' => 'Portal Patient',
            'id_number' => '0801-1990-55555',
            'type' => 'cliente',
            'phone' => '8888-5555',
            'email' => 'portal@example.com',
            'portal_access' => true,
            'password' => 'secret789',
        ]);

    $response->assertRedirect();
    $customer = Customer::where('email', 'portal@example.com')->first();
    expect($customer)->not->toBeNull()
        ->and($customer->portal_access)->toBeTrue()
        ->and(Hash::check('secret789', $customer->password))->toBeTrue();
});

test('admin can update customer portal access and reset password', function () {
    $customer = Customer::create([
        'name' => 'Patient Before Portal',
        'id_number' => '0801-1990-66666',
        'type' => 'cliente',
        'phone' => '8888-6666',
        'email' => 'before@example.com',
        'portal_access' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->put(route('customers.update', $customer->id), [
            'name' => 'Patient After Portal',
            'id_number' => '0801-1990-66666',
            'type' => 'cliente',
            'phone' => '8888-6666',
            'email' => 'before@example.com',
            'portal_access' => true,
            'password' => 'newpassword123',
        ]);

    $response->assertRedirect();
    $customer->refresh();
    expect($customer->portal_access)->toBeTrue()
        ->and(Hash::check('newpassword123', $customer->password))->toBeTrue();
});

test('customer update requires email if portal_access is enabled', function () {
    $customer = Customer::create([
        'name' => 'Patient No Email',
        'id_number' => '0801-1990-77777',
        'type' => 'cliente',
        'phone' => '8888-7777',
        'email' => null,
        'portal_access' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->from(route('customers.index'))
        ->put(route('customers.update', $customer->id), [
            'name' => 'Patient No Email',
            'id_number' => '0801-1990-77777',
            'type' => 'cliente',
            'phone' => '8888-7777',
            'email' => '',
            'portal_access' => true,
        ]);

    $response->assertSessionHasErrors('email');
    $customer->refresh();
    expect($customer->portal_access)->toBeFalse();
});

test('customer without initial email can enable portal_access if email is provided', function () {
    $customer = Customer::create([
        'name' => 'Patient Newly Emailed',
        'id_number' => '0801-1990-88888',
        'type' => 'cliente',
        'phone' => '8888-8888',
        'email' => null,
        'portal_access' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->put(route('customers.update', $customer->id), [
            'name' => 'Patient Newly Emailed',
            'id_number' => '0801-1990-88888',
            'type' => 'cliente',
            'phone' => '8888-8888',
            'email' => 'newpatient@example.com',
            'portal_access' => true,
            'password' => 'secretPass1',
        ]);

    $response->assertRedirect();
    $customer->refresh();
    expect($customer->portal_access)->toBeTrue()
        ->and($customer->email)->toBe('newpatient@example.com');
});

test('user without patients.portal_access permission cannot create customer with portal access', function () {
    $role = Role::create(['slug' => 'assistant', 'name' => 'Assistant']);
    $permCreate = Permission::firstOrCreate(['slug' => 'patients.create'], ['name' => 'Crear Pacientes']);
    $role->permissions()->attach($permCreate);

    $assistantUser = User::factory()->create([
        'role_id' => $role->id,
        'active' => true,
    ]);

    $response = $this->actingAs($assistantUser)
        ->post(route('customers.store'), [
            'name' => 'Patient Unauthorized Portal',
            'id_number' => '0801-1990-99991',
            'type' => 'cliente',
            'phone' => '8888-9991',
            'email' => 'unauth@example.com',
            'portal_access' => true,
        ]);

    $response->assertForbidden();
});

test('user without patients.portal_access permission cannot toggle customer portal access on update', function () {
    $role = Role::create(['slug' => 'assistant2', 'name' => 'Assistant2']);
    $permEdit = Permission::firstOrCreate(['slug' => 'patients.edit'], ['name' => 'Editar Pacientes']);
    $role->permissions()->attach($permEdit);

    $assistantUser = User::factory()->create([
        'role_id' => $role->id,
        'active' => true,
    ]);

    $customer = Customer::create([
        'name' => 'Patient Existing',
        'id_number' => '0801-1990-99992',
        'type' => 'cliente',
        'phone' => '8888-9992',
        'email' => 'existing@example.com',
        'portal_access' => false,
    ]);

    $response = $this->actingAs($assistantUser)
        ->put(route('customers.update', $customer->id), [
            'name' => 'Patient Existing',
            'id_number' => '0801-1990-99992',
            'type' => 'cliente',
            'phone' => '8888-9992',
            'email' => 'existing@example.com',
            'portal_access' => true,
        ]);

    $response->assertForbidden();
});

test('user without patients.portal_access permission can update normal customer fields without altering portal access', function () {
    $role = Role::create(['slug' => 'assistant3', 'name' => 'Assistant3']);
    $permEdit = Permission::firstOrCreate(['slug' => 'patients.edit'], ['name' => 'Editar Pacientes']);
    $role->permissions()->attach($permEdit);

    $assistantUser = User::factory()->create([
        'role_id' => $role->id,
        'active' => true,
    ]);

    $customer = Customer::create([
        'name' => 'Patient Existing Portal Active',
        'id_number' => '0801-1990-99993',
        'type' => 'cliente',
        'phone' => '8888-9993',
        'email' => 'activeportal@example.com',
        'portal_access' => true,
    ]);

    $response = $this->actingAs($assistantUser)
        ->put(route('customers.update', $customer->id), [
            'name' => 'Patient Existing Name Updated',
            'id_number' => '0801-1990-99993',
            'type' => 'cliente',
            'phone' => '9999-0000',
            'email' => 'activeportal@example.com',
            'portal_access' => true,
        ]);

    $response->assertRedirect();
    $customer->refresh();
    expect($customer->name)->toBe('Patient Existing Name Updated')
        ->and($customer->portal_access)->toBeTrue();
});

test('customers index can filter by portal_access', function () {
    $permView = Permission::firstOrCreate(['slug' => 'patients.view'], ['name' => 'Ver Pacientes']);
    $this->adminRole->permissions()->attach($permView);

    $customerWithPortal = Customer::create([
        'name' => 'Customer With Portal',
        'id_number' => '0801-1990-88881',
        'type' => 'cliente',
        'phone' => '8888-8881',
        'email' => 'withportal@example.com',
        'portal_access' => true,
        'active' => true,
    ]);

    $customerWithoutPortal = Customer::create([
        'name' => 'Customer Without Portal',
        'id_number' => '0801-1990-88882',
        'type' => 'cliente',
        'phone' => '8888-8882',
        'email' => 'withoutportal@example.com',
        'portal_access' => false,
        'active' => true,
    ]);

    // Request without filter returns both
    $responseAll = $this->actingAs($this->user)->get(route('customers.index'));
    $responseAll->assertOk();
    $responseAll->assertInertia(fn ($page) => $page
        ->component('customers/index')
        ->has('customers.data', 2)
    );

    // Request with portal_access=true returns only customer with portal
    $responsePortal = $this->actingAs($this->user)->get(route('customers.index', ['portal_access' => 'true']));
    $responsePortal->assertOk();
    $responsePortal->assertInertia(fn ($page) => $page
        ->component('customers/index')
        ->has('customers.data', 1)
        ->where('customers.data.0.id', $customerWithPortal->id)
    );
});

test('customer creation fails if portal_access is enabled and email is already used by another customer', function () {
    Customer::create([
        'name' => 'Existing Customer',
        'id_number' => '0801-1990-11111',
        'type' => 'cliente',
        'phone' => '8888-1111',
        'email' => 'duplicate@example.com',
        'portal_access' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->post(route('customers.store'), [
            'name' => 'New Customer Portal',
            'id_number' => '0801-1990-22222',
            'type' => 'cliente',
            'phone' => '8888-2222',
            'email' => 'duplicate@example.com',
            'portal_access' => true,
        ]);

    $response->assertSessionHasErrors([
        'email' => 'Este correo electrónico ya está siendo utilizado por otro cliente y no puede ser usado para este cliente porque causará conflicto con el acceso al portal.',
    ]);
});

test('customer creation allows duplicate email if portal_access is false', function () {
    Customer::create([
        'name' => 'Existing Customer',
        'id_number' => '0801-1990-11111',
        'type' => 'cliente',
        'phone' => '8888-1111',
        'email' => 'duplicate@example.com',
        'portal_access' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->post(route('customers.store'), [
            'name' => 'New Customer No Portal',
            'id_number' => '0801-1990-22222',
            'type' => 'cliente',
            'phone' => '8888-2222',
            'email' => 'duplicate@example.com',
            'portal_access' => false,
        ]);

    $response->assertRedirect();
    expect(Customer::where('email', 'duplicate@example.com')->count())->toBe(2);
});

test('customer update fails if portal_access is enabled and email is already used by another customer', function () {
    Customer::create([
        'name' => 'Customer A',
        'id_number' => '0801-1990-11111',
        'type' => 'cliente',
        'phone' => '8888-1111',
        'email' => 'shared@example.com',
        'portal_access' => false,
    ]);

    $customerB = Customer::create([
        'name' => 'Customer B',
        'id_number' => '0801-1990-22222',
        'type' => 'cliente',
        'phone' => '8888-2222',
        'email' => 'unique@example.com',
        'portal_access' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->put(route('customers.update', $customerB->id), [
            'name' => 'Customer B',
            'id_number' => '0801-1990-22222',
            'type' => 'cliente',
            'phone' => '8888-2222',
            'email' => 'shared@example.com',
            'portal_access' => true,
        ]);

    $response->assertSessionHasErrors([
        'email' => 'Este correo electrónico ya está siendo utilizado por otro cliente y no puede ser usado para este cliente porque causará conflicto con el acceso al portal.',
    ]);
});

test('customer update succeeds if portal_access is enabled and keeps their own email', function () {
    $customer = Customer::create([
        'name' => 'Customer Own Email',
        'id_number' => '0801-1990-33333',
        'type' => 'cliente',
        'phone' => '8888-3333',
        'email' => 'myown@example.com',
        'portal_access' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->put(route('customers.update', $customer->id), [
            'name' => 'Customer Own Email Updated',
            'id_number' => '0801-1990-33333',
            'type' => 'cliente',
            'phone' => '8888-3333',
            'email' => 'myown@example.com',
            'portal_access' => true,
        ]);

    $response->assertRedirect();
    $customer->refresh();
    expect($customer->portal_access)->toBeTrue();
});

test('check-email endpoint validates email uniqueness properly', function () {
    $permView = Permission::firstOrCreate(['slug' => 'patients.view'], ['name' => 'Ver Pacientes']);
    $this->adminRole->permissions()->attach($permView);

    $customer = Customer::create([
        'name' => 'Existing Person',
        'id_number' => '0801-1990-44444',
        'type' => 'cliente',
        'phone' => '8888-4444',
        'email' => 'checkme@example.com',
    ]);

    // Available email
    $resAvailable = $this->actingAs($this->user)->getJson(route('customers.check-email', ['email' => 'free@example.com']));
    $resAvailable->assertOk()->assertJson(['unique' => true]);

    // Duplicate email
    $resDuplicate = $this->actingAs($this->user)->getJson(route('customers.check-email', ['email' => 'checkme@example.com']));
    $resDuplicate->assertOk()->assertJson(['unique' => false]);

    // Duplicate email but ignoring own customer ID
    $resIgnore = $this->actingAs($this->user)->getJson(route('customers.check-email', ['email' => 'checkme@example.com', 'ignore_id' => $customer->id]));
    $resIgnore->assertOk()->assertJson(['unique' => true]);
});
