export interface SpecimenForPatientCardHeight {
    customer_relation?: { name?: string | null } | null;
    referrer_relation?: { name?: string | null; notes?: string | null } | null;
    diagnosis?: string | null;
    anatomic_site?: string | null;
}

export function estimatePatientCardHeight(
    specimen: SpecimenForPatientCardHeight,
): number {
    const customer = specimen.customer_relation;
    const referrer = specimen.referrer_relation;

    const customerName = customer?.name || '';
    const referrerName = referrer?.name || '';
    const specimenDiagnosis = specimen.diagnosis || '';
    const referrerNotes = referrer?.notes || '';
    const anatomicSite = specimen.anatomic_site || '';

    // Left column (50% width ≈ 93mm)
    const left1 = Math.ceil((8 + customerName.length) / 46);
    const left2 = 1; // age/gender
    const left3 = Math.ceil((11 + referrerName.length) / 46);
    const left4 = Math.ceil((18 + referrerNotes.length) / 46);
    const leftLines = left1 + left2 + left3 + left4;

    // Right column (50% width ≈ 93mm)
    const right1 = Math.ceil((21 + specimenDiagnosis.length) / 46);
    const right2 = Math.ceil((17 + anatomicSite.length) / 46);
    const rightLines = right1 + right2 + 2; // + 2 for sample_collection_date and report_date

    const totalLines = Math.max(leftLines, rightLines) + 1;

    return totalLines * 4.8;
}
