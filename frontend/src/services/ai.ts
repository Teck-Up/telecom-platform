import axios from 'axios'
import type { PaymentDocumentAnalysis } from '../types/ai'

const AI_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8000'

export async function analyzePaymentDocument(file: File): Promise<PaymentDocumentAnalysis> {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await axios.post<PaymentDocumentAnalysis>(
    `${AI_URL}/api/payments/analyze-document`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )

  return data
}
