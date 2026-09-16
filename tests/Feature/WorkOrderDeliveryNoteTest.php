<?php

use App\Models\Customer;
use App\Models\DeliveryNote;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderTask;
use App\Models\WorkOrderType;
use App\Services\DeliveryNotePdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\mock;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->role = Role::create(['slug' => 'pathologist', 'name' => 'Patólogo']);
    $this->user = User::factory()->create([
        'role_id' => $this->role->id,
        'active' => true,
    ]);

    $this->customer = Customer::factory()->create([
        'name' => 'María Rodriguez',
        'id_number' => '0801-1990-12345',
        'age' => 38,
        'gender' => 'F',
    ]);

    $this->specimenType = SpecimenType::create([
        'name' => 'Biopsia',
    ]);

    $this->category = SpecimenCategory::create([
        'name' => 'Categoría A',
        'quantity' => 1,
    ]);

    $this->referrerType = ReferrerType::create([
        'name' => 'Médico Particular',
    ]);

    $this->referrer = Referrer::create([
        'name' => 'Dr. Carlos Mendoza',
        'referrer_type' => $this->referrerType->id,
        'active' => true,
    ]);

    $this->priority = Priority::create([
        'name' => 'Normal',
        'color' => '#10b981',
        'order' => 1,
        'active' => true,
    ]);

    $this->specimen = Specimen::create([
        'sequence_code' => 'B-042-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'anatomic_site' => 'Piel / Lunar',
        'diagnosis' => 'Nevus melanocítico',
    ]);

    $this->workOrderType = WorkOrderType::create([
        'name' => 'Corte Adicional',
        'duration_value' => 12,
        'duration_unit' => 'hours',
    ]);

    $this->workOrderTask = WorkOrderTask::create([
        'name' => 'Corte seriado',
        'description' => '3 niveles',
        'duration_value' => 12,
        'duration_unit' => 'hours',
    ]);

    $this->workOrder = WorkOrder::create([
        'specimen_id' => $this->specimen->id,
        'work_order_type_id' => [$this->workOrderType->id],
        'work_order_task_id' => $this->workOrderTask->id,
        'created_by_id' => $this->user->id,
        'status' => 'Enviada',
        'priority' => 2,
        'comments' => 'Manejar con cuidado',
    ]);
});

test('unauthenticated users cannot access delivery note routes', function () {
    $this->get(route('work-orders.delivery-note.show', $this->workOrder->id))
        ->assertRedirect(route('login'));

    $this->post(route('work-orders.delivery-note.save', $this->workOrder->id), [
        'content_html' => '<p>Test</p>',
    ])->assertRedirect(route('login'));

    $this->get(route('work-orders.delivery-note.pdf', $this->workOrder->id))
        ->assertRedirect(route('login'));

    $this->post(route('work-orders.delivery-note.upload-image', $this->workOrder->id))
        ->assertRedirect(route('login'));
});

test('it loads delivery note editor and auto-creates note with pre-filled content', function () {
    expect(DeliveryNote::where('work_order_id', $this->workOrder->id)->count())->toBe(0);

    $response = $this->actingAs($this->user)
        ->get(route('work-orders.delivery-note.show', $this->workOrder->id));

    $response->assertSuccessful();

    // Assert that a DeliveryNote record was created
    $deliveryNote = DeliveryNote::where('work_order_id', $this->workOrder->id)->first();
    expect($deliveryNote)->not->toBeNull();
    expect($deliveryNote->content_html)->toContain('ACCESO No. B-042-2026');
    expect($deliveryNote->content_html)->toContain('María Rodriguez');

    // Assert Inertia page
    $response->assertInertia(fn (Assert $page) => $page
        ->component('work-orders/delivery-notes/editor')
        ->has('workOrder')
        ->has('deliveryNote')
        ->where('workOrder.id', $this->workOrder->id)
    );
});

test('it saves updated delivery note content', function () {
    $newContent = '<h2>NOTA ACTUALIZADA</h2><p>Se entregaron 2 bloques y 4 láminas en buen estado.</p>';

    $response = $this->actingAs($this->user)
        ->postJson(route('work-orders.delivery-note.save', $this->workOrder->id), [
            'content_html' => $newContent,
        ]);

    $response->assertSuccessful();
    $response->assertJson([
        'status' => 'success',
    ]);

    $deliveryNote = DeliveryNote::where('work_order_id', $this->workOrder->id)->first();
    expect($deliveryNote->content_html)->toBe($newContent);
});

test('it generates and streams the delivery note pdf', function () {
    $note = DeliveryNote::create([
        'work_order_id' => $this->workOrder->id,
        'specimen_id' => $this->specimen->id,
        'content_html' => '<p>Contenido para PDF</p>',
        'created_by_id' => $this->user->id,
    ]);

    $mockService = mock(DeliveryNotePdfService::class);
    $mockService->shouldReceive('generatePdfContent')
        ->once()
        ->with(Mockery::type(WorkOrder::class))
        ->andReturn('%PDF-1.4 dummy pdf content');

    $this->app->instance(DeliveryNotePdfService::class, $mockService);

    $response = $this->actingAs($this->user)
        ->get(route('work-orders.delivery-note.pdf', $this->workOrder->id));

    $response->assertSuccessful();
    expect($response->headers->get('content-type'))->toBe('application/pdf');
    expect($response->getContent())->toBe('%PDF-1.4 dummy pdf content');
});

test('it allows uploading images for the delivery note content', function () {
    Storage::fake('public');

    $file = UploadedFile::fake()->image('bloque_muestra.jpg', 600, 400);

    $response = $this->actingAs($this->user)
        ->post(route('work-orders.delivery-note.upload-image', $this->workOrder->id), [
            'image' => $file,
        ]);

    $response->assertSuccessful();
    $response->assertJsonStructure(['url']);

    $url = $response->json('url');
    expect($url)->toContain('/storage/delivery-note-images/');
});

test('it reuses existing delivery note when show is called and does not overwrite it', function () {
    $existing = DeliveryNote::create([
        'work_order_id' => $this->workOrder->id,
        'specimen_id' => $this->specimen->id,
        'content_html' => '<p>Nota existente personalizada</p>',
        'created_by_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('work-orders.delivery-note.show', $this->workOrder->id));

    $response->assertSuccessful();

    expect(DeliveryNote::where('work_order_id', $this->workOrder->id)->count())->toBe(1);

    $current = DeliveryNote::where('work_order_id', $this->workOrder->id)->first();
    expect($current->content_html)->toBe('<p>Nota existente personalizada</p>');
    expect($current->id)->toBe($existing->id);
});
