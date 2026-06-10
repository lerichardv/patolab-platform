<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Department;
use App\Models\Municipality;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $type = $this->faker->randomElement(['cliente', 'empresa']);

        return [
            'name' => $type === 'cliente' ? $this->faker->name() : $this->faker->company(),
            'id_number' => $this->faker->unique()->numerify('0801-####-#####'),
            'type' => $type,
            'age' => $type === 'cliente' ? $this->faker->numberBetween(18, 80) : null,
            'phone' => $this->faker->numerify('####-####'),
            'gender' => $this->faker->randomElement(['Hombre', 'Mujer', 'Otro']),
            'state' => function () {
                return Department::inRandomOrder()->first()?->id ?? 1;
            },
            'city' => function (array $attributes) {
                return Municipality::where('department_id', $attributes['state'])->inRandomOrder()->first()?->id
                    ?? Municipality::inRandomOrder()->first()?->id
                    ?? 1;
            },
            'secondary_phone' => $this->faker->optional()->numerify('####-####'),
            'address' => $this->faker->address(),
            'email' => $this->faker->safeEmail(),
            'active' => true,
        ];
    }
}
