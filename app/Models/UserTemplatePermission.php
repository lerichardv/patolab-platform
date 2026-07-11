<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * UserTemplatePermission Model
 *
 * This model/table is used to share templates permissions with other users.
 * It tracks which template is shared by its owner with which user.
 */
class UserTemplatePermission extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'user_templates_permissions';

    protected $fillable = [
        'owner_id',
        'specimen_type_id',
        'specimen_type_examination_id',
        'template_id',
        'shared_with_id',
    ];

    /**
     * Get the owner of the shared template.
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Get the template that is being shared.
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(SpecimenTypeTemplate::class, 'template_id');
    }

    /**
     * Get the specimen type for this permission.
     */
    public function specimenType(): BelongsTo
    {
        return $this->belongsTo(SpecimenType::class, 'specimen_type_id');
    }

    /**
     * Get the specimen type examination for this permission.
     */
    public function specimenTypeExamination(): BelongsTo
    {
        return $this->belongsTo(SpecimenTypeExamination::class, 'specimen_type_examination_id');
    }

    /**
     * Get the user with whom the template is shared.
     */
    public function sharedWith(): BelongsTo
    {
        return $this->belongsTo(User::class, 'shared_with_id');
    }
}
