import api from './api'

export interface Tag {
  id: number
  name: string
  color?: string
  createdAt: string
}

export const tagService = {
  getTags: async () => {
    return api.get<Tag[]>('/tags')
  },

  createTag: async (data: { name: string; color?: string }) => {
    return api.post<Tag>('/tags', data)
  },

  deleteTag: async (id: number) => {
    return api.delete(`/tags/${id}`)
  },
}


