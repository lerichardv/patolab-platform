<?php

namespace App\Jobs;

use App\Models\Specimen;
use App\Services\ResendService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SendSpecimenEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected Specimen $specimen;

    protected string $type;

    /**
     * Create a new job instance.
     *
     * @param  string  $type  Either 'created' or 'finalized'
     */
    public function __construct(Specimen $specimen, string $type)
    {
        $this->specimen = $specimen;
        $this->type = $type;
        $this->afterCommit = true;
    }

    /**
     * Execute the job.
     */
    public function handle(ResendService $resend): void
    {
        // 1. Load relationships
        $this->specimen->load(['customerRelation', 'type', 'examination', 'report']);

        $customer = $this->specimen->customerRelation;
        if (! $customer) {
            Log::warning("SendSpecimenEmailJob: Customer not found for Specimen ID {$this->specimen->id}. Skipping email.");

            return;
        }

        if (empty($customer->email)) {
            Log::warning("SendSpecimenEmailJob: Customer {$customer->name} (ID {$customer->id}) has no email address configured. Skipping email.");

            return;
        }

        // 2. Prepare parameters based on notification type
        $to = $customer->email;
        $attachments = [];

        if ($this->type === 'created') {
            $subject = "Registro de Muestra — {$this->specimen->sequence_code}";
            $statusUrl = route('specimens.show-public', [
                'specimen_code' => $this->specimen->sequence_code,
                'token' => $this->specimen->access_token,
            ]);

            $htmlContent = view('emails.specimen_created', [
                'specimen' => $this->specimen,
                'customer' => $customer,
                'statusUrl' => $statusUrl,
            ])->render();

        } elseif ($this->type === 'finalized') {
            $subject = "Reporte Listo — {$this->specimen->sequence_code}";
            $statusUrl = route('specimens.show-public', [
                'specimen_code' => $this->specimen->sequence_code,
                'token' => $this->specimen->access_token,
                'delivery_token' => $this->specimen->delivery_token,
            ]);

            // Add the report PDF as a standard email attachment
            if ($this->specimen->report && $this->specimen->report->report_file) {
                $reportFile = $this->specimen->report->report_file;
                if (Storage::disk('public')->exists($reportFile)) {
                    $attachments[] = [
                        'content' => base64_encode(Storage::disk('public')->get($reportFile)),
                        'filename' => "Reporte_{$this->specimen->sequence_code}.pdf",
                    ];
                } else {
                    Log::error("SendSpecimenEmailJob: PDF report file not found on public storage at: {$reportFile}");
                }
            } else {
                Log::error("SendSpecimenEmailJob: Specimen report or report file path not found for finalized Specimen ID {$this->specimen->id}.");
            }

            $htmlContent = view('emails.specimen_finalized', [
                'specimen' => $this->specimen,
                'customer' => $customer,
                'statusUrl' => $statusUrl,
            ])->render();
        } else {
            Log::error("SendSpecimenEmailJob: Invalid notification type: '{$this->type}' specified for Specimen ID {$this->specimen->id}.");

            return;
        }

        // 3. Send email via Resend Service
        $resend->sendEmail($to, $subject, $htmlContent, $attachments);
    }
}
