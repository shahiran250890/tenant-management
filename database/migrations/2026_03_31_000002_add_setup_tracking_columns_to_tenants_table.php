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
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('setup_stage', 255)->nullable()->after('setup_status');
            $table->text('setup_error')->nullable()->after('setup_stage');
            $table->timestamp('setup_failed_at')->nullable()->after('setup_error');
            $table->timestamp('setup_completed_at')->nullable()->after('setup_failed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'setup_stage',
                'setup_error',
                'setup_failed_at',
                'setup_completed_at',
            ]);
        });
    }
};
