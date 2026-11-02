<?php

namespace App\Events;

use App\Models\WorkOrder;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WorkOrderUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public int $workOrderId,
        public string $action = 'updated',
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('work-orders'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'WorkOrderUpdated';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $workOrder = WorkOrder::with(['specimen', 'task'])->find($this->workOrderId);
        $specimenCode = $workOrder?->specimen?->sequence_code ?? ($workOrder ? "#{$workOrder->specimen_id}" : null);
        $taskName = $workOrder?->task?->name ?? $workOrder?->type?->name ?? 'Orden de trabajo';

        $title = match ($this->action) {
            'created' => "Nueva Orden #{$this->workOrderId}",
            'status_changed' => "Estado actualizado (#{$this->workOrderId})",
            'assigned' => "Técnico asignado (#{$this->workOrderId})",
            'unassigned' => "Técnico desasignado (#{$this->workOrderId})",
            'deleted' => "Orden eliminada (#{$this->workOrderId})",
            default => "Orden #{$this->workOrderId} actualizada",
        };

        $description = match ($this->action) {
            'created' => "Se generó una nueva orden de {$taskName}".($specimenCode ? " en muestra {$specimenCode}" : ''),
            'status_changed' => 'La orden cambió a estado: '.($workOrder?->status ?? 'Actualizado'),
            'assigned' => "Se asignó técnico a la orden {$taskName}",
            'unassigned' => "Se desasignó técnico de la orden {$taskName}",
            default => "La orden {$taskName}".($specimenCode ? " ({$specimenCode})" : '').' fue actualizada.',
        };

        return [
            'work_order_id' => $this->workOrderId,
            'action' => $this->action,
            'title' => $title,
            'description' => $description,
            'status' => $workOrder?->status,
            'specimen_code' => $specimenCode,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
