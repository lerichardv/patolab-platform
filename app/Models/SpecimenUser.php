<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Representa la asignación de un usuario a una muestra (espécimen).
 */
class SpecimenUser extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'specimen_user';

    protected $fillable = [
        'user_id',
        'specimen_id',
    ];

    /**
     * Obtiene el usuario asignado.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Obtiene la muestra (espécimen) asociada.
     */
    public function specimen(): BelongsTo
    {
        return $this->belongsTo(Specimen::class, 'specimen_id');
    }
}
