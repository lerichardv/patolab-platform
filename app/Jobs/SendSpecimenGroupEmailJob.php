<?php

namespace App\Jobs;

use App\Models\SpecimenGroup;
use App\Services\ResendService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendSpecimenGroupEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected SpecimenGroup $group;

    protected string $type;

    /**
     * Create a new job instance.
     *
     * @param  string  $type  Currently 'created'
     */
    public function __construct(SpecimenGroup $group, string $type = 'created')
    {
        $this->group = $group;
        $this->type = $type;
        $this->afterCommit = true;
    }

    /**
     * Execute the job.
     */
    public function handle(ResendService $resend): void
    {
        // 1. Load relationships
        $this->group->load(['specimens.customerRelation', 'specimens.type', 'specimens.examination', 'customer']);

        $customer = $this->group->customer;
        if (! $customer) {
            Log::warning("SendSpecimenGroupEmailJob: Global Customer not found for SpecimenGroup ID {$this->group->id}. Skipping email.");

            return;
        }

        if (empty($customer->email)) {
            Log::warning("SendSpecimenGroupEmailJob: Global Customer {$customer->name} (ID {$customer->id}) has no email address configured. Skipping email.");

            return;
        }

        // 2. Prepare parameters based on type
        $to = $customer->email;
        $attachments = [];

        if ($this->type === 'created') {
            $subject = "Registro de Muestras Registrado — Grupo: {$this->group->name}";
            $statusUrl = route('specimen-groups.show-public', [
                'id' => $this->group->id,
                'token' => $this->group->access_token,
            ]);

            $htmlContent = view('emails.specimen_group_created', [
                'group' => $this->group,
                'customer' => $customer,
                'statusUrl' => $statusUrl,
            ])->render();
        } else {
            Log::error("SendSpecimenGroupEmailJob: Invalid notification type: '{$this->type}' specified for SpecimenGroup ID {$this->group->id}.");

            return;
        }

        // 3. Send email via Resend Service
        $resend->sendEmail($to, $subject, $htmlContent, $attachments);
    }
}
