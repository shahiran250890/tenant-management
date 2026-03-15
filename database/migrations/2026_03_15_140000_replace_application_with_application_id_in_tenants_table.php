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
        Schema::table('tenants', function (Blueprint $table) {
            $table->foreignId('application_id')->nullable()->after('storage_domain')->constrained('applications')->nullOnDelete();
        });

        if (Schema::hasColumn('tenants', 'application')) {
            DB::table('tenants')
                ->whereNotNull('application')
                ->orderBy('id')
                ->chunk(100, function ($tenants) {
                    foreach ($tenants as $tenant) {
                        $app = DB::table('applications')->where('code', $tenant->application)->first();
                        if ($app) {
                            DB::table('tenants')->where('id', $tenant->id)->update(['application_id' => $app->id]);
                        }
                    }
                });

            Schema::table('tenants', function (Blueprint $table) {
                $table->dropColumn(['application']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasColumn('tenants', 'application')) {
            Schema::table('tenants', function (Blueprint $table) {
                $table->string('application', 255)->nullable()->after('storage_domain');
            });

            DB::table('tenants')
                ->whereNotNull('application_id')
                ->orderBy('id')
                ->chunk(100, function ($tenants) {
                    foreach ($tenants as $tenant) {
                        $app = DB::table('applications')->find($tenant->application_id);
                        if ($app) {
                            DB::table('tenants')->where('id', $tenant->id)->update(['application' => $app->code]);
                        }
                    }
                });
        }

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropConstrainedForeignId('application_id');
        });
    }
};
