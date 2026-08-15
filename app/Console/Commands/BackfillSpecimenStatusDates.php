<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\Specimen;
use Illuminate\Console\Command;

class BackfillSpecimenStatusDates extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'specimens:backfill-status-dates
                            {--force : Overwrite existing status dates even if already populated}
                            {--dry-run : Preview changes without updating the database}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backfill missing status change dates for specimens using the audit log';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $isForce = $this->option('force');
        $isDryRun = $this->option('dry-run');

        if ($isDryRun) {
            $this->info('Running in dry-run mode. No database changes will be saved.');
        }

        $table = (new Specimen)->getTable();
        $statusColumns = Specimen::STATUS_DATE_COLUMNS;
        $statuses = array_keys($statusColumns);

        $this->info('Fetching audit logs for specimen status changes...');

        $auditLogs = AuditLog::where('table', $table)
            ->where('column', 'status')
            ->whereIn('new_value', $statuses)
            ->orderBy('created_at', 'asc')
            ->get();

        $auditMap = [];
        foreach ($auditLogs as $log) {
            $rowId = (int) $log->row_id;
            $status = (string) $log->new_value;

            if (! isset($auditMap[$rowId][$status])) {
                $auditMap[$rowId][$status] = $log->created_at;
            }
        }

        $this->info('Processing specimens...');

        $updatedSpecimensCount = 0;
        $updatedFieldsCount = 0;

        Specimen::chunk(100, function ($specimens) use ($statusColumns, $auditMap, $isForce, $isDryRun, &$updatedSpecimensCount, &$updatedFieldsCount) {
            foreach ($specimens as $specimen) {
                $specimenUpdated = false;

                if (! isset($auditMap[$specimen->id])) {
                    continue;
                }

                foreach ($statusColumns as $status => $dateColumn) {
                    if (isset($auditMap[$specimen->id][$status])) {
                        $auditDate = $auditMap[$specimen->id][$status];

                        if ($isForce || is_null($specimen->{$dateColumn})) {
                            $specimen->{$dateColumn} = $auditDate;
                            $specimenUpdated = true;
                            $updatedFieldsCount++;
                        }
                    }
                }

                if ($specimenUpdated) {
                    $updatedSpecimensCount++;
                    if (! $isDryRun) {
                        $specimen->saveQuietly();
                    }
                }
            }
        });

        $prefix = $isDryRun ? '[Dry Run] ' : '';
        $this->info("{$prefix}Completed status date backfill. Updated {$updatedSpecimensCount} specimens ({$updatedFieldsCount} date fields).");

        return Command::SUCCESS;
    }
}
