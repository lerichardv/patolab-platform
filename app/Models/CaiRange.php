<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CaiRange extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'location_id',
        'cai',
        'full_prefix',
        'emission',
        'establishment',
        'document_type',
        'start_number',
        'end_number',
        'last_used_number',
        'deadline',
        'status',
        'limit_percentage_warning', // Define a qué porcentaje de facturas restantes el sistema debe empezar a mostrar alertas (ej. avisar cuando quede el 10% del bloque).
        'limit_days_warning', // Define cuántos días antes de la deadline el sistema debe empezar a notificar al administrador
        'warning_notifications_amount', // Define la cantidad de notificaciones que se enviarán al administrador
        'warning_notifications_sent', // Define la cantidad de notificaciones que se han enviado al administrador
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_number' => 'integer',
            'end_number' => 'integer',
            'last_used_number' => 'integer',
            'deadline' => 'date',
            'limit_percentage_warning' => 'integer',
            'limit_days_warning' => 'integer',
            'warning_notifications_amount' => 'integer',
            'warning_notifications_sent' => 'integer',
        ];
    }

    /**
     * Get the location that owns the CAI range.
     */
    public function location()
    {
        return $this->belongsTo(Location::class);
    }
}
