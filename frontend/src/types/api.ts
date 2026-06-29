export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  total?: number
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  limit: number
}
