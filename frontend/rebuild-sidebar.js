import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx');
const backupPath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx.bak');

// 读取文件内容
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// 创建一个新的内容数组，确保没有隐藏字符
const newLines = [];
for (let i = 0; i < lines.length; i++) {
  // 移除行尾的空白字符并添加正确的换行符
  newLines.push(lines[i].trimEnd());
}

// 确保最后一行是正确的闭合大括号
if (newLines.length > 0) {
  newLines[newLines.length - 1] = '}';
}

// 重新组合内容
const newContent = newLines.join('\n');

// 创建备份
fs.writeFileSync(backupPath, content, 'utf8');
console.log('已创建备份文件：LeftSidebar.tsx.bak');

// 写入新文件
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('文件已重新构建！');
console.log(`文件现在有 ${newContent.split('\n').length} 行`);