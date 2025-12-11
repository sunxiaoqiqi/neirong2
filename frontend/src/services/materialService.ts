import api from './api'
import type { Material } from '@/types/material'

export const materialService = {
  getMaterials: async (params?: {
    type?: string
    keyword?: string
    folderId?: number
    tags?: string[]
  }) => {
    return api.get<{ data: Material[] }>('/materials', { params })
  },

  uploadMaterial: async (file: File, type: string, name?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    if (name) formData.append('name', name)
    return api.post<Material>('/materials/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  updateMaterial: async (id: number, data: {
    name?: string
    tags?: string[]
    folderId?: number
  }) => {
    return api.put<Material>(`/materials/${id}`, data)
  },

  deleteMaterial: async (id: number) => {
    return api.delete(`/materials/${id}`)
  },
}

