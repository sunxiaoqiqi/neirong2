import axios from 'axios'

// 检测是否在 Electron 环境中
// 方法1: 检查 window.location.protocol 是否为 file:
// 方法2: 检查是否存在 window.require (Electron 特有)
// 方法3: 检查 navigator.userAgent 是否包含 Electron
const isElectron = 
  typeof window !== 'undefined' && (
    window.location.protocol === 'file:' ||
    typeof (window as any).require !== 'undefined' ||
    navigator.userAgent.toLowerCase().includes('electron')
  )

// 在 Electron 中使用 localhost，否则使用相对路径
const baseURL = isElectron ? 'http://localhost:3000/api' : '/api'

console.log('API 配置:', { 
  isElectron, 
  baseURL, 
  protocol: window.location.protocol,
  hasRequire: typeof (window as any).require !== 'undefined',
  userAgent: navigator.userAgent
})

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加token等
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API错误:', error)
    console.error('API错误详情:', {
      message: error.message,
      code: error.code,
      response: error.response,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
      },
    })
    return Promise.reject(error)
  }
)

export default api

