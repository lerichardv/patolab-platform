<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Representa un registro de auditoría para cambios en la base de datos.
 */
class AuditLog extends Model
{
    use HasFactory;

    public static string $currentOrigin = 'system';

    protected $table = 'audit_log';

    protected $fillable = [
        'audit_session_code',
        'action',
        'table',
        'row_id',
        'column',
        'old_value',
        'new_value',
        'user',
        'origin',
    ];

    public function userRelation(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user');
    }
}
