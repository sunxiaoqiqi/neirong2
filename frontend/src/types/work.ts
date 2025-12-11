export interface Work {
  id: number
  name: string
  description?: string
  canvasData?: string
  thumbnailUrl?: string
  folderId?: number
  tags?: string[]
  status: 'draft' | 'saved' | 'published'
  createdAt: string
  updatedAt: string
  userId?: number
}

export interface CreateWorkDto {
  name: string
  description?: string
  canvasData?: string
  folderId?: number
  tags?: string[]
}

export interface UpdateWorkDto {
  name?: string
  description?: string
  canvasData?: string
  folderId?: number
  tags?: string[]
  status?: 'draft' | 'saved' | 'published'
}

export interface GetWorksParams {
  page?: number
  pageSize?: number
  folderId?: number
  tags?: string[]
  keyword?: string
}

