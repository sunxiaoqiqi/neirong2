import { create } from 'zustand'

interface EditorState {
  canvasData: string | null
  setCanvasData: (data: string | null) => void
  selectedElement: any
  setSelectedElement: (element: any) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  canvasData: null,
  setCanvasData: (data) => set({ canvasData: data }),
  selectedElement: null,
  setSelectedElement: (element) => set({ selectedElement: element }),
}))

