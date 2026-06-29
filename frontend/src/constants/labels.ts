import type {
  ClientStatus,
  ContractType,
  InvoiceStatus,
  RecoveryPriority,
  RecoveryStatus,
} from '../types/client'

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'Actif',
  suspended: 'Suspendu',
  terminated: 'Résilié',
}

export const CLIENT_STATUS_COLORS: Record<ClientStatus, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-yellow-100 text-yellow-800',
  terminated: 'bg-red-100 text-red-800',
}

export const CONTRACT_LABELS: Record<ContractType, string> = {
  prepaid: 'Prépayé',
  postpaid: 'Postpayé',
  enterprise: 'Entreprise',
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  partially_paid: 'Partiel',
  paid: 'Payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
}

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-400',
}

export const RECOVERY_STATUS_LABELS: Record<RecoveryStatus, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  resolved: 'Résolu',
  legal: 'Juridique',
  closed: 'Clôturé',
}

export const RECOVERY_STATUS_COLORS: Record<RecoveryStatus, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  legal: 'bg-red-100 text-red-700',
  closed: 'bg-slate-100 text-slate-500',
}

export const PRIORITY_LABELS: Record<RecoveryPriority, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Haute',
  critical: 'Critique',
}

export const PRIORITY_COLORS: Record<RecoveryPriority, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}
