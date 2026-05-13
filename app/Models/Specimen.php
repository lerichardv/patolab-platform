<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Representa una muestra o examen (espécimen) en el sistema.
 */
class Specimen extends Model
{
    use HasFactory;

    protected $table = 'specimen';

    protected $fillable = [
        'customer',
        'specimen_type',
        'specimen_type_examination',
        'specimen_category',
        'referrer',
        'anatomic_site',
        'diagnosis',
        'clinical_notes',
        'status',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function customerRelation(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer');
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(SpecimenType::class, 'specimen_type');
    }

    public function examination(): BelongsTo
    {
        return $this->belongsTo(SpecimenTypeExamination::class, 'specimen_type_examination');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(SpecimenCategory::class, 'specimen_category');
    }

    public function referrerRelation(): BelongsTo
    {
        return $this->belongsTo(Referrer::class, 'referrer');
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'specimen_products', 'specimen', 'product')
            ->withTimestamps();
    }
}
