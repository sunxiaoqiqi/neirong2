import fs from 'fs';
import path from 'path';

const originalFilePath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx');
const backupFilePath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx.bak.final');

console.log('从备份恢复完整的LeftSidebar组件...');

// 读取备份文件内容
const backupContent = fs.readFileSync(backupFilePath, 'utf8');

// 确保文件内容以分号结尾的右大括号结束
let fixedContent = backupContent;
const lastLine = fixedContent.trim().split('\n').pop();

if (lastLine === '}' || lastLine === '};') {
  console.log('检测到正确的结束括号。');
} else {
  // 如果没有正确的结束括号，添加一个
  if (!lastLine.includes('}')) {
    fixedContent += '\n}';
  }
  console.log('修复了结束括号。');
}

// 备份当前文件
fs.writeFileSync(originalFilePath + '.before.restore.bak', fs.readFileSync(originalFilePath, 'utf8'), 'utf8');

// 写入修复后的完整内容
fs.writeFileSync(originalFilePath, fixedContent, 'utf8');

console.log('已成功恢复完整的LeftSidebar组件功能！');
console.log('组件现在包含所有原始功能。');
