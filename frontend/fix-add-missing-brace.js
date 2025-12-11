import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx');

// 读取文件内容
const content = fs.readFileSync(filePath, 'utf8');

// 添加缺失的闭合大括号
const newContent = content + '\n}';

// 写回文件
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('成功添加缺失的闭合大括号！');
console.log(`文件现在有 ${newContent.split('\n').length} 行`);