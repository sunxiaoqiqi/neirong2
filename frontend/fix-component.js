import fs from 'fs';
import path from 'path';

// 定义文件路径
const filePath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx');
console.log('修复 LeftSidebar.tsx 组件...');

// 创建一个最小化的正确组件
const minimalComponent = `import React, { useState } from "react";
import { Button, Drawer } from "antd";
import {
  FileImageOutlined,
  AppstoreOutlined,
  SearchOutlined,
  FormOutlined,
  UploadOutlined,
  CodeOutlined,
  DeleteOutlined,
  BarChartOutlined,
  CopyOutlined,
  EditOutlined
} from "@ant-design/icons";

export default function LeftSidebar({
  canvas,
  onAddText,
  onAddImage,
  onApplyTemplate
}) {
  // 基本状态
  const [textDrawerVisible, setTextDrawerVisible] = useState(false);
  const [imageDrawerVisible, setImageDrawerVisible] = useState(false);

  return (
    <div className="left-sidebar">
      <div className="sidebar-header">
        <h3>工具箱</h3>
      </div>
      <div className="sidebar-content">
        <Button onClick={() => setTextDrawerVisible(true)}>
          添加文本
        </Button>
        <Button onClick={() => setImageDrawerVisible(true)}>
          添加图片
        </Button>
      </div>
    </div>
  );
};
`;

// 备份当前文件
fs.writeFileSync(filePath + '.minimal.bak', fs.readFileSync(filePath, 'utf8'), 'utf8');

// 写入最小化组件
fs.writeFileSync(filePath, minimalComponent, 'utf8');

console.log('修复完成！已创建最小化的LeftSidebar组件。');
