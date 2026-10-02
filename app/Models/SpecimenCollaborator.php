<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class SpecimenCollaborator extends Pivot
{
    use Auditable;
    use HasFactory;

    public $incrementing = true;

    protected $table = 'specimen_collaborators';

    protected $fillable = [
        'user_id',
        'specimen_id',
        'macroscopy_access',
        'microscopy_access',
        'assigned_by',
    ];

    protected $casts = [
        'macroscopy_access' => 'boolean',
        'microscopy_access' => 'boolean',
    ];

    protected $appends = [
        'assigned_by_user_name',
    ];

    /**
     * Obtiene el colaborador asignado.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Obtiene el usuario que realizó la asignación.
     */
    public function assignedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    /**
     * Obtiene el nombre del usuario que asignó.
     */
    public function getAssignedByUserNameAttribute(): ?string
    {
        if (! $this->assigned_by) {
            return null;
        }

        return $this->relationLoaded('assignedByUser')
            ? $this->assignedByUser?->name
            : User::where('id', $this->assigned_by)->value('name');
    }

    /**
     * Obtiene la muestra (espécimen) asociada.
     */
    public function specimen(): BelongsTo
    {
        return $this->belongsTo(Specimen::class, 'specimen_id');
    }

    /**
     * Registra auditoría extendida al desasignar/eliminar.
     */
    protected function logAuditDelete()
    {
        $userId = Auth::id();
        if (! $userId) {
            return;
        }

        $auditSessionCode = substr(str_replace('-', '', (string) Str::uuid()), 0, 24);

        AuditLog::create([
            'audit_session_code' => $auditSessionCode,
            'action' => 'delete',
            'table' => $this->getTable(),
            'row_id' => $this->getKey(),
            'column' => 'deleted_at',
            'old_value' => 'active',
            'new_value' => 'deleted',
            'user' => $userId,
            'origin' => AuditLog::$currentOrigin,
        ]);

        AuditLog::create([
            'audit_session_code' => $auditSessionCode,
            'action' => 'delete',
            'table' => $this->getTable(),
            'row_id' => $this->getKey(),
            'column' => 'user_id',
            'old_value' => (string) $this->user_id,
            'new_value' => null,
            'user' => $userId,
            'origin' => AuditLog::$currentOrigin,
        ]);

        AuditLog::create([
            'audit_session_code' => $auditSessionCode,
            'action' => 'delete',
            'table' => $this->getTable(),
            'row_id' => $this->getKey(),
            'column' => 'specimen_id',
            'old_value' => (string) $this->specimen_id,
            'new_value' => null,
            'user' => $userId,
            'origin' => AuditLog::$currentOrigin,
        ]);
    }
}
