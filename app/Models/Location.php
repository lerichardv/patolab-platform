<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Representa una sucursal física del laboratorio.
 */
class Location extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'locations';

    protected $fillable = [
        'name',
        'rtn',
        'address',
        'phone',
        'email',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];
}
