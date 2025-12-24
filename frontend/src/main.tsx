import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'

// 添加全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error, event.message, event.filename, event.lineno, event.colno)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的 Promise 拒绝:', event.reason)
})

// 检查根元素是否存在
const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('找不到 root 元素！')
  document.body.innerHTML = '<div style="padding: 20px; color: red;">错误：找不到 root 元素</div>'
} else {
  console.log('开始渲染 React 应用...')
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
    console.log('React 应用渲染完成')
  } catch (error) {
    console.error('渲染 React 应用时发生错误:', error)
    rootElement.innerHTML = `<div style="padding: 20px; color: red;">渲染错误: ${error instanceof Error ? error.message : String(error)}</div>`
  }
}

