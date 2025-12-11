import React from 'react';
import SimplifiedLeftSidebar from '../components/editor/SimplifiedLeftSidebar';

export default function TestSidebar() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">测试侧边栏组件</h1>
      <div className="flex">
        <SimplifiedLeftSidebar />
        <div className="ml-8">
          <p>这是测试页面，用于验证简化版侧边栏组件是否能正常工作。</p>
        </div>
      </div>
    </div>
  );
}
