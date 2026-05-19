<?php

namespace App\Models;

use App\Traits\Auditable;

use Illuminate\Database\Eloquent\Model;

class Priority extends Model
{
    use Auditable;
    protected $fillable = [
        'name',
        'color',
        'order',
    ];

    public function specimens()
    {
        return $this->hasMany(Specimen::class, 'priority_id');
    }
}
