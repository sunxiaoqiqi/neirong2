import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取文件内容
const filePath = path.join(__dirname, 'src', 'components', 'editor', 'LeftSidebar.tsx');

// 检查文件是否存在
if (!fs.existsSync(filePath)) {
  console.log('❌ 文件不存在');
  process.exit(1);
}

// 读取文件内容
let fileContent;
try {
  fileContent = fs.readFileSync(filePath, 'utf8');
  console.log(`✅ 文件读取成功，长度: ${fileContent.length} 字符, ${fileContent.split('\n').length} 行`);
} catch (error) {
  console.log('❌ 文件读取失败:', error.message);
  process.exit(1);
}

// 检查括号匹配
function checkBrackets(code) {
  const stack = [];
  const pairs = {
    '(': ')',
    '{': '}',
    '[': ']',
    '"': '"',
    "'": "'",
    '`': '`'
  };
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    
    // 忽略注释
    if (char === '/' && code[i + 1] === '/') {
      while (i < code.length && code[i] !== '\n') i++;
      continue;
    }
    
    // 忽略多行注释
    if (char === '/' && code[i + 1] === '*') {
      i += 2;
      while (i < code.length - 1 && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    
    // 处理字符串中的反斜杠转义
    if (char === '\\' && stack.length > 0 && 
        ['"', "'", '`'].includes(stack[stack.length - 1])) {
      i++;
      continue;
    }
    
    // 处理开始括号
    if (Object.keys(pairs).includes(char)) {
      // 对于引号，确保它们是成对的
      if (['"', "'", '`'].includes(char)) {
        // 如果栈顶是相同的引号，则弹出
        if (stack[stack.length - 1] === char) {
          stack.pop();
        } else {
          // 否则，推入栈中
          stack.push(char);
        }
      } else {
        // 对于其他括号，直接推入栈中
        stack.push(char);
      }
    }
    // 处理结束括号
    else if (Object.values(pairs).includes(char)) {
      const last = stack.pop();
      const expected = pairs[last];
      
      if (expected !== char) {
        // 找到对应的行号
        const lineNumber = code.substring(0, i).split('\n').length;
        return {
          isValid: false,
          error: `括号不匹配: 期望 ${expected}，但找到 ${char}`,
          lineNumber,
          position: i
        };
      }
    }
  }
  
  if (stack.length > 0) {
    // 找到对应的行号
    const lastOpenIndex = code.lastIndexOf(stack[stack.length - 1]);
    const lineNumber = code.substring(0, lastOpenIndex).split('\n').length;
    return {
      isValid: false,
      error: `括号未闭合: ${stack.join(', ')}`,
      lineNumber,
      position: lastOpenIndex
    };
  }
  
  return { isValid: true };
}

// 检查模板字符串
function checkTemplateStrings(code) {
  const templateStringRegex = /`([^`\\]|\\.)*`/g;
  const matches = code.match(templateStringRegex);
  const templateStrings = [];
  let lastIndex = 0;
  
  // 收集所有模板字符串及其位置
  let match;
  while ((match = templateStringRegex.exec(code)) !== null) {
    const lineNumber = code.substring(0, match.index).split('\n').length;
    templateStrings.push({
      content: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      lineNumber
    });
  }
  
  // 检查是否有未闭合的模板字符串
  const templateBackticks = code.match(/`/g) || [];
  if (templateBackticks.length % 2 !== 0) {
    const lastBacktickIndex = code.lastIndexOf('`');
    const lineNumber = code.substring(0, lastBacktickIndex).split('\n').length;
    return {
      isValid: false,
      error: '模板字符串未闭合',
      lineNumber,
      position: lastBacktickIndex
    };
  }
  
  return { isValid: true, templateStrings };
}

// 执行检查
const bracketCheck = checkBrackets(fileContent);
if (!bracketCheck.isValid) {
  console.log(`❌ 括号检查失败: ${bracketCheck.error} (第${bracketCheck.lineNumber}行)`);
  
  // 显示错误行附近的内容
  const lines = fileContent.split('\n');
  const errorLine = bracketCheck.lineNumber - 1;
  const startLine = Math.max(0, errorLine - 2);
  const endLine = Math.min(lines.length - 1, errorLine + 2);
  
  console.log('\n错误行附近内容:');
  for (let i = startLine; i <= endLine; i++) {
    const prefix = i === errorLine ? '❌ ' : '   ';
    console.log(`${prefix}${i + 1}: ${lines[i]}`);
  }
}

const templateCheck = checkTemplateStrings(fileContent);
if (!templateCheck.isValid) {
  console.log(`❌ 模板字符串检查失败: ${templateCheck.error} (第${templateCheck.lineNumber}行)`);
}

if (bracketCheck.isValid && templateCheck.isValid) {
  console.log('✅ 文件语法检查通过！');
  
  // 显示函数统计
  const functionCount = (fileContent.match(/function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>/g) || []).length;
  console.log(`📊 函数数量: ${functionCount}`);
  console.log(`📊 模板字符串数量: ${templateCheck.templateStrings?.length || 0}`);
}
