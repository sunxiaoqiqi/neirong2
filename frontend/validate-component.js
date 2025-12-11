import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx');

// 读取文件内容
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('文件总行数:', lines.length);

// 找到组件定义的开始位置
let componentStartIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export default function LeftSidebar')) {
    componentStartIndex = i;
    console.log('找到组件定义在第', i + 1, '行');
    break;
  }
}

if (componentStartIndex === -1) {
  console.log('未找到组件定义！');
  process.exit(1);
}

// 检查括号匹配情况
let braceCount = 0;
let inComponentBody = false;

for (let i = componentStartIndex; i < lines.length; i++) {
  const line = lines[i];
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    
    if (char === '{') {
      braceCount++;
      if (braceCount === 1) {
        inComponentBody = true;
        console.log('进入组件体在第', i + 1, '行');
      }
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0 && inComponentBody) {
        console.log('找到组件结束括号在第', i + 1, '行');
        console.log('组件体行数范围:', componentStartIndex + 1, '到', i + 1);
        console.log('组件体总行数:', i - componentStartIndex + 1);
        
        // 检查之后是否还有其他内容
        if (i + 1 < lines.length) {
          console.log('警告: 组件结束后还有', lines.length - i - 1, '行内容');
          console.log('最后几行内容:', lines.slice(-5).join('\n'));
        }
        
        process.exit(0);
      }
    }
  }
}

console.log('错误: 未找到匹配的结束括号！');
console.log('最终括号计数:', braceCount);
process.exit(1);