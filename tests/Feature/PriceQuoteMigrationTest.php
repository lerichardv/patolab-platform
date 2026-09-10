<?php

use App\Models\Customer;
use App\Models\PriceQuote;
use App\Models\PriceQuoteSpecimen;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenExamination;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('price quote model can be created and relates to customer, specimen type and category', function () {
    $customer = Customer::factory()->create();
    $category = SpecimenCategory::create([
        'name' => 'Rutina',
        'unit' => 'days',
        'quantity' => 2,
        'active' => true,
    ]);
    $type = SpecimenType::create([
        'name' => 'Biopsia',
        'active' => true,
    ]);

    $hexId = bin2hex(random_bytes(6));
    $priceQuote = PriceQuote::create([
        'price_quote_id' => $hexId,
        'customer_id' => $customer->id,
        'price_quote_file' => 'price_quotes/test.pdf',
        'active' => true,
    ]);

    expect($priceQuote->price_quote_id)->toBe(strtoupper($hexId))
        ->and($priceQuote->active)->toBeTrue()
        ->and($priceQuote->price_quote_file)->toBe('price_quotes/test.pdf')
        ->and($priceQuote->price_quote_url)->toContain('storage/price_quotes/test.pdf')
        ->and($priceQuote->customer->id)->toBe($customer->id);
});

test('price quote specimen item can be created with breakdowns and belongs to quote and examination', function () {
    $type = SpecimenType::create(['name' => 'Biopsia', 'active' => true]);
    $category = SpecimenCategory::create(['name' => 'Rutina', 'quantity' => 1, 'active' => true]);
    $examType = SpecimenTypeExamination::create([
        'specimen_type' => $type->id,
        'name' => 'Biopsia simple',
        'active' => true,
    ]);

    $quote = PriceQuote::create([
        'price_quote_id' => 'a1b2c3d4e5f6',
        'active' => true,
    ]);

    $priority = Priority::create([
        'name' => 'Normal',
        'color' => '#3b82f6',
        'order' => 1,
    ]);

    $refType = ReferrerType::create([
        'name' => 'Médico',
        'active' => true,
    ]);
    $referrer = Referrer::create([
        'name' => 'Dr. Test',
        'referrer_type' => $refType->id,
        'active' => true,
    ]);

    // Create specimen to establish specimen_examinations record
    $specimen = Specimen::forceCreate([
        'customer' => Customer::factory()->create()->id,
        'specimen_type' => $type->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'anatomic_site' => 'Piel',
        'status' => 'received',
        'active' => true,
    ]);

    $specimenExam = SpecimenExamination::create([
        'specimen_id' => $specimen->id,
        'examination_id' => $examType->id,
    ]);

    $quoteSpecimen = PriceQuoteSpecimen::create([
        'price_quote_id' => $quote->id,
        'specimen' => 'a1b2c3d4e5f6',
        'specimen_type' => $type->id,
        'specimen_category' => $category->id,
        'examination_id' => $specimenExam->id,
        'quantity' => 2,
        'amount' => '200.00',
        'discount' => '20.00',
        'subtotal' => '180.00',
        'exempt_amount' => '0.00',
        'taxable_amount_15' => '180.00',
        'taxable_amount_18' => '0.00',
        'isv_15' => '27.00',
        'isv_18' => '0.00',
        'total' => '207.00',
        'selected_price' => '100.00',
        'custom_specimen_price' => '0.00',
        'additional_discount_enabled' => true,
        'additional_discount' => '10.00',
        'age_discout_type' => 'percentage',
        'age_discout_amount' => '10.00',
    ]);

    expect($quoteSpecimen->priceQuote->id)->toBe($quote->id)
        ->and($quoteSpecimen->examination->id)->toBe($specimenExam->id)
        ->and($quoteSpecimen->quantity)->toBe(2)
        ->and($quoteSpecimen->amount)->toBe('200.00')
        ->and($quoteSpecimen->additional_discount_enabled)->toBeTrue()
        ->and($quote->priceQuoteSpecimens)->toHaveCount(1)
        ->and($quote->specimens)->toHaveCount(1);

    // Test cascading delete
    $quote->delete();
    expect(PriceQuoteSpecimen::find($quoteSpecimen->id))->toBeNull();
});
