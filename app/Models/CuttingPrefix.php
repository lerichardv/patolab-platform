<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['prefix'])]
class CuttingPrefix extends Model
{
    public function cuttings(): HasMany
    {
        return $this->hasMany(Cutting::class, 'prefix_id');
    }
}
