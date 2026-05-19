<?php

namespace App\Models;

use App\Traits\Auditable;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Representa un remitente (médico o entidad que refiere).
 */
class Referrer extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'referrers';

    protected $fillable = [
        'name',
        'referrer_type',
        'address',
        'phone',
        'email',
        'notes',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function type()
    {
        return $this->belongsTo(ReferrerType::class, 'referrer_type');
    }
}
