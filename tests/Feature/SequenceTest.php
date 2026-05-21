<?php

use App\Models\User;
use App\Models\Location;
use App\Models\SpecimenType;
use App\Models\Sequence;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->location = Location::create([
        'name' => 'Sucursal Principal',
        'rtn' => '12345678901234',
        'address' => 'Tegucigalpa',
        'phone' => '2222-2222',
        'email' => 'principal@patolab.com',
        'active' => true,
    ]);
    $this->specimenType = SpecimenType::create([
        'name' => 'Biopsia',
        'description' => 'Muestra de biopsia',
        'active' => true,
    ]);
});

test('prefix must be unique among active sequences on store', function () {
    $this->actingAs($this->user);

    // 1. Create first sequence successfully
    $response = $this->post(route('sequences.store'), [
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'prefix' => 'BIO',
        'separator' => '-',
        'fill' => 4,
        'month' => 5,
        'year' => 2026,
        'current_sequence' => 1,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('sequences', [
        'prefix' => 'BIO',
        'active' => true,
    ]);

    // 2. Try creating a second sequence with the same prefix (should fail)
    $response2 = $this->post(route('sequences.store'), [
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'prefix' => 'BIO',
        'separator' => '-',
        'fill' => 4,
        'month' => 5,
        'year' => 2026,
        'current_sequence' => 1,
    ]);

    $response2->assertSessionHasErrors(['prefix']);
    
    // 3. Deactivate the first sequence
    $sequence = Sequence::where('prefix', 'BIO')->first();
    $sequence->update(['active' => false]);

    // 4. Try creating the sequence with same prefix again (should succeed now that the first is inactive)
    $response3 = $this->post(route('sequences.store'), [
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'prefix' => 'BIO',
        'separator' => '-',
        'fill' => 4,
        'month' => 5,
        'year' => 2026,
        'current_sequence' => 1,
    ]);

    $response3->assertRedirect();
    // There should now be two sequences with prefix BIO, one active and one inactive
    $this->assertEquals(2, Sequence::where('prefix', 'BIO')->count());
});

test('prefix must be unique among active sequences on update', function () {
    $this->actingAs($this->user);

    // 1. Create first sequence
    $seq1 = Sequence::create([
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'prefix' => 'BIO',
        'separator' => '-',
        'fill' => 4,
        'month' => 5,
        'year' => 2026,
        'current_sequence' => 1,
        'active' => true,
    ]);

    // 2. Create second sequence with a different prefix
    $seq2 = Sequence::create([
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'prefix' => 'HEM',
        'separator' => '-',
        'fill' => 4,
        'month' => 5,
        'year' => 2026,
        'current_sequence' => 1,
        'active' => true,
    ]);

    // 3. Try to update seq2 to use the prefix of seq1 (should fail)
    $response = $this->put(route('sequences.update', $seq2->id), [
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'prefix' => 'BIO',
        'separator' => '-',
        'fill' => 4,
        'month' => 5,
        'year' => 2026,
        'current_sequence' => 1,
    ]);

    $response->assertSessionHasErrors(['prefix']);

    // 4. Update seq2 but keeping its own prefix (should succeed)
    $response2 = $this->put(route('sequences.update', $seq2->id), [
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'prefix' => 'HEM',
        'separator' => '-',
        'fill' => 5, // change something else
        'month' => 5,
        'year' => 2026,
        'current_sequence' => 1,
    ]);

    $response2->assertRedirect();
    $this->assertEquals(5, $seq2->fresh()->fill);

    // 5. Deactivate seq1
    $seq1->update(['active' => false]);

    // 6. Update seq2 to 'BIO' (should now succeed since seq1 is inactive)
    $response3 = $this->put(route('sequences.update', $seq2->id), [
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'prefix' => 'BIO',
        'separator' => '-',
        'fill' => 5,
        'month' => 5,
        'year' => 2026,
        'current_sequence' => 1,
    ]);

    $response3->assertRedirect();
    $this->assertEquals('BIO', $seq2->fresh()->prefix);
});
