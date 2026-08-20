<?php

namespace App\Models;

use App\Jobs\SendSpecimenEmailJob;
use App\Traits\Auditable;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Representa una muestra o examen (espécimen) en el sistema.
 */
class Specimen extends Model
{
    use Auditable;
    use HasFactory;

    public const STATUS_DATE_COLUMNS = [
        'received' => 'received_at',
        'macroscopic_review' => 'macroscopic_review_at',
        'processing' => 'processing_at',
        'microscopic_review' => 'microscopic_review_at',
        'finalized' => 'finalized_at',
        'delivered' => 'delivered_at',
        'cancelled' => 'cancelled_at',
    ];

    protected static function booted()
    {
        static::creating(function ($specimen) {
            $column = self::STATUS_DATE_COLUMNS[$specimen->status] ?? null;
            if ($column && is_null($specimen->{$column})) {
                $specimen->{$column} = now();
            }
        });

        static::created(function ($specimen) {
            if (! $specimen->group_id) {
                SendSpecimenEmailJob::dispatch($specimen, 'created');
            }
        });

        static::updating(function ($specimen) {
            if ($specimen->isDirty('status')) {
                $column = self::STATUS_DATE_COLUMNS[$specimen->status] ?? null;
                if ($column && ! $specimen->isDirty($column)) {
                    $specimen->{$column} = now();
                }
            }
        });

        static::updated(function ($specimen) {
            if ($specimen->wasChanged('status') && $specimen->status === 'finalized') {
                if (! $specimen->group_id) {
                    SendSpecimenEmailJob::dispatch($specimen, 'finalized');
                }
            }
        });
    }

    protected $table = 'specimen';

    public const STATUS_COLORS = [
        'received' => '#3b82f6',           // blue-500
        'macroscopic_review' => '#8b5cf6', // violet-500
        'processing' => '#f59e0b',         // amber-500
        'microscopic_review' => '#d946ef', // fuchsia-500
        'finalized' => '#10b981',          // emerald-500
        'delivered' => '#64748b',          // slate-500
        'cancelled' => '#ef4444',          // red-500
    ];

    protected $fillable = [
        'sequence_code',
        'customer',
        'location_id',
        'specimen_type',
        'specimen_type_examination',
        'specimen_category',
        'referrer',
        'anatomic_site',
        'diagnosis',
        'clinical_notes',
        'status',
        'received_at',
        'macroscopic_review_at',
        'processing_at',
        'microscopic_review_at',
        'finalized_at',
        'delivered_at',
        'medical_order_file',
        'priority_id',
        'active',
        'access_token',
        'delivery_token',
        'is_group',
        'group_id',
        'report_id',
        'cancellation_reason',
        'cancelled_at',
        'cancelled_by_id',
        'sample_collection_date',
    ];

    protected $casts = [
        'active' => 'boolean',
        'is_group' => 'boolean',
        'received_at' => 'datetime',
        'macroscopic_review_at' => 'datetime',
        'processing_at' => 'datetime',
        'microscopic_review_at' => 'datetime',
        'finalized_at' => 'datetime',
        'delivered_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'sample_collection_date' => 'date',
    ];

    protected $appends = [
        'status_color',
        'expected_finalization_date',
        'expected_internal_finalization_date',
    ];

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by_id');
    }

    public function getStatusColorAttribute(): string
    {
        return self::STATUS_COLORS[$this->status] ?? '#cbd5e1';
    }

    public function customerRelation(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer');
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'location_id');
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(SpecimenType::class, 'specimen_type');
    }

    public function examination(): BelongsTo
    {
        return $this->belongsTo(SpecimenTypeExamination::class, 'specimen_type_examination');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(SpecimenCategory::class, 'specimen_category');
    }

    public function getExpectedFinalizationDateAttribute(): ?Carbon
    {
        if (! $this->category || ! $this->category->unit || ! $this->category->quantity || ! $this->created_at) {
            return null;
        }

        $createdAt = Carbon::parse($this->created_at);
        $unit = $this->category->unit;
        $quantity = $this->category->quantity;

        switch ($unit) {
            case 'minutes':
                for ($i = 0; $i < $quantity; $i++) {
                    $createdAt->addMinute();
                    while ($createdAt->isWeekend()) {
                        $createdAt->addDay();
                    }
                }

                return $createdAt;
            case 'hours':
                for ($i = 0; $i < $quantity; $i++) {
                    $createdAt->addHour();
                    while ($createdAt->isWeekend()) {
                        $createdAt->addDay();
                    }
                }

                return $createdAt;
            case 'weeks':
                return $createdAt->addWeekdays($quantity * 5);
            case 'days':
            default:
                return $createdAt->addWeekdays($quantity);
        }
    }

    public function getExpectedInternalFinalizationDateAttribute(): ?Carbon
    {
        if (! $this->category || ! $this->category->intern_unit || ! $this->category->intern_quantity || ! $this->created_at) {
            return null;
        }

        $createdAt = Carbon::parse($this->created_at);
        $unit = $this->category->intern_unit;
        $quantity = $this->category->intern_quantity;

        switch ($unit) {
            case 'minutes':
                for ($i = 0; $i < $quantity; $i++) {
                    $createdAt->addMinute();
                    while ($createdAt->isWeekend()) {
                        $createdAt->addDay();
                    }
                }

                return $createdAt;
            case 'hours':
                for ($i = 0; $i < $quantity; $i++) {
                    $createdAt->addHour();
                    while ($createdAt->isWeekend()) {
                        $createdAt->addDay();
                    }
                }

                return $createdAt;
            case 'weeks':
                return $createdAt->addWeekdays($quantity * 5);
            case 'days':
            default:
                return $createdAt->addWeekdays($quantity);
        }
    }

    public function referrerRelation(): BelongsTo
    {
        return $this->belongsTo(Referrer::class, 'referrer');
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'specimen_products', 'specimen', 'product')
            ->withPivot(['quantity', 'price'])
            ->withTimestamps();
    }

    public function priority(): BelongsTo
    {
        return $this->belongsTo(Priority::class, 'priority_id');
    }

    /**
     * Obtiene los usuarios asignados a la muestra.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'specimen_user', 'specimen_id', 'user_id')
            ->using(SpecimenUser::class)
            ->withPivot(['macroscopy_access', 'microscopy_access'])
            ->withTimestamps();
    }

    /**
     * Obtiene los colaboradores asignados a la muestra.
     */
    public function collaborators(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'specimen_collaborators', 'specimen_id', 'user_id')
            ->withPivot(['macroscopy_access', 'microscopy_access'])
            ->withTimestamps();
    }

    public function invoiceRelation(): HasOne
    {
        return $this->hasOne(Invoice::class, 'specimen_id');
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(SpecimenReport::class, 'report_id');
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(SpecimenGroup::class, 'group_id');
    }

    /**
     * Obtiene las comisiones generadas por este espécimen.
     */
    public function commissions(): HasMany
    {
        return $this->hasMany(UserCommission::class, 'specimen_id');
    }

    /**
     * Get the invoice breakdown record for this specimen.
     */
    public function invoiceGroupSpecimen(): HasOne
    {
        return $this->hasOne(InvoiceSpecimen::class, 'specimen_id');
    }

    /**
     * Get the invoice breakdown record for this specimen.
     */
    public function invoiceSpecimen(): HasOne
    {
        return $this->hasOne(InvoiceSpecimen::class, 'specimen_id');
    }

    /**
     * Obtiene las órdenes de trabajo asociadas al espécimen.
     */
    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class, 'specimen_id');
    }

    /**
     * Obtiene los cortes asociados al espécimen.
     */
    public function cuttings(): HasMany
    {
        return $this->hasMany(Cutting::class, 'specimen_id');
    }
}
