<?php

namespace App\Models;

use App\Services\ResendService;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Traits\Auditable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Laravel\Fortify\TwoFactorAuthenticatable;

#[Fillable(['name', 'email', 'password', 'active', 'role_id', 'user_signature'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    use Auditable;

    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that should be appended to the model's array form.
     *
     * @var array
     */
    protected $appends = ['signature_url'];

    /**
     * Get the public URL for the user signature.
     * Pathologists' signatures are critical during the report finalization process.
     * The PDF generation engine uses these signatures to sign off the document.
     */
    protected function signatureUrl(): Attribute
    {
        return Attribute::get(fn () => $this->user_signature ? Storage::disk('public')->url($this->user_signature) : null);
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Obtiene las muestras asignadas al usuario.
     */
    public function specimens(): BelongsToMany
    {
        return $this->belongsToMany(Specimen::class, 'specimen_user', 'user_id', 'specimen_id')
            ->using(SpecimenUser::class)
            ->withPivot(['macroscopy_access', 'microscopy_access'])
            ->withTimestamps();
    }

    /**
     * Obtiene las muestras a las que el usuario está asignado como colaborador.
     */
    public function collaboratorSpecimens(): BelongsToMany
    {
        return $this->belongsToMany(Specimen::class, 'specimen_collaborators', 'user_id', 'specimen_id')
            ->withPivot(['macroscopy_access', 'microscopy_access'])
            ->withTimestamps();
    }

    /**
     * Obtiene las reglas de comisión asociadas al usuario (patólogo).
     */
    public function commissionRules(): HasMany
    {
        return $this->hasMany(UserCommissionRule::class, 'user_id');
    }

    /**
     * Obtiene las comisiones generadas por el usuario.
     */
    public function commissions(): HasMany
    {
        return $this->hasMany(UserCommission::class, 'user_id');
    }

    /**
     * Obtiene las órdenes de trabajo asignadas al usuario como técnico.
     */
    public function assignedWorkOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class, 'user_id');
    }

    /**
     * Obtiene las órdenes de trabajo finalizadas por el usuario.
     */
    public function completedWorkOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class, 'completed_by_id');
    }

    /**
     * Obtiene las órdenes de trabajo a las que el usuario está asociado (muchos a muchos).
     */
    public function workOrders(): BelongsToMany
    {
        return $this->belongsToMany(WorkOrder::class, 'work_orders_users', 'user_id', 'work_order_id')
            ->using(WorkOrderUser::class)
            ->withTimestamps();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    /**
     * Send the password reset notification.
     *
     * @param  string  $token
     * @return void
     */
    public function sendPasswordResetNotification($token)
    {
        $resetUrl = route('password.reset', [
            'token' => $token,
            'email' => $this->email,
        ]);

        $expire = config('auth.passwords.users.expire', 60);

        $htmlContent = view('emails.password_reset', [
            'resetUrl' => $resetUrl,
            'expire' => $expire,
            'user' => $this,
        ])->render();

        try {
            $resend = app(ResendService::class);
            $resend->sendEmail($this->email, 'Restablecer Contraseña — PatoLab', $htmlContent);
        } catch (\Exception $e) {
            Log::error('Error sending password reset email: '.$e->getMessage());
        }
    }

    /**
     * Send the email verification notification.
     *
     * @return void
     */
    public function sendEmailVerificationNotification()
    {
        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(config('auth.verification.expire', 60)),
            [
                'id' => $this->getKey(),
                'hash' => sha1($this->getEmailForVerification()),
            ]
        );

        $htmlContent = view('emails.email_verification', [
            'verificationUrl' => $verificationUrl,
            'user' => $this,
        ])->render();

        try {
            $resend = app(ResendService::class);
            $resend->sendEmail($this->email, 'Verificar Dirección de Correo — PatoLab', $htmlContent);
        } catch (\Exception $e) {
            Log::error('Error sending verification email: '.$e->getMessage());
        }
    }
}
