<?php

namespace App\Traits;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Model;

trait Auditable
{
    public static function bootAuditable()
    {
        static::created(function (Model $model) {
            $model->logAudit('create');
        });

        static::updated(function (Model $model) {
            $model->logAudit('update');
        });

        static::deleted(function (Model $model) {
            $model->logAuditDelete();
        });
    }

    protected function logAudit(string $action)
    {
        $userId = Auth::id();
        if (!$userId) {
            return;
        }

        $table = $this->getTable();
        $rowId = $this->getKey();

        if ($action === 'create') {
            foreach ($this->getAttributes() as $column => $value) {
                if ($this->shouldIgnoreColumn($column)) continue;

                AuditLog::create([
                    'action' => 'create',
                    'table' => $table,
                    'row_id' => $rowId,
                    'column' => $column,
                    'old_value' => null,
                    'new_value' => $this->castValueToString($value),
                    'user' => $userId,
                ]);
            }
        } elseif ($action === 'update') {
            foreach ($this->getChanges() as $column => $newValue) {
                if ($this->shouldIgnoreColumn($column)) continue;

                $oldValue = $this->getOriginal($column);
                AuditLog::create([
                    'action' => 'update',
                    'table' => $table,
                    'row_id' => $rowId,
                    'column' => $column,
                    'old_value' => $this->castValueToString($oldValue),
                    'new_value' => $this->castValueToString($newValue),
                    'user' => $userId,
                ]);
            }
        }
    }

    protected function castValueToString($value): string
    {
        if (is_array($value) || is_object($value)) {
            return json_encode($value);
        }
        return (string) $value;
    }

    protected function logAuditDelete()
    {
        $userId = Auth::id();
        if (!$userId) {
            return;
        }

        AuditLog::create([
            'action' => 'delete',
            'table' => $this->getTable(),
            'row_id' => $this->getKey(),
            'column' => 'deleted_at',
            'old_value' => 'active',
            'new_value' => 'deleted',
            'user' => $userId,
        ]);
    }

    protected function shouldIgnoreColumn(string $column): bool
    {
        $ignored = ['created_at', 'updated_at', 'deleted_at', 'password', 'remember_token'];
        return in_array($column, $ignored);
    }
}
