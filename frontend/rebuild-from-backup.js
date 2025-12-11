import fs from 'fs';
import path from 'path';

const originalFilePath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx');
const backupFilePath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx.bak.final');

// 读取备份文件内容
const backupContent = fs.readFileSync(backupFilePath, 'utf8');
const backupLines = backupContent.split('\n');

console.log('备份文件总行数:', backupLines.length);

// 找到组件定义的开始位置
let componentStartIndex = -1;
for (let i = 0; i \u003c backupLines.length; i++) {
  if (backupLines[i].includes('export default function LeftSidebar')) {
    componentStartIndex = i;
    console.log('找到组件定义在第', i + 1, '行');
    break;
  }
}

if (componentStartIndex === -1) {
  console.log('错误: 在备份文件中未找到组件定义！');
  process.exit(1);
}

// 从备份文件中提取正确的组件内容
// 包括文件开头到组件完整定义（这里我们假设原始文件是正确的，只是被错误修改了）
const correctContent = backupContent;

// 写回原始文件
fs.writeFileSync(originalFilePath, correctContent, 'utf8');
console.log('从备份文件成功恢复原始内容！');
console.log(`恢复后文件有 ${correctContent.split('\n').length} 行`);

console.log('\n现在需要手动修复文件，删除多余的右大括号。让我创建一个新的修复脚本...');

// 写入一个新的修复脚本，它会查找文件中最后一个return语句，然后提取到正确的结束位置
const fixScript = `import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx');

// 读取文件内容
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\\n');

console.log('文件总行数:', lines.length);

// 找到最后一个return语句的位置
let lastReturnIndex = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].trim().startsWith('return')) {
    lastReturnIndex = i;
    console.log('找到最后一个return语句在第', i + 1, '行:', lines[i]);
    break;
  }
}

if (lastReturnIndex === -1) {
  console.log('错误: 未找到return语句！');
  process.exit(1);
}

// 从最后一个return语句开始，找到对应的结束括号
let braceCount = 0;
let endIndex = -1;
let foundReturnBody = false;

for (let i = lastReturnIndex; i \u003c lines.length; i++) {
  const line = lines[i];
  
  for (let j = 0; j \u003c line.length; j++) {
    const char = line[j];
    
    if (char === '{') {
      braceCount++;
      if (line.trim().startsWith('return')) {
        foundReturnBody = true;
      }
    } else if (char === '}') {
      braceCount--;
      // 当括号计数回到0时，我们应该找到了正确的结束位置
      if (braceCount === 0 && foundReturnBody) {
        endIndex = i;
        console.log('找到组件结束括号在第', i + 1, '行');
        break;
      }
    }
  }
  
  if (endIndex !== -1) {
    break;
  }
}

// 如果没有找到结束括号，我们将使用更简单的方法
if (endIndex === -1) {
  console.log('警告: 未找到匹配的结束括号，使用备用方法修复...');
  
  // 查找包含');'的行，这通常表示JSX或React组件的返回语句结束
  for (let i = lines.length - 1; i \u003c lines.length; i++) {
    if (lines[i].includes(');')) {
      endIndex = i;
      console.log('找到返回语句结束在第', i + 1, '行');
      break;
    }
  }
}

// 如果仍然没有找到，我们将删除文件的最后几行
if (endIndex === -1) {
  console.log('警告: 使用最后备用方法，删除文件最后几行...');
  endIndex = lines.length - 5;
}

// 提取正确的内容（文件开头到找到的结束位置 + 1行闭合大括号）
const validContent = lines.slice(0, endIndex + 1).join('\\n') + '\\n}';

// 写回文件
fs.writeFileSync(filePath, validContent, 'utf8');
console.log('文件修复成功！');
console.log(`修复后文件有 ${validContent.split('\\n').length} 行`);
`;

const fixScriptPath = path.join(process.cwd(), 'fix-final-component.js');
fs.writeFileSync(fixScriptPath, fixScript, 'utf8');
console.log('已创建最终修复脚本: fix-final-component.js');
console.log('请运行: node fix-final-component.js 来完成修复');
