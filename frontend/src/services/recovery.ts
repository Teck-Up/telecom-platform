import api from './api'
import type { ApiResponse } from '../types/api'
import type { DunningTemplate, InteractionType, RecoveryCaseDetail } from '../types/recovery'

export async function fetchRecoveryCase(id: number): Promise<RecoveryCaseDetail> {
  const { data } = await api.get<ApiResponse<RecoveryCaseDetail>>(`/recovery/${id}`)
  return data.data
}

export async function logRecoveryInteraction(
  id: number,
  interaction_type: InteractionType,
  content: string
): Promise<void> {
  await api.post(`/recovery/${id}/interactions`, { interaction_type, content })
}

export async function sendDunningNotice(id: number, template: DunningTemplate): Promise<void> {
  await api.post(`/recovery/${id}/dunning`, { template })
}

export async function updateRecoveryCase(
  id: number,
  payload: { status?: string; priority?: string; notes?: string }
): Promise<void> {
  await api.put(`/recovery/${id}`, payload)
}
