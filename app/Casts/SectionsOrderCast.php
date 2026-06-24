<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;

class SectionsOrderCast implements CastsAttributes
{
    /**
     * Cast the given value.
     *
     * @param  array<string, mixed>  $attributes
     * @return array<int, array{key: string, order: int, active: bool}>|null
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

        return array_map(function ($item) {
            return [
                'key' => (string) ($item['key'] ?? ''),
                'order' => (int) ($item['order'] ?? 0),
                'active' => (bool) ($item['active'] ?? false),
            ];
        }, $data);
    }

    /**
     * Prepare the given value for storage.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if (is_null($value)) {
            return null;
        }

        if (! is_array($value)) {
            throw new InvalidArgumentException('The sections_order value must be an array.');
        }

        $formatted = array_map(function ($item) {
            if (! isset($item['key'])) {
                throw new InvalidArgumentException('Each sections_order item must have a key.');
            }

            return [
                'key' => (string) $item['key'],
                'order' => (int) ($item['order'] ?? 0),
                'active' => (bool) ($item['active'] ?? false),
            ];
        }, $value);

        return json_encode($formatted);
    }
}
