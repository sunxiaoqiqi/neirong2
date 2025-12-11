import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// 获取当前目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// 定义文件路径
const originalPath = join(__dirname, 'src/components/editor/LeftSidebar.tsx');
const simplifiedPath = join(__dirname, 'src/components/editor/SimplifiedLeftSidebar.tsx');

console.log('开始创建简化版LeftSidebar组件...');

// 读取原始文件内容
const originalContent = readFileSync(originalPath, 'utf8');

// 提取imports部分
const importsMatch = originalContent.match(/^([\s\S]*?)(?=export\s+default\s+function)/);
let imports = '';
if (importsMatch) {
  imports = importsMatch[1];
  console.log('✓ 提取了imports部分');
}

// 提取组件参数
const paramsMatch = originalContent.match(/export\s+default\s+function\s+LeftSidebar\s*\(([^)]*)\)/);
let params = '';
if (paramsMatch) {
  params = paramsMatch[1];
  console.log('✓ 提取了组件参数');
}

// 创建简化版组件
const simplifiedContent = `${imports}

export default function SimplifiedLeftSidebar(${params}) {
  // 简化版组件 - 保留基本结构但移除可能有问题的内容
  return (
    <div className="left-sidebar">
      <div className="sidebar-content">
        {/* 简化的侧边栏内容 */}
        <h3>左侧边栏</h3>
        <p>这是一个简化版的LeftSidebar组件</p>
      </div>
    </div>
  );
}
`;

// 写入简化版文件
writeFileSync(simplifiedPath, simplifiedContent, 'utf8');
console.log(`✓ 已创建简化版组件: ${simplifiedPath}`);
console.log('简化版组件创建完成！');
