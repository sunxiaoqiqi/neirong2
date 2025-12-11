import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// 获取当前目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// 定义文件路径
const filePath = join(__dirname, 'src/components/editor/LeftSidebar.tsx');

// 读取文件内容
let content = readFileSync(filePath, 'utf8');

console.log('开始全面修复文件...');

// 1. 移除所有可能的不可见字符和BOM
content = content.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');
console.log('✓ 移除了不可见字符');

// 2. 修复未闭合的单引号问题
function fixUnclosedQuotes(content) {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;
  let fixedContent = '';
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    fixedContent += char;
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
    } else if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    }
  }
  
  // 如果最后还有未闭合的单引号，添加一个闭合引号
  if (inSingleQuote) {
    fixedContent += "'";
    console.log('✓ 修复了未闭合的单引号');
  }
  
  return fixedContent;
}

content = fixUnclosedQuotes(content);

// 3. 修复括号匹配问题
function fixBracketMatching(content) {
  const stack = [];
  let fixedContent = '';
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    fixedContent += char;
    
    if (char === '{') {
      stack.push({ type: '{', index: fixedContent.length - 1 });
    } else if (char === '}') {
      if (stack.length > 0 && stack[stack.length - 1].type === '{') {
        stack.pop();
      } else {
        // 多余的右括号，移除
        fixedContent = fixedContent.slice(0, -1);
        console.log('✓ 移除了多余的右括号');
      }
    }
  }
  
  // 添加缺少的右括号
  while (stack.length > 0 && stack[stack.length - 1].type === '{') {
    fixedContent += '}';
    stack.pop();
    console.log('✓ 添加了缺少的右括号');
  }
  
  return fixedContent;
}

content = fixBracketMatching(content);

// 4. 清理文件末尾，确保格式正确
content = content.replace(/\s+$/, '');
console.log('✓ 清理了文件末尾');

// 5. 检查并修复return语句后面的格式
const lastReturnMatch = content.match(/return\s+\([\s\S]*?\);[\s\S]*$/);
if (lastReturnMatch) {
  const returnEndIndex = content.lastIndexOf(');');
  if (returnEndIndex !== -1) {
    const afterReturn = content.substring(returnEndIndex + 2).trim();
    if (afterReturn && afterReturn !== '}') {
      // 如果return后面有其他内容但不是闭合大括号，修复格式
      content = content.substring(0, returnEndIndex + 2) + '\n}';
      console.log('✓ 修复了return语句后面的格式');
    }
  }
}

// 6. 最后再次清理文件末尾
content = content.replace(/\s+$/, '');

// 写回文件
writeFileSync(filePath, content, 'utf8');
console.log('文件全面修复完成！');
