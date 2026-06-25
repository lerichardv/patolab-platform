<?php

namespace App\Http\Middleware;

use Illuminate\Cookie\Middleware\EncryptCookies as Middleware;

class EncryptCookies extends Middleware
{
    /**
     * The names of the cookies that should not be encrypted.
     *
     * @var array<int, string>
     */
    protected $except = [
        'appearance',
        'sidebar_state',
    ];

    /**
     * Determine whether encryption has been disabled for the given cookie.
     *
     * @param  string  $name
     * @return bool
     */
    public function isDisabled($name)
    {
        if (parent::isDisabled($name)) {
            return true;
        }

        $prefixes = [
            'date_filter_',
            'status_filter_',
            'specimen_type_filter_',
            'examination_filter_',
        ];

        foreach ($prefixes as $prefix) {
            if (str_starts_with($name, $prefix)) {
                return true;
            }
        }

        return false;
    }
}
