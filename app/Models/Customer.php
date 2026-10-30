<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Customer extends Authenticatable
{
    use Auditable;
    use HasFactory;
    use Notifiable;

    protected $fillable = [
        'name',
        'id_number',
        'age',
        'age_unit',
        'phone',
        'gender',
        'state',
        'city',
        'type',
        'secondary_phone',
        'address',
        'email',
        'password',
        'portal_access',
        'last_portal_login_at',
        'active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'formatted_age',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'portal_access' => 'boolean',
            'active' => 'boolean',
            'last_portal_login_at' => 'datetime',
        ];
    }

    public function getFormattedAgeAttribute(): ?string
    {
        if ($this->age === null || $this->age === '') {
            return null;
        }

        $age = (int) $this->age;
        $unit = $this->age_unit ?? 'years';

        return match ($unit) {
            'days' => $age === 1 ? '1 día' : "{$age} días",
            'months' => $age === 1 ? '1 mes' : "{$age} meses",
            default => $age === 1 ? '1 año' : "{$age} años",
        };
    }

    public function department()
    {
        return $this->belongsTo(Department::class, 'state');
    }

    public function municipality()
    {
        return $this->belongsTo(Municipality::class, 'city');
    }

    public function specimenGroups(): BelongsToMany
    {
        return $this->belongsToMany(SpecimenGroup::class, 'specimen_group_customers', 'customer_id', 'specimen_group_id')
            ->withTimestamps();
    }

    public function priceQuotes(): HasMany
    {
        return $this->hasMany(PriceQuote::class, 'customer_id');
    }

    public function specimens(): HasMany
    {
        return $this->hasMany(Specimen::class, 'customer');
    }

    /**
     * Get a query builder for all specimens accessible to this customer in the portal.
     *
     * Individual customers access their direct specimens and invoices where they are the billing or individual customer.
     * Company/Group customers access direct specimens and specimens within their groups.
     */
    public function accessibleSpecimens(): Builder
    {
        return Specimen::query()->where(function ($query) {
            $query->where('customer', $this->id)
                ->orWhereHas('group', function ($gq) {
                    $gq->where('customer_id', $this->id);
                })
                ->orWhereHas('group.customers', function ($gq) {
                    $gq->where('customers.id', $this->id);
                })
                ->orWhereHas('invoiceRelation', function ($iq) {
                    $iq->where('customer_id', $this->id)
                        ->orWhere('individual_customer_id', $this->id);
                })
                ->orWhereHas('group.invoice', function ($iq) {
                    $iq->where('customer_id', $this->id);
                });
        });
    }
}
