<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('specimen', function (Blueprint $table) {
            $table->timestamp('received_at')->nullable()->after('status');
            $table->timestamp('macroscopic_review_at')->nullable()->after('received_at');
            $table->timestamp('processing_at')->nullable()->after('macroscopic_review_at');
            $table->timestamp('microscopic_review_at')->nullable()->after('processing_at');
            $table->timestamp('finalized_at')->nullable()->after('microscopic_review_at');
            $table->timestamp('delivered_at')->nullable()->after('finalized_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen', function (Blueprint $table) {
            $columnsToDrop = [
                'received_at',
                'macroscopic_review_at',
                'processing_at',
                'microscopic_review_at',
                'finalized_at',
                'delivered_at',
            ];

            foreach ($columnsToDrop as $column) {
                if (Schema::hasColumn('specimen', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
