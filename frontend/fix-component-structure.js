import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx');
const backupPath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx.bak.final');

// 读取文件内容
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('原始文件总行数:', lines.length);

// 找到组件定义的开始位置和结束位置
let componentStartIndex = -1;
let componentEndIndex = -1;
let braceCount = 0;
let inComponentBody = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export default function LeftSidebar')) {
    componentStartIndex = i;
    console.log('找到组件定义在第', i + 1, '行');
  }
  
  if (componentStartIndex !== -1) {
    const line = lines[i];
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '{') {
        braceCount++;
        if (braceCount === 1) {
          inComponentBody = true;
        }
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && inComponentBody) {
          componentEndIndex = i;
          console.log('找到组件结束括号在第', i + 1, '行');
          break;
        }
      }
    }
    
    if (componentEndIndex !== -1) {
      break;
    }
  }
}

if (componentEndIndex === -1) {
  console.log('错误: 未找到匹配的结束括号！');
  process.exit(1);
}

// 提取正确的组件内容（包括文件开头到组件结束）
const validContent = lines.slice(0, componentEndIndex + 1).join('\n');

// 创建最终备份
fs.writeFileSync(backupPath, content, 'utf8');
console.log('已创建最终备份文件：LeftSidebar.tsx.bak.final');

// 写入修复后的文件
fs.writeFileSync(filePath, validContent, 'utf8');
console.log('文件已正确修复！');
console.log(`修复后文件有 ${validContent.split('\n').length} 行`);
console.log('已删除第', componentEndIndex + 2, '到第', lines.length, '行的多余内容（共', lines.length - componentEndIndex - 1, '行）');
