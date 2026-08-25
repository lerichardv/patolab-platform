export interface ExaminationPrice {
    id: number;
    amount: string | number;
    description?: string | null;
}

export interface SpecimenTypeExamination {
    id: number;
    name: string;
    prices?: ExaminationPrice[];
}

export interface InvoiceItemData {
    examination_id?: number | null;
    selected_price?: string | null;
    custom_specimen_price?: string | number | null;
    quantity?: number | null;
    age_discount_type?: 'third' | 'fourth' | null;
    additional_discount_enabled?: boolean | null;
    additional_discount?: string | number | null;
    amount?: string | number | null;
    available_prices?: ExaminationPrice[] | null;
    examination?: SpecimenTypeExamination | null;
    max_price?: number | null;
}

export interface CalculatedItem {
    examination_id: number | null;
    quantity: number;
    amount: number;
    discount: number;
    subtotal: number;
    exempt_amount: number;
    taxable_amount_15: number;
    taxable_amount_18: number;
    isv_15: number;
    isv_18: number;
    total: number;
    selected_price: string;
    custom_specimen_price: number;
    additional_discount_enabled: boolean;
    additional_discount: number;
    age_discount_type: 'third' | 'fourth' | null;
    age_discount_amount: number;
    ageDiscountAmount: number;
    addDiscountAmount: number;
    maxPrice: number;
    basePrice: number;
    priceDiscount: number;
    totalUnitDiscount: number;
    totalLineDiscount: number;
    lineSubtotal: number;
    lineAmount: number;
}

export interface ConsolidatedTotals {
    quantity: number;
    amount: number;
    discount: number;
    subtotal: number;
    exempt_amount: number;
    taxable_amount_15: number;
    taxable_amount_18: number;
    isv_15: number;
    isv_18: number;
    total: number;
}

export interface CalculationSettings {
    third_age_discount?: string | number | null;
    fourth_age_discount?: string | number | null;
}

/**
 * Calculate line item financial breakdown matching App\Services\InvoiceCalculationService::calculateItem
 */
export function calculateInvoiceItem(
    itemData: InvoiceItemData,
    examination?: SpecimenTypeExamination | null,
    settings?: CalculationSettings | null,
): CalculatedItem {
    const thirdAgePercent = parseFloat(
        (settings?.third_age_discount ?? '30').toString(),
    );
    const fourthAgePercent = parseFloat(
        (settings?.fourth_age_discount ?? '40').toString(),
    );

    const exam = examination || itemData.examination;
    const prices = exam?.prices || itemData.available_prices || [];
    const priceAmounts = prices.map(
        (p) => parseFloat(p.amount.toString()) || 0,
    );
    let maxPrice =
        priceAmounts.length > 0
            ? Math.max(...priceAmounts)
            : itemData.max_price || 0;

    const selectedPrice =
        itemData.selected_price ??
        (prices.length > 0 ? prices[0].amount.toString() : '');
    const customPrice =
        parseFloat((itemData.custom_specimen_price ?? '0').toString()) || 0;

    let basePrice: number;

    if (selectedPrice === 'custom') {
        basePrice = customPrice > 0 ? customPrice : maxPrice;
    } else if (
        selectedPrice !== '' &&
        !isNaN(parseFloat(selectedPrice)) &&
        parseFloat(selectedPrice) > 0
    ) {
        basePrice = parseFloat(selectedPrice);
    } else {
        const itemAmount = parseFloat((itemData.amount ?? '0').toString()) || 0;
        basePrice = itemAmount > 0 ? itemAmount : maxPrice;
    }

    maxPrice = Math.max(maxPrice, basePrice);
    const qty = Math.max(1, parseInt((itemData.quantity ?? 1).toString()) || 1);

    const priceDiscountVal = Math.max(0, maxPrice - basePrice);

    const ageDiscountType = itemData.age_discount_type || null;
    let ageDiscountVal = 0;

    if (ageDiscountType === 'third') {
        ageDiscountVal = (basePrice * thirdAgePercent) / 100;
    } else if (ageDiscountType === 'fourth') {
        ageDiscountVal = (basePrice * fourthAgePercent) / 100;
    }

    const additionalEnabled = !!itemData.additional_discount_enabled;
    const addDiscountVal = additionalEnabled
        ? parseFloat((itemData.additional_discount ?? '0').toString()) || 0
        : 0;

    const totalDiscountPerUnit =
        priceDiscountVal + ageDiscountVal + addDiscountVal;
    const totalDiscountVal = totalDiscountPerUnit * qty;

    const subtotalVal = Math.max(0, (maxPrice - totalDiscountPerUnit) * qty);
    const totalVal = subtotalVal;

    return {
        examination_id: exam?.id ?? itemData.examination_id ?? null,
        quantity: qty,
        amount: basePrice,
        discount: totalDiscountVal,
        subtotal: subtotalVal,
        exempt_amount: totalVal,
        taxable_amount_15: 0,
        taxable_amount_18: 0,
        isv_15: 0,
        isv_18: 0,
        total: totalVal,
        selected_price: selectedPrice,
        custom_specimen_price: customPrice,
        additional_discount_enabled: additionalEnabled,
        additional_discount: addDiscountVal,
        age_discount_type: ageDiscountType,
        age_discount_amount: ageDiscountVal * qty,
        ageDiscountAmount: ageDiscountVal * qty,
        addDiscountAmount: addDiscountVal * qty,
        maxPrice,
        basePrice,
        priceDiscount: priceDiscountVal * qty,
        totalUnitDiscount: totalDiscountPerUnit,
        totalLineDiscount: totalDiscountVal,
        lineSubtotal: subtotalVal,
        lineAmount: maxPrice * qty,
    };
}

/**
 * Calculate consolidated invoice totals matching App\Services\InvoiceCalculationService::calculateConsolidatedTotals
 */
export function calculateConsolidatedTotals(
    calculatedItems: CalculatedItem[],
    insumosTotal: number = 0,
    customAmount: number = 0,
): ConsolidatedTotals {
    let totalQty = 0;
    let totalAmount = 0;
    let totalDiscount = 0;
    let totalSubtotal = 0;

    calculatedItems.forEach((item) => {
        totalQty += item.quantity;
        totalAmount += item.lineAmount;
        totalDiscount += item.discount;
        totalSubtotal += item.subtotal;
    });

    const grandSubtotal = totalSubtotal + insumosTotal + customAmount;
    const grandTotal = grandSubtotal;

    return {
        quantity: totalQty,
        amount: totalAmount + customAmount,
        discount: totalDiscount,
        subtotal: grandSubtotal,
        exempt_amount: grandTotal,
        taxable_amount_15: 0,
        taxable_amount_18: 0,
        isv_15: 0,
        isv_18: 0,
        total: grandTotal,
    };
}
