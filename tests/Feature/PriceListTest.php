<?php

use App\Models\Product;
use App\Models\SpecimenType;
use App\Models\PriceList;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a product can have one or many prices through polymorphic price list relationship', function () {
    // 1. Create a product
    $product = Product::create([
        'code' => 'PROD-01',
        'name' => 'Test Product',
        'description' => 'Test Product Description',
        'unit' => 'unit',
        'unit_value' => '1',
        'purchase_price' => 100.00,
        'sale_price' => 150.00,
        'isv' => false,
        'active' => true,
    ]);

    // 2. Add multiple prices
    $price1 = $product->prices()->create([
        'amount' => 120.00,
    ]);

    $price2 = $product->prices()->create([
        'amount' => 125.50,
    ]);

    // 3. Assert relationship direction (Product -> PriceList)
    expect($product->prices)->toHaveCount(2);
    expect($product->prices->pluck('amount')->toArray())->toEqual(['120.00', '125.50']);

    // 4. Assert inverse relationship (PriceList -> Product)
    expect($price1->source)->toBeInstanceOf(Product::class);
    expect($price1->source->id)->toBe($product->id);
    expect($price1->pricing_source)->toBe('product');

    expect($price2->source)->toBeInstanceOf(Product::class);
    expect($price2->source->id)->toBe($product->id);
    expect($price2->pricing_source)->toBe('product');
});

test('a specimen type can have one or many prices through polymorphic price list relationship', function () {
    // 1. Create a specimen type
    $specimenType = SpecimenType::create([
        'name' => 'Biopsia Especial',
        'description' => 'Biopsia especial de prueba',
        'active' => true,
    ]);

    // 2. Add multiple prices
    $price1 = $specimenType->prices()->create([
        'amount' => 500.00,
    ]);

    $price2 = $specimenType->prices()->create([
        'amount' => 550.75,
    ]);

    // 3. Assert relationship direction (SpecimenType -> PriceList)
    expect($specimenType->prices)->toHaveCount(2);
    expect($specimenType->prices->pluck('amount')->toArray())->toEqual(['500.00', '550.75']);

    // 4. Assert inverse relationship (PriceList -> SpecimenType)
    expect($price1->source)->toBeInstanceOf(SpecimenType::class);
    expect($price1->source->id)->toBe($specimenType->id);
    expect($price1->pricing_source)->toBe('specimen type');

    expect($price2->source)->toBeInstanceOf(SpecimenType::class);
    expect($price2->source->id)->toBe($specimenType->id);
    expect($price2->pricing_source)->toBe('specimen type');
});
