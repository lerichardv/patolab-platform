<?php

namespace App\Observers;

use App\Events\WorkOrderUpdated;
use App\Models\WorkOrder;

class WorkOrderObserver
{
    /**
     * Handle the WorkOrder "created" event.
     */
    public function created(WorkOrder $workOrder): void
    {
        WorkOrderUpdated::dispatch($workOrder->id, 'created');
    }

    /**
     * Handle the WorkOrder "updated" event.
     */
    public function updated(WorkOrder $workOrder): void
    {
        $action = $workOrder->wasChanged('status') ? 'status_changed' : 'updated';
        WorkOrderUpdated::dispatch($workOrder->id, $action);
    }

    /**
     * Handle the WorkOrder "deleted" event.
     */
    public function deleted(WorkOrder $workOrder): void
    {
        WorkOrderUpdated::dispatch($workOrder->id, 'deleted');
    }

    /**
     * Handle the WorkOrder "restored" event.
     */
    public function restored(WorkOrder $workOrder): void
    {
        WorkOrderUpdated::dispatch($workOrder->id, 'restored');
    }
}
