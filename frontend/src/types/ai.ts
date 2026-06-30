import type { PaymentMethod } from './client'

export interface CAPredictionPoint {
  month: string
  predicted_ca: number
}

export interface CAPredictionResponse {
  predictions: CAPredictionPoint[]
  trend: 'hausse' | 'baisse'
  trend_percentage: number
  model: string
  historical_points: number
}

export interface PaymentDocumentMetadata {
  bank_name?: string | null
  bank_agency?: string | null
  issuer_name?: string | null
  account_rib?: string | null
  drawee_name?: string | null
}

export interface PaymentDocumentAnalysis {
  amount: number | null
  reference: string | null
  date: string | null
  maturity_date?: string | null
  method: PaymentMethod | null
  document_type?: 'cheque' | 'traite' | 'virement' | null
  currency?: 'TND' | 'EUR' | null
  metadata?: PaymentDocumentMetadata | null
}

export interface PaymentBankDetails {
  bank_name: string
  bank_agency: string
  issuer_name: string
  account_rib: string
  maturity_date: string
}

export interface PaymentScanResult {
  amount?: string
  reference?: string
  payment_method?: PaymentMethod
  payment_date?: string
  maturity_date?: string
  bank_name?: string
  bank_agency?: string
  issuer_name?: string
  account_rib?: string
}

export const EMPTY_BANK_DETAILS: PaymentBankDetails = {
  bank_name: '',
  bank_agency: '',
  issuer_name: '',
  account_rib: '',
  maturity_date: '',
}

export function isValidPaymentMethod(value: string | null): value is PaymentMethod {
  return value === 'bank_transfer'
    || value === 'credit_card'
    || value === 'check'
    || value === 'cash'
    || value === 'direct_debit'
}

export function hasBankDetails(details: PaymentBankDetails): boolean {
  return Boolean(
    details.bank_name
    || details.bank_agency
    || details.issuer_name
    || details.account_rib
    || details.maturity_date
  )
}

function pickMeta(data: PaymentDocumentAnalysis): PaymentDocumentMetadata {
  return data.metadata ?? {}
}

export function mapAnalysisToScanResult(data: PaymentDocumentAnalysis): PaymentScanResult {
  const meta = pickMeta(data)
  const result: PaymentScanResult = {}

  if (data.amount != null && data.amount > 0) {
    result.amount = String(data.amount)
  }
  if (data.reference) {
    result.reference = data.reference
  }

  const method = data.method
    ?? (data.document_type === 'cheque' ? 'check' : data.document_type === 'traite' ? 'direct_debit' : null)
  if (method && isValidPaymentMethod(method)) {
    result.payment_method = method
  }
  if (data.date) {
    result.payment_date = data.date
  }
  if (data.maturity_date) {
    result.maturity_date = data.maturity_date
  }

  const bankFields: Array<keyof PaymentBankDetails> = [
    'bank_name', 'bank_agency', 'issuer_name', 'account_rib', 'maturity_date',
  ]
  for (const field of bankFields) {
    const value = meta[field as keyof PaymentDocumentMetadata]
    if (value) {
      result[field] = String(value)
    }
  }
  if (!result.maturity_date && meta.maturity_date) {
    result.maturity_date = String(meta.maturity_date)
  }

  return result
}

export function scanResultToBankDetails(result: PaymentScanResult): PaymentBankDetails {
  return {
    bank_name: result.bank_name ?? '',
    bank_agency: result.bank_agency ?? '',
    issuer_name: result.issuer_name ?? '',
    account_rib: result.account_rib ?? '',
    maturity_date: result.maturity_date ?? '',
  }
}
