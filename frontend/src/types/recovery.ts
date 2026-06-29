import type { RecoveryPriority, RecoveryStatus } from './client'

export type RecoveryRiskTier = 'low' | 'medium' | 'high' | 'critical'
export type DunningTemplate = 'rappel_1' | 'rappel_2' | 'mise_en_demeure'
export type InteractionType = 'phone' | 'email' | 'note' | 'legal_notice'

export interface RecoveryListRow {
  id: number
  client_id: number
  invoice_id: number
  client_name: string | null
  company_name: string | null
  invoice_number: string | null
  overdue_amount: number
  penalty_amount: number
  overdue_days: number
  priority: RecoveryPriority
  status: RecoveryStatus
  agent_name: string | null
}

export interface RecoveryTimelineEntry {
  id: string
  kind: 'reminder' | 'interaction'
  type: string
  label: string
  content: string
  occurred_at: string
  author: string
}

export interface RecoveryCaseDetail {
  id: number
  client_id: number
  invoice_id: number
  status: RecoveryStatus
  priority: RecoveryPriority
  overdue_amount: number
  penalty_amount: number
  overdue_days: number
  notes: string | null
  resolved_at: string | null
  created_at: string
  risk_tier: RecoveryRiskTier
  total_exposure: number
  client: { name: string | null; email: string | null; company_name: string | null }
  invoice: {
    id: number
    invoice_number: string
    amount_ttc: number
    amount_paid: number
    due_date: string
    status: string
  } | null
  agent: { id: number; name: string; email: string } | null
  timeline: RecoveryTimelineEntry[]
}

export const RISK_TIER_LABELS: Record<RecoveryRiskTier, string> = {
  low: 'Risque faible',
  medium: 'Risque modéré',
  high: 'Risque élevé',
  critical: 'Risque critique',
}

export const RISK_TIER_COLORS: Record<RecoveryRiskTier, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}
