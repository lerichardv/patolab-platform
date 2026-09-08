<?php

namespace App\Providers;

use App\Models\Product;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\Events\ConnectionEstablished;
use Illuminate\Database\SQLiteConnection;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
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

        Event::listen(ConnectionEstablished::class, function ($event) {
            if ($event->connection instanceof SQLiteConnection) {
                $event->connection->getPdo()->sqliteCreateFunction('like', function ($pattern, $value) {
                    if ($value === null || $pattern === null) {
                        return 0;
                    }
                    $pattern = mb_strtolower(Str::ascii((string) $pattern));
                    $value = mb_strtolower(Str::ascii((string) $value));
                    $regex = '/^'.str_replace(['%', '_'], ['.*', '.'], preg_quote($pattern, '/')).'$/us';

                    return preg_match($regex, $value) ? 1 : 0;
                }, 2);
            }
        });

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
