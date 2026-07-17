<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpecimenCollaborator extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'specimen_collaborators';

    protected $fillable = [
        'user_id',
        'specimen_id',
        'macroscopy_access',
        'microscopy_access',
    ];

    protected $casts = [
        'macroscopy_access' => 'boolean',
        'microscopy_access' => 'boolean',
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
