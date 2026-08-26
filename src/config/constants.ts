// Fixed VAT rate applied everywhere a client-facing total is computed —
// the estimate the client approves, the follow-up email for an additional
// cost, and the invoice issued afterward. Kept as a single constant instead
// of a per-invoice override so an invoice can never end up taxed at a
// different rate than what the client already approved.
export const TAX_RATE = 22;
