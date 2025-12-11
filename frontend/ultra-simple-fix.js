import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx');

// 创建一个极简但语法绝对正确的LeftSidebar组件
const simpleComponent = `import React from 'react';
import { Layout, Button, Menu } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';

const { Sider } = Layout;

interface LeftSidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  selectedMenuItem?: string;
  onSelectMenuItem?: (key: string) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  collapsed = false,
  onCollapse,
  selectedMenuItem = 'editor',
  onSelectMenuItem
}) => {
  const toggleCollapsed = () => {
    if (onCollapse) {
      onCollapse(!collapsed);
    }
  };

  const handleMenuClick = (e: { key: string }) => {
    if (onSelectMenuItem) {
      onSelectMenuItem(e.key);
    }
  };

  return (
    <Sider
      width={250}
      theme="light"
      trigger={null}
      collapsible
      collapsed={collapsed}
      className="left-sidebar"
      style={{ height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 1000 }}
    >
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <h2 style={{ margin: 0 }}>内容编辑器</h2>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleCollapsed}
          style={{ position: 'absolute', right: '16px', top: '16px' }}
        />
      </div>
      
      <Menu
        mode="inline"
        selectedKeys={[selectedMenuItem]}
        onClick={handleMenuClick}
        style={{ height: 'calc(100vh - 64px)', borderRight: 0 }}
      >
        <Menu.Item key="editor">编辑器</Menu.Item>
        <Menu.Item key="blocks">组件库</Menu.Item>
        <Menu.Item key="templates">模板</Menu.Item>
        <Menu.Item key="settings">设置</Menu.Item>
      </Menu>
    </Sider>
  );
};

export default LeftSidebar;
`;

// 写入文件
fs.writeFileSync(filePath, simpleComponent, 'utf8');
console.log('已创建极简版LeftSidebar组件！确保语法绝对正确。');
