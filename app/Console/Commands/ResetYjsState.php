<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ResetYjsState extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'editor:reset-yjs-state
                            {--report= : Reset only the given report ID}
                            {--field=  : Reset only the given field (macroscopy, microscopy, diagnosis, etc.)}
                            {--force   : Skip confirmation prompt}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reset corrupt or stale Yjs binary states (yjs_*_state columns) to NULL so the collaborative editor re-seeds cleanly from the stored HTML on the next connection.';

    /**
     * All rich-text Yjs state columns that can be reset.
     *
     * @var array<string, string>
     */
    private array $columns = [
        'macroscopy' => 'yjs_macroscopy_state',
        'microscopy' => 'yjs_microscopy_state',
        'diagnosis' => 'yjs_diagnosis_state',
        'clinical_details' => 'yjs_clinical_details_state',
        'comments_notes' => 'yjs_comments_notes_state',
        'protocols' => 'yjs_protocols_state',
        'legend' => 'yjs_legend_state',
        'open_text' => 'yjs_open_text_state',
        'addendum' => 'yjs_addendum_state',
        'report_date' => 'yjs_report_date_state',
    ];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $reportId = $this->option('report');
        $field = $this->option('field');
        $force = $this->option('force');

        // Determine target columns
        if ($field) {
            if (! array_key_exists($field, $this->columns)) {
                $this->error("Unknown field '{$field}'. Valid options: ".implode(', ', array_keys($this->columns)));

                return self::FAILURE;
            }

            $targetColumns = [$field => $this->columns[$field]];
        } else {
            $targetColumns = $this->columns;
        }

        $scope = $reportId ? "report ID {$reportId}" : 'ALL reports';
        $fields = implode(', ', array_keys($targetColumns));

        $this->warn("This will set the following Yjs state columns to NULL for {$scope}:");
        $this->line("  Fields: {$fields}");
        $this->newLine();

        if (! $force && ! $this->confirm('Continue?')) {
            $this->info('Aborted.');

            return self::SUCCESS;
        }

        $updateData = array_fill_keys(array_values($targetColumns), null);

        $query = DB::table('specimen_reports');

        if ($reportId) {
            $query->where('id', $reportId);
        }

        $affected = $query->update($updateData);

        $this->info("✓ Reset {$affected} specimen_reports row(s). The editor will re-seed from stored HTML on the next connection.");

        return self::SUCCESS;
    }
}
