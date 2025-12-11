import api from './api'
import type { Template } from '@/types/template'

export const templateService = {
  getTemplates: async (params?: { keyword?: string; tags?: string[] }) => {
    return api.get<{ data: Template[] }>('/templates', { params })
  },

  getTemplate: async (id: number) => {
    return api.get<Template>(`/templates/${id}`)
  },

  createTemplate: async (data: {
    name: string
    canvasData?: string
    tags?: string[]
    thumbnailUrl?: string
  }) => {
    return api.post<Template>('/templates', data)
  },

  updateTemplate: async (id: number, data: {
    name?: string
    canvasData?: string
    tags?: string[]
    thumbnailUrl?: string
  }) => {
    return api.put<Template>(`/templates/${id}`, data)
  },

  deleteTemplate: async (id: number) => {
    return api.delete(`/templates/${id}`)
  },

  applyTemplate: async (templateId: number, workId?: number) => {
    return api.post(`/templates/${templateId}/apply`, { workId })
  },
}

