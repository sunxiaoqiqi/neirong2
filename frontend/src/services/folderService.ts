import api from './api'

export interface Folder {
  id: number
  name: string
  parentId?: number
  type: 'work' | 'template' | 'material'
  createdAt: string
  updatedAt: string
}

export const folderService = {
  getFolders: async (type?: string) => {
    return api.get<Folder[]>('/folders', { params: { type } })
  },

  createFolder: async (data: { name: string; parentId?: number; type: string }) => {
    return api.post<Folder>('/folders', data)
  },

  updateFolder: async (id: number, data: { name: string }) => {
    return api.put<Folder>(`/folders/${id}`, data)
  },

  deleteFolder: async (id: number) => {
    return api.delete(`/folders/${id}`)
  },
}


