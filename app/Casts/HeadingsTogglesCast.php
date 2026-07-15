<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;

class HeadingsTogglesCast implements CastsAttributes
{
    /**
     * Cast the stored JSON value to an associative array of key => bool.
     *
     * Each key is a report section field name (e.g. 'macroscopy_html') and the
     * boolean value indicates whether that section's heading title is visible.
     *
     * @param  array<string, mixed>  $attributes
     * @return array<string, bool>|null
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): ?array
    {
        if (is_null($value)) {
            return null;
        }

        $data = json_decode($value, true);

        if (! is_array($data)) {
            return [];
        }

        return array_map(fn ($v) => (bool) $v, $data);
    }

    /**
     * Prepare the given value for storage as a JSON string.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if (is_null($value)) {
            return null;
        }

        if (! is_array($value)) {
            throw new InvalidArgumentException('The headings_toggles value must be an array.');
        }

        $formatted = array_map(fn ($v) => (bool) $v, $value);

        return json_encode($formatted);
    }
}
