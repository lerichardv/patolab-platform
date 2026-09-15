<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpecimenTypeState extends Model
{
    use HasFactory;

    protected $table = 'specimen_type_states';

    protected $fillable = [
        'specimen_type_id',
        'status',
        'step_order',
        'active',
    ];

    protected $casts = [
        'step_order' => 'integer',
        'active' => 'boolean',
    ];

    public const ALL_STATUSES = [
        'received' => [
            'label' => 'Recibida',
            'color' => '#3b82f6',
            'description' => 'Muestra ingresada en el sistema.',
        ],
        'macroscopic_review' => [
            'label' => 'Rev. Macroscópica',
            'color' => '#8b5cf6',
            'description' => 'Análisis físico y macroscópico de la muestra.',
        ],
        'processing' => [
            'label' => 'En Procesamiento',
            'color' => '#f59e0b',
            'description' => 'Procesamiento en laboratorio.',
        ],
        'microscopic_review' => [
            'label' => 'Rev. Microscópica',
            'color' => '#d946ef',
            'description' => 'Análisis microscópico por patólogo.',
        ],
        'finalized' => [
            'label' => 'Finalizada',
            'color' => '#10b981',
            'description' => 'Diagnóstico concluido y reporte firmado.',
        ],
        'delivered' => [
            'label' => 'Entregada',
            'color' => '#64748b',
            'description' => 'El reporte fue entregado al paciente o cliente.',
        ],
        'cancelled' => [
            'label' => 'Cancelada',
            'color' => '#ef4444',
            'description' => 'Muestra cancelada o anulada.',
        ],
    ];

    public function specimenType(): BelongsTo
    {
        return $this->belongsTo(SpecimenType::class, 'specimen_type_id');
    }
}
