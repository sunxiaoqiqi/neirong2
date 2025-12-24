import { HashRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import Home from './pages/Home'
import Editor from './pages/Editor'
import Template from './pages/Template'
import Material from './pages/Material'

function App() {
  console.log('App 组件渲染')
  console.log('当前路径:', window.location.pathname)
  console.log('当前 hash:', window.location.hash)
  console.log('当前 URL:', window.location.href)
  return (
    <ConfigProvider locale={zhCN}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor/:id" element={<Editor />} />
          <Route path="/template" element={<Template />} />
          <Route path="/material" element={<Material />} />
        </Routes>
      </HashRouter>
    </ConfigProvider>
  )
}

export default App

