<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrioritySpecimenOrder extends Model
{
    protected $table = 'priorities_specimens_order';

    protected $fillable = [
        'priority_id',
        'specimen_id',
        'order',
    ];
}
