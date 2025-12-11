import api from './api'
import type { Work, CreateWorkDto, UpdateWorkDto, GetWorksParams } from '@/types/work'

export const workService = {
  getWorks: async (params?: GetWorksParams) => {
    return api.get<{ data: Work[]; total: number }>('/works', { params })
  },

  getWork: async (id: number) => {
    return api.get<Work>(`/works/${id}`)
  },

  createWork: async (data: CreateWorkDto) => {
    return api.post<Work>('/works', data)
  },

  updateWork: async (id: number, data: UpdateWorkDto) => {
    return api.put<Work>(`/works/${id}`, data)
  },

  deleteWork: async (id: number) => {
    return api.delete(`/works/${id}`)
  },

  duplicateWork: async (id: number) => {
    return api.post<Work>(`/works/${id}/duplicate`)
  },

  exportWork: async (id: number, format: 'png' | 'pdf' | 'gif') => {
    return api.post(`/works/${id}/export`, { format }, { responseType: 'blob' })
  },
}

