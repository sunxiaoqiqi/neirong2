import fs from 'fs';
import path from 'path';

const originalFilePath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx');
const backupFilePath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx.bak.final');

console.log('执行智能修复...');

// 读取备份文件内容
const backupContent = fs.readFileSync(backupFilePath, 'utf8');
const lines = backupContent.split('\n');

// 寻找组件定义的开始位置
let componentStartIndex = -1;
let componentEndIndex = -1;
let braceCount = 0;
let inComponent = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // 找到export default function LeftSidebar定义
  if (!inComponent && line.startsWith('export default function LeftSidebar(')) {
    componentStartIndex = i;
    inComponent = true;
    braceCount = 0;
  }
  
  if (inComponent) {
    // 统计花括号
    for (let char of line) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
    }
    
    // 当花括号数量回到0时，找到组件结束
    if (braceCount === 0 && line.includes('}')) {
      componentEndIndex = i;
      break;
    }
  }
}

console.log(`组件定义从第 ${componentStartIndex + 1} 行开始，到第 ${componentEndIndex + 1} 行结束`);

// 提取组件之前的导入和辅助函数
const preComponentLines = lines.slice(0, componentStartIndex);

// 提取组件定义
const componentLines = lines.slice(componentStartIndex, componentEndIndex + 1);

// 合并成修复后的内容
const fixedContent = [...preComponentLines, ...componentLines].join('\n');

// 写入修复后的内容
fs.writeFileSync(originalFilePath + '.smart.fixed.bak', fixedContent, 'utf8');
fs.writeFileSync(originalFilePath, fixedContent, 'utf8');

console.log('智能修复完成！提取了完整的组件结构。');
console.log('修复后的文件行数：', fixedContent.split('\n').length);
