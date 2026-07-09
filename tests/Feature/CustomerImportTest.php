<?php

use App\Models\Customer;
use App\Models\Department;
use App\Models\Municipality;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Setup admin user to bypass gates
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    // Setup a department and municipality for resolution tests
    $this->department = Department::create([
        'name' => 'Cortés',
        'code' => '05',
    ]);

    $this->municipality = Municipality::create([
        'department_id' => $this->department->id,
        'name' => 'San Pedro Sula',
        'code' => '0501',
    ]);
});

test('unauthenticated users cannot view or post import endpoints', function () {
    $this->get(route('customers.import-page'))->assertRedirect(route('login'));
    $this->post(route('customers.import-parse'))->assertRedirect(route('login'));
    $this->post(route('customers.import-row'))->assertRedirect(route('login'));
});

test('authenticated admin can view the customer import page', function () {
    $response = $this->actingAs($this->user)->get(route('customers.import-page'));
    $response->assertOk();
});

test('can parse uploaded csv spreadsheet file successfully', function () {
    $csvContent = "Nombre,Identidad/RTN,Tipo,Edad,Género,Teléfono,Estado/Departamento,Ciudad\n"
        ."John Doe,0801-1990-12345,cliente,30,hombre,9999-9999,Cortés,San Pedro Sula\n";

    $file = UploadedFile::fake()->createWithContent('customers.csv', $csvContent);

    $response = $this->actingAs($this->user)
        ->post(route('customers.import-parse'), [
            'file' => $file,
        ]);

    $response->assertOk();
    $response->assertJsonStructure([
        'headers',
        'rows',
    ]);

    $data = $response->json();
    $this->assertEquals(['Nombre', 'Identidad/RTN', 'Tipo', 'Edad', 'Género', 'Teléfono', 'Estado/Departamento', 'Ciudad'], $data['headers']);
    $this->assertCount(1, $data['rows']);
    $this->assertEquals('John Doe', $data['rows'][0][0]);
});

test('can import single row, resolving names to IDs and normalizing data', function () {
    $payload = [
        'name' => 'Jane Smith',
        'id_number' => '0501-1995-54321',
        'type' => 'cliente',
        'age' => 28,
        'gender' => 'femenino',
        'phone' => '8888-8888',
        'state' => 'CORTES', // Case-and-accent insensitive department resolution
        'city' => 'San Pedro Sula', // Municipality resolution
    ];

    $response = $this->actingAs($this->user)
        ->post(route('customers.import-row'), $payload);

    $response->assertOk();
    $response->assertJson([
        'success' => true,
    ]);

    $customer = Customer::where('id_number', '0501-1995-54321')->first();
    $this->assertNotNull($customer);
    $this->assertEquals('Jane Smith', $customer->name);
    $this->assertEquals('Mujer', $customer->gender); // Normalizes 'femenino' to 'Mujer'
    $this->assertEquals($this->department->id, $customer->state); // Resolves name to ID
    $this->assertEquals($this->municipality->id, $customer->city); // Resolves name to ID
});

test('importing row fails when required fields are missing or invalid', function () {
    // Missing required fields: name and id_number
    $payload = [
        'type' => 'cliente',
    ];

    $response = $this->actingAs($this->user)
        ->post(route('customers.import-row'), $payload);

    $response->assertStatus(422);
    $response->assertJson([
        'success' => false,
    ]);
    $response->assertJsonStructure(['errors' => ['name', 'id_number']]);
});
