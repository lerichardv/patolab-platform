<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkOrderTask extends Model
{
    use Auditable;
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
    ];
}
