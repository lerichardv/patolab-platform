<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Rental extends Model
{
    use Auditable;
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
    ];

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'rental_id');
    }
}
