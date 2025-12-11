import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import Home from './pages/Home'
import Editor from './pages/Editor'
import Template from './pages/Template'
import Material from './pages/Material'

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor/:id" element={<Editor />} />
          <Route path="/template" element={<Template />} />
          <Route path="/material" element={<Material />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App

