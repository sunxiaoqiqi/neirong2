export interface Material {
  id: number
  name: string
  type: 'image' | 'text' | 'background' | 'element'
  fileUrl: string
  fileSize?: number
  folderId?: number
  tags?: string[]
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
  userId?: number
}

