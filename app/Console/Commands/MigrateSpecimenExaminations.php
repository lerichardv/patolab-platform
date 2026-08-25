<?php

namespace App\Console\Commands;

use App\Models\InvoiceSpecimen;
use App\Models\Specimen;
use App\Models\SpecimenExamination;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateSpecimenExaminations extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'specimen:migrate-examinations';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrates existing specimen examination relationships into specimen_examinations and updates invoice_specimens.examination_id';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting migration of specimen examinations...');

        $countPivot = 0;
        $countInvoices = 0;

        DB::transaction(function () use (&$countPivot, &$countInvoices) {
            $specimens = Specimen::whereNotNull('specimen_type_examination')->get();

            foreach ($specimens as $specimen) {
                $exists = SpecimenExamination::where('specimen_id', $specimen->id)
                    ->where('examination_id', $specimen->specimen_type_examination)
                    ->exists();

                if (! $exists) {
                    SpecimenExamination::create([
                        'specimen_id' => $specimen->id,
                        'examination_id' => $specimen->specimen_type_examination,
                    ]);
                    $countPivot++;
                }

                $updated = InvoiceSpecimen::where('specimen_id', $specimen->id)
                    ->whereNull('examination_id')
                    ->update([
                        'examination_id' => $specimen->specimen_type_examination,
                    ]);

                $countInvoices += $updated;
            }
        });

        $this->info("Successfully migrated {$countPivot} specimen_examinations pivot records.");
        $this->info("Successfully updated {$countInvoices} invoice_specimens records with examination_id.");

        return Command::SUCCESS;
    }
}
