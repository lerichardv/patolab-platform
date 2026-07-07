<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropForeign(['work_order_type_id']);
            $table->renameColumn('work_order_type_id', 'old_work_order_type_id');
        });

        Schema::table('work_orders', function (Blueprint $table) {
            $table->text('work_order_type_id')->nullable()->after('specimen_id');
        });

        // Migrate data
        $orders = DB::table('work_orders')->get();
        foreach ($orders as $order) {
            if ($order->old_work_order_type_id) {
                DB::table('work_orders')->where('id', $order->id)->update([
                    'work_order_type_id' => json_encode([(int) $order->old_work_order_type_id]),
                ]);
            } else {
                DB::table('work_orders')->where('id', $order->id)->update([
                    'work_order_type_id' => json_encode([]),
                ]);
            }
        }

        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropColumn('old_work_order_type_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->renameColumn('work_order_type_id', 'old_work_order_type_id');
        });

        Schema::table('work_orders', function (Blueprint $table) {
            $table->foreignId('work_order_type_id')->nullable()->after('specimen_id')->constrained('work_order_types')->onDelete('restrict');
        });

        // Migrate data back
        $orders = DB::table('work_orders')->get();
        foreach ($orders as $order) {
            $array = json_decode($order->old_work_order_type_id, true);
            $firstId = is_array($array) && ! empty($array) ? $array[0] : null;
            DB::table('work_orders')->where('id', $order->id)->update([
                'work_order_type_id' => $firstId,
            ]);
        }

        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropColumn('old_work_order_type_id');
        });
    }
};
