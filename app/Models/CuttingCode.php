<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'color'])]
class CuttingCode extends Model
{
    public function cuttings(): HasMany
    {
        return $this->hasMany(Cutting::class, 'code_id');
    }
}
