<?php

namespace App\Providers;

use App\Models\Product;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        Relation::morphMap([
            'product' => Product::class,
            'specimen type' => SpecimenType::class,
            'specimen type examination' => SpecimenTypeExamination::class,
        ]);

        Gate::before(function ($user, $ability) {
            if ($user->role) {
                if ($user->role->slug === 'admin') {
                    return true;
                }

                return $user->role->permissions()->where('slug', $ability)->exists() ? true : false;
            }

            return false;
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
