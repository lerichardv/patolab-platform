<?php

use App\Mail\PriceQuoteMail;
use App\Models\Customer;
use App\Models\Permission;
use App\Models\PriceQuote;
use App\Models\PriceQuoteSpecimen;
use App\Models\Role;
use App\Models\Setting;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use App\Services\PriceQuotePdfService;
use App\Services\ResendService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->pdfServiceMock = Mockery::mock(PriceQuotePdfService::class);
    $this->pdfServiceMock->shouldReceive('generateAndStorePriceQuote')
        ->byDefault()
        ->andReturnUsing(function ($quote) {
            $quote->update(['price_quote_file' => 'price_quotes/mock.pdf']);

            return 'price_quotes/mock.pdf';
        });
    app()->instance(PriceQuotePdfService::class, $this->pdfServiceMock);

    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    $viewPerm = Permission::create(['slug' => 'price_quotes.view', 'name' => 'Ver Cotizaciones']);
    $createPerm = Permission::create(['slug' => 'price_quotes.create', 'name' => 'Crear Cotizaciones']);
    $editPerm = Permission::create(['slug' => 'price_quotes.edit', 'name' => 'Editar Cotizaciones']);
    $deletePerm = Permission::create(['slug' => 'price_quotes.delete', 'name' => 'Eliminar Cotizaciones']);

    $this->adminRole->permissions()->attach([
        $viewPerm->id,
        $createPerm->id,
        $editPerm->id,
        $deletePerm->id,
    ]);

    $this->customer = Customer::create([
        'name' => 'Juan Perez',
        'id_number' => '0801199012345',
        'phone' => '99999999',
        'gender' => 'masculino',
        'type' => 'cliente',
    ]);

    $this->specimenType = SpecimenType::create(['name' => 'Biopsia', 'code' => 'BIO', 'active' => true]);
    $this->specimenCategory = SpecimenCategory::create(['name' => 'Rutina', 'quantity' => 1, 'active' => true]);

    $this->examination = SpecimenTypeExamination::create([
        'name' => 'Biopsia Pequeña',
        'specimen_type' => $this->specimenType->id,
        'active' => true,
    ]);

    Setting::create(['setting_key' => 'third_age_discount', 'setting_value' => '25', 'description' => 'Descuento 3ra edad']);
    Setting::create(['setting_key' => 'fourth_age_discount', 'setting_value' => '35', 'description' => 'Descuento 4ta edad']);
});

test('unauthenticated users cannot access price quotes routes', function () {
    $this->get(route('price-quotes.index'))->assertRedirect(route('login'));
    $this->getJson(route('price-quotes.form-data'))->assertUnauthorized();
});

test('users without price_quotes.view cannot view price quotes index', function () {
    $limitedRole = Role::create(['slug' => 'limited', 'name' => 'Limited']);
    $limitedUser = User::factory()->create([
        'role_id' => $limitedRole->id,
        'active' => true,
    ]);

    $this->actingAs($limitedUser)
        ->get(route('price-quotes.index'))
        ->assertForbidden();

    $this->actingAs($limitedUser)
        ->getJson(route('price-quotes.form-data'))
        ->assertForbidden();
});

test('can view price quotes index with active records only', function () {
    $activeQuote = PriceQuote::create([
        'price_quote_id' => 'a1b2c3d4e5f6',
        'customer_id' => $this->customer->id,
        'active' => true,
    ]);

    $inactiveQuote = PriceQuote::create([
        'price_quote_id' => 'f6e5d4c3b2a1',
        'customer_id' => $this->customer->id,
        'active' => false,
    ]);

    $this->actingAs($this->user)
        ->get(route('price-quotes.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('price-quotes/index')
            ->has('priceQuotes.data', 1)
            ->where('priceQuotes.data.0.id', $activeQuote->id)
        );
});

test('can search price quotes by customer name or quote id', function () {
    $otherCustomer = Customer::create([
        'name' => 'Maria Rodriguez',
        'id_number' => '0501198512345',
        'type' => 'cliente',
    ]);

    $quote1 = PriceQuote::create([
        'price_quote_id' => '111122223333',
        'customer_id' => $this->customer->id,
        'active' => true,
    ]);

    $quote2 = PriceQuote::create([
        'price_quote_id' => '444455556666',
        'customer_id' => $otherCustomer->id,
        'active' => true,
    ]);

    $this->actingAs($this->user)
        ->get(route('price-quotes.index', ['search' => 'Maria']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('priceQuotes.data', 1)
            ->where('priceQuotes.data.0.id', $quote2->id)
        );

    $this->actingAs($this->user)
        ->get(route('price-quotes.index', ['search' => '11112222']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('priceQuotes.data', 1)
            ->where('priceQuotes.data.0.id', $quote1->id)
        );
});

test('returns reference data for price quote form data', function () {
    $response = $this->actingAs($this->user)
        ->getJson(route('price-quotes.form-data'))
        ->assertOk()
        ->assertJsonStructure([
            'specimenTypes',
            'specimenCategories',
            'examinations',
            'settings',
        ]);

    $data = $response->json();
    expect($data['specimenTypes'])->toHaveCount(1)
        ->and($data['specimenCategories'])->toHaveCount(1)
        ->and($data['examinations'])->toHaveCount(1)
        ->and($data['settings']['third_age_discount'])->toBe('25');
});

test('returns existing quote with relations when price_quote_id passed to form-data', function () {
    $quote = PriceQuote::create([
        'price_quote_id' => 'aabbccddeeff',
        'customer_id' => $this->customer->id,
        'active' => true,
    ]);

    PriceQuoteSpecimen::create([
        'price_quote_id' => $quote->id,
        'specimen' => 'aabbccddeeff',
        'specimen_type' => $this->specimenType->id,
        'specimen_category' => $this->specimenCategory->id,
        'examination_id' => $this->examination->id,
        'quantity' => 2,
        'amount' => 500,
        'discount' => 50,
        'subtotal' => 450,
        'exempt_amount' => 0,
        'taxable_amount_15' => 450,
        'taxable_amount_18' => 0,
        'isv_15' => 67.5,
        'isv_18' => 0,
        'total' => 517.5,
        'selected_price' => 250,
        'custom_specimen_price' => 0,
        'additional_discount_enabled' => false,
        'additional_discount' => 0,
        'age_discout_type' => 'third',
        'age_discout_amount' => 50,
    ]);

    $response = $this->actingAs($this->user)
        ->getJson(route('price-quotes.form-data', ['price_quote_id' => $quote->id]))
        ->assertOk();

    $data = $response->json();
    expect($data)->toHaveKey('priceQuote')
        ->and($data['priceQuote']['id'])->toBe($quote->id)
        ->and($data['priceQuote']['specimens'])->toHaveCount(1);
});

test('can create a price quote with specimen items', function () {
    $payload = [
        'customer_id' => $this->customer->id,
        'specimens' => [
            [
                'specimen_type' => $this->specimenType->id,
                'specimen_category' => $this->specimenCategory->id,
                'examination_id' => $this->examination->id,
                'quantity' => 1,
                'amount' => 800.00,
                'discount' => 0.00,
                'subtotal' => 800.00,
                'exempt_amount' => 0.00,
                'taxable_amount_15' => 800.00,
                'taxable_amount_18' => 0.00,
                'isv_15' => 120.00,
                'isv_18' => 0.00,
                'total' => 920.00,
                'selected_price' => 800.00,
                'custom_specimen_price' => 0.00,
                'additional_discount_enabled' => false,
                'additional_discount' => 0.00,
                'age_discout_type' => null,
                'age_discout_amount' => 0.00,
            ],
        ],
    ];

    $response = $this->actingAs($this->user)
        ->from(route('price-quotes.index'))
        ->post(route('price-quotes.store'), $payload);

    $response->assertRedirect(route('price-quotes.index'))
        ->assertSessionHas('new_price_quote_url');

    $quote = PriceQuote::first();
    expect($quote)->not->toBeNull()
        ->and($quote->customer_id)->toBe($this->customer->id)
        ->and($quote->price_quote_id)->toHaveLength(12)
        ->and($quote->active)->toBeTrue()
        ->and($quote->priceQuoteSpecimens)->toHaveCount(1)
        ->and($quote->priceQuoteSpecimens->first()->amount)->toBe('800.00')
        ->and($quote->priceQuoteSpecimens->first()->specimen_type)->toBe($this->specimenType->id);
});

test('can update a price quote and its specimens', function () {
    $quote = PriceQuote::create([
        'price_quote_id' => '123456789012',
        'customer_id' => null,
        'active' => true,
    ]);

    $payload = [
        'customer_id' => $this->customer->id,
        'specimens' => [
            [
                'specimen_type' => $this->specimenType->id,
                'specimen_category' => $this->specimenCategory->id,
                'examination_id' => $this->examination->id,
                'quantity' => 3,
                'amount' => 1500.00,
                'discount' => 100.00,
                'subtotal' => 1400.00,
                'exempt_amount' => 0.00,
                'taxable_amount_15' => 1400.00,
                'taxable_amount_18' => 0.00,
                'isv_15' => 210.00,
                'isv_18' => 0.00,
                'total' => 1610.00,
                'selected_price' => 500.00,
                'custom_specimen_price' => 0.00,
                'additional_discount_enabled' => true,
                'additional_discount' => 100.00,
                'age_discout_type' => null,
                'age_discout_amount' => 0.00,
            ],
        ],
    ];

    $response = $this->actingAs($this->user)
        ->from(route('price-quotes.index'))
        ->put(route('price-quotes.update', $quote->id), $payload);

    $response->assertRedirect(route('price-quotes.index'))
        ->assertSessionHas('new_price_quote_url');

    $quote->refresh();
    expect($quote->customer_id)->toBe($this->customer->id)
        ->and($quote->priceQuoteSpecimens)->toHaveCount(1)
        ->and($quote->priceQuoteSpecimens->first()->quantity)->toBe(3);
});

test('can soft delete a price quote', function () {
    $quote = PriceQuote::create([
        'price_quote_id' => 'abcdefabcdef',
        'customer_id' => $this->customer->id,
        'active' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->from(route('price-quotes.index'))
        ->delete(route('price-quotes.destroy', $quote->id));

    $response->assertRedirect(route('price-quotes.index'));

    $quote->refresh();
    expect($quote->active)->toBeFalse();
});

test('maps temporary frontend specimen codes to real 12-char hex codes on store', function () {
    $exam2 = SpecimenTypeExamination::create([
        'name' => 'Biopsia Mediana',
        'specimen_type' => $this->specimenType->id,
        'active' => true,
    ]);

    $payload = [
        'customer_id' => $this->customer->id,
        'specimens' => [
            [
                'specimen' => 'temp_group_1',
                'specimen_type' => $this->specimenType->id,
                'specimen_category' => $this->specimenCategory->id,
                'examination_id' => $this->examination->id,
                'quantity' => 1,
                'amount' => 500.00,
                'discount' => 0.00,
                'subtotal' => 500.00,
                'exempt_amount' => 0.00,
                'taxable_amount_15' => 500.00,
                'taxable_amount_18' => 0.00,
                'isv_15' => 75.00,
                'isv_18' => 0.00,
                'total' => 575.00,
            ],
            [
                'specimen' => 'temp_group_1',
                'specimen_type' => $this->specimenType->id,
                'specimen_category' => $this->specimenCategory->id,
                'examination_id' => $exam2->id,
                'quantity' => 1,
                'amount' => 600.00,
                'discount' => 0.00,
                'subtotal' => 600.00,
                'exempt_amount' => 0.00,
                'taxable_amount_15' => 600.00,
                'taxable_amount_18' => 0.00,
                'isv_15' => 90.00,
                'isv_18' => 0.00,
                'total' => 690.00,
            ],
            [
                'specimen' => 'temp_group_2',
                'specimen_type' => $this->specimenType->id,
                'specimen_category' => $this->specimenCategory->id,
                'examination_id' => $this->examination->id,
                'quantity' => 2,
                'amount' => 1000.00,
                'discount' => 0.00,
                'subtotal' => 1000.00,
                'exempt_amount' => 0.00,
                'taxable_amount_15' => 1000.00,
                'taxable_amount_18' => 0.00,
                'isv_15' => 150.00,
                'isv_18' => 0.00,
                'total' => 1150.00,
            ],
        ],
    ];

    $response = $this->actingAs($this->user)
        ->post(route('price-quotes.store'), $payload);

    $response->assertRedirect();

    $quote = PriceQuote::latest()->first();
    expect($quote->priceQuoteSpecimens)->toHaveCount(3);

    $specs = $quote->priceQuoteSpecimens;
    $spec0 = $specs[0];
    $spec1 = $specs[1];
    $spec2 = $specs[2];

    // Both items in temp_group_1 must have the same 12-char real hex code
    expect($spec0->specimen)->toHaveLength(12)
        ->and($spec1->specimen)->toHaveLength(12)
        ->and($spec0->specimen)->toBe($spec1->specimen);

    // Item in temp_group_2 must have a different 12-char real hex code
    expect($spec2->specimen)->toHaveLength(12)
        ->and($spec2->specimen)->not->toBe($spec0->specimen);
});

test('can update price quote when specimen_type and specimen_category are passed as objects or integers', function () {
    $quote = PriceQuote::create([
        'price_quote_id' => '112233445566',
        'customer_id' => $this->customer->id,
        'active' => true,
    ]);

    $payload = [
        'customer_id' => $this->customer->id,
        'specimens' => [
            [
                'specimen' => '112233445566',
                // Object instead of plain integer, mimicking JSON serialization
                'specimen_type' => ['id' => $this->specimenType->id, 'name' => 'Biopsia'],
                'specimen_category' => ['id' => $this->specimenCategory->id, 'name' => 'Rutina'],
                'examination_id' => $this->examination->id,
                'quantity' => 2,
                'amount' => 1000.00,
                'discount' => 100.00,
                'subtotal' => 900.00,
                'exempt_amount' => 900.00,
                'taxable_amount_15' => 0.00,
                'taxable_amount_18' => 0.00,
                'isv_15' => 0.00,
                'isv_18' => 0.00,
                'total' => 900.00,
            ],
        ],
    ];

    $response = $this->actingAs($this->user)
        ->put(route('price-quotes.update', $quote), $payload);

    $response->assertRedirect();
    $response->assertSessionHas('success', 'Cotización actualizada exitosamente.');

    $quote->refresh();
    expect($quote->priceQuoteSpecimens)->toHaveCount(1);
    expect($quote->priceQuoteSpecimens->first()->specimen_type)->toBe($this->specimenType->id);
    expect($quote->priceQuoteSpecimens->first()->specimen_category)->toBe($this->specimenCategory->id);
    expect((float) $quote->priceQuoteSpecimens->first()->total)->toBe(900.00);
});

test('unauthenticated users cannot send price quote email', function () {
    $quote = PriceQuote::create([
        'price_quote_id' => '112233445566',
        'customer_id' => $this->customer->id,
        'active' => true,
    ]);

    $this->post(route('price-quotes.send-email', $quote), [
        'recipient_email' => 'test@example.com',
    ])->assertRedirect(route('login'));
});

test('users without price_quotes.view cannot send price quote email', function () {
    $limitedRole = Role::create(['slug' => 'limited', 'name' => 'Limited']);
    $limitedUser = User::factory()->create([
        'role_id' => $limitedRole->id,
        'active' => true,
    ]);

    $quote = PriceQuote::create([
        'price_quote_id' => '112233445566',
        'customer_id' => $this->customer->id,
        'active' => true,
    ]);

    $this->actingAs($limitedUser)
        ->post(route('price-quotes.send-email', $quote), [
            'recipient_email' => 'test@example.com',
        ])
        ->assertForbidden();
});

test('cannot send price quote email without valid email address', function () {
    $quote = PriceQuote::create([
        'price_quote_id' => '112233445566',
        'customer_id' => $this->customer->id,
        'active' => true,
    ]);

    $this->actingAs($this->user)
        ->post(route('price-quotes.send-email', $quote), [
            'recipient_email' => 'invalid-email',
        ])
        ->assertSessionHasErrors(['recipient_email']);
});

test('can send price quote email with attached pdf via resend service', function () {
    Storage::fake('public');
    Storage::disk('public')->put('price_quotes/sample.pdf', 'fake-pdf-content');

    $quote = PriceQuote::create([
        'price_quote_id' => '112233445566',
        'customer_id' => $this->customer->id,
        'price_quote_file' => 'price_quotes/sample.pdf',
        'active' => true,
    ]);

    $resendMock = Mockery::mock(ResendService::class);
    $resendMock->shouldReceive('sendEmail')
        ->once()
        ->withArgs(function ($to, $subject, $html, $attachments) {
            return $to === 'cliente@example.com'
                && str_contains($subject, '112233445566')
                && count($attachments) === 1
                && $attachments[0]['filename'] === 'Cotizacion_112233445566.pdf'
                && $attachments[0]['content'] === base64_encode('fake-pdf-content');
        })
        ->andReturn(true);

    app()->instance(ResendService::class, $resendMock);

    $response = $this->actingAs($this->user)
        ->post(route('price-quotes.send-email', $quote), [
            'recipient_email' => 'cliente@example.com',
            'subject' => 'Cotización #112233445566 — PatoLab',
            'custom_message' => 'Adjuntamos su cotización solicitada.',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success', 'Cotización enviada exitosamente a cliente@example.com.');
});

test('PriceQuoteMail executes resend process matching SendSpecimenEmailJob', function () {
    Storage::fake('public');
    Storage::disk('public')->put('price_quotes/sample.pdf', 'fake-pdf-content');

    $quote = PriceQuote::create([
        'price_quote_id' => '112233445566',
        'customer_id' => $this->customer->id,
        'price_quote_file' => 'price_quotes/sample.pdf',
        'active' => true,
    ]);

    $resendMock = Mockery::mock(ResendService::class);
    $resendMock->shouldReceive('sendEmail')
        ->once()
        ->withArgs(function ($to, $subject, $html, $attachments) {
            return $to === 'destinatario@example.com'
                && count($attachments) === 1
                && $attachments[0]['filename'] === 'Cotizacion_112233445566.pdf';
        })
        ->andReturn(true);

    $mail = new PriceQuoteMail($quote, 'destinatario@example.com');
    $result = $mail->send($resendMock);

    expect($result)->toBeTrue();
});

test('handles failure when resend service fails to send email', function () {
    Storage::fake('public');
    Storage::disk('public')->put('price_quotes/sample.pdf', 'fake-pdf-content');

    $quote = PriceQuote::create([
        'price_quote_id' => '112233445566',
        'customer_id' => $this->customer->id,
        'price_quote_file' => 'price_quotes/sample.pdf',
        'active' => true,
    ]);

    $resendMock = Mockery::mock(ResendService::class);
    $resendMock->shouldReceive('sendEmail')
        ->once()
        ->andReturn(false);

    app()->instance(ResendService::class, $resendMock);

    $response = $this->actingAs($this->user)
        ->post(route('price-quotes.send-email', $quote), [
            'recipient_email' => 'cliente@example.com',
        ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['email']);
});
