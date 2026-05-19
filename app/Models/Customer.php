<?php

namespace App\Models;

use App\Traits\Auditable;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use Auditable;
    use HasFactory;
    protected $fillable = [
        'name',
        'id_number',
        'age',
        'phone',
        'gender',
        'state',
        'city',
        'type',
        'secondary_phone',
        'address',
        'email',
        'active',
    ];
}
