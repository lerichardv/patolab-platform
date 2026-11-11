<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoicePayment;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

class InvoicePaymentService
{
    /**
     * Get validation rules for mixed payments.
     */
    public static function validationRules(string $prefix = 'payments'): array
    {
        return [
            $prefix => 'required|array|min:2',
            "{$prefix}.*.payment_method" => 'required|in:cash,credit card,bank transfer,check',
            "{$prefix}.*.amount" => 'required|numeric|min:0.01',
            "{$prefix}.*.payment_date" => 'nullable|date',
            "{$prefix}.*.check_number" => 'nullable|string|max:100',
            "{$prefix}.*.card_last_4" => 'nullable|string|max:10',
            "{$prefix}.*.card_expiration" => 'nullable|string|max:10',
            "{$prefix}.*.card_authorization_code" => 'nullable|string|max:100',
            "{$prefix}.*.transfer_bank_id" => 'nullable|exists:banks,id',
            "{$prefix}.*.transfer_authorization_code" => 'nullable|string|max:100',
            "{$prefix}.*.proof_of_payment" => 'nullable',
        ];
    }

    /**
     * Validate that the sum of payment amounts matches the expected total.
     *
     * @throws ValidationException
     */
    public static function validateTotal(array $payments, float $expectedTotal, string $errorKey = 'payments'): void
    {
        $sum = 0.0;
        foreach ($payments as $payment) {
            $sum += (float) ($payment['amount'] ?? 0);
        }

        if (abs(round($sum, 2) - round($expectedTotal, 2)) > 0.01) {
            throw ValidationException::withMessages([
                $errorKey => [
                    'La suma de los pagos mixtos (L. '.number_format($sum, 2).') debe ser exactamente igual al total a pagar (L. '.number_format($expectedTotal, 2).').',
                ],
            ]);
        }
    }

    /**
     * Save mixed payment breakdown lines for an invoice.
     */
    public static function savePayments(Invoice $invoice, array $payments, ?Request $request = null): void
    {
        foreach ($payments as $index => $paymentData) {
            $voucherPath = null;
            $voucherFile = null;

            if ($request && $request->hasFile("payments.{$index}.proof_of_payment")) {
                $voucherFile = $request->file("payments.{$index}.proof_of_payment");
            } elseif (isset($paymentData['proof_of_payment']) && $paymentData['proof_of_payment'] instanceof UploadedFile) {
                $voucherFile = $paymentData['proof_of_payment'];
            }

            if ($voucherFile) {
                $voucherPath = app(ImageOptimizerService::class)->optimizeAndStore(
                    $voucherFile,
                    'proofs'
                );
            } elseif (! empty($paymentData['proof_of_payment']) && is_string($paymentData['proof_of_payment'])) {
                $voucherPath = $paymentData['proof_of_payment'];
            }

            InvoicePayment::create([
                'invoice_id' => $invoice->id,
                'payment_method' => $paymentData['payment_method'],
                'amount' => (float) $paymentData['amount'],
                'payment_date' => $paymentData['payment_date'] ?? $invoice->payment_method_date ?? now()->toDateString(),
                'check_number' => $paymentData['check_number'] ?? null,
                'card_last_4' => $paymentData['card_last_4'] ?? null,
                'card_expiration' => $paymentData['card_expiration'] ?? null,
                'card_authorization_code' => $paymentData['card_authorization_code'] ?? null,
                'transfer_bank_id' => ! empty($paymentData['transfer_bank_id']) ? (int) $paymentData['transfer_bank_id'] : null,
                'transfer_authorization_code' => $paymentData['transfer_authorization_code'] ?? null,
                'proof_of_payment' => $voucherPath,
                'created_by_id' => auth()->id() ?? $invoice->created_by_id,
            ]);
        }
    }

    /**
     * Sync mixed payments on invoice update.
     */
    public static function syncPayments(Invoice $invoice, array $payments, ?Request $request = null): void
    {
        $invoice->payments()->delete();
        self::savePayments($invoice, $payments, $request);
    }
}
