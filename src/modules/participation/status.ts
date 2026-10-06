// Host applications provide facts. Uploading a receipt is never payment verification.
export function paymentState(input: { totalAmount: number; receiptReceived: boolean; legacyReceiptAt?: Date | string | null }) {
  if (input.totalAmount === 0) return 'NO_CHARGE' as const;
  if (input.receiptReceived || input.legacyReceiptAt) return 'RECEIPT_RECEIVED_UNVERIFIED' as const;
  return 'AWAITING_RECEIPT' as const;
}
export function submissionTasks(input: { status: string; owner: boolean; fileRequired: boolean; fileReceived: boolean; registrationEnabled: boolean; registered: boolean; presenter: boolean }) {
  const tasks: string[] = [];
  if (input.status === 'DRAFT' && input.owner) {
    tasks.push('COMPLETE_DRAFT');
    if (input.fileRequired && !input.fileReceived) tasks.push('UPLOAD_SUBMISSION_FILE');
  }
  if (input.status === 'ACCEPTED' && input.presenter && input.registrationEnabled && !input.registered) tasks.push('REGISTER_ACCEPTED_PAPER');
  return tasks;
}
