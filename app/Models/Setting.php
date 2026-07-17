<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use Auditable;
    use HasFactory;

    protected $fillable = [
        'setting_key',
        'setting_value',
        'has_multiple_values',
        'setting_value_multiple',
        'description',
    ];

    protected $casts = [
        'has_multiple_values' => 'boolean',
        'setting_value_multiple' => 'array',
    ];
}
