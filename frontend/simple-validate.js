import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取文件内容
const filePath = path.join(__dirname, 'src', 'components', 'editor', 'LeftSidebar.tsx');
let fileContent;

try {
  fileContent = fs.readFileSync(filePath, 'utf8');
  console.log(`✅ 文件读取成功，长度: ${fileContent.length} 字符, ${fileContent.split('\n').length} 行`);
} catch (error) {
  console.log('❌ 文件读取失败:', error.message);
  process.exit(1);
}

// 忽略正则表达式和字符串内容的括号检查
function checkBracketsIgnoreRegexAndStrings(code) {
  const stack = [];
  const pairs = {
    '(': ')',
    '{': '}',
    '[': ']'
  };
  
  let inString = null; // null, '", '", or `
  let inRegex = false;
  let escaped = false;
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1];
    
    // 处理转义字符
    if (char === '\\' && !escaped) {
      escaped = true;
      continue;
    }
    
    // 处理字符串
    if ((char === '"' || char === "'") && !escaped && !inRegex && inString === null) {
      inString = char;
    } else if (char === inString && !escaped && !inRegex) {
      inString = null;
    }
    
    // 处理模板字符串
    if (char === '`' && !escaped && !inRegex && inString === null) {
      inString = char;
    } else if (char === '`' && !escaped && !inRegex && inString === '`') {
      inString = null;
    }
    
    // 处理正则表达式
    if (char === '/' && nextChar !== '/' && nextChar !== '*' && !escaped && !inString && !inRegex) {
      inRegex = true;
    } else if (char === '/' && !escaped && inRegex) {
      inRegex = false;
    }
    
    // 如果在字符串或正则表达式内部，跳过括号检查
    if (inString !== null || inRegex) {
      escaped = false;
      continue;
    }
    
    // 处理括号
    if (Object.keys(pairs).includes(char)) {
      stack.push({ char, index: i });
    } else if (Object.values(pairs).includes(char)) {
      const last = stack.pop();
      if (!last) {
        const lineNumber = code.substring(0, i).split('\n').length;
        return {
          isValid: false,
          error: `多余的结束括号: ${char}`,
          lineNumber,
          position: i
        };
      }
      
      const expected = pairs[last.char];
      if (expected !== char) {
        const lineNumber = code.substring(0, i).split('\n').length;
        return {
          isValid: false,
          error: `括号不匹配: 期望 ${expected}，但找到 ${char}`,
          lineNumber,
          position: i
        };
      }
    }
    
    escaped = false;
  }
  
  if (stack.length > 0) {
    const lastOpen = stack[stack.length - 1];
    const lineNumber = code.substring(0, lastOpen.index).split('\n').length;
    return {
      isValid: false,
      error: `括号未闭合: ${stack.map(s => s.char).join(', ')}`,
      lineNumber,
      position: lastOpen.index
    };
  }
  
  return { isValid: true };
}

// 检查文件开头和结尾的组件结构
function checkComponentStructure(code) {
  // 检查默认导出函数定义
  const defaultExportRegex = /export\s+default\s+function\s+\w+\s*\(/;
  const hasDefaultExport = defaultExportRegex.test(code);
  
  // 检查文件结尾是否有正确的闭合
  const lines = code.split('\n');
  const lastLines = lines.slice(-10).join('\n');
  
  return {
    hasDefaultExport,
    lastLines
  };
}

// 执行检查
const bracketResult = checkBracketsIgnoreRegexAndStrings(fileContent);
const structureResult = checkComponentStructure(fileContent);

console.log('\n=== 括号匹配检查结果 ===');
if (bracketResult.isValid) {
  console.log('✅ 括号匹配检查通过！');
} else {
  console.log(`❌ 括号匹配失败: ${bracketResult.error}`);
  console.log(`   错误位置: 第${bracketResult.lineNumber}行`);
  
  // 显示错误行附近的内容
  const lines = fileContent.split('\n');
  const errorLine = bracketResult.lineNumber - 1;
  const startLine = Math.max(0, errorLine - 2);
  const endLine = Math.min(lines.length - 1, errorLine + 2);
  
  console.log('\n错误行附近内容:');
  for (let i = startLine; i <= endLine; i++) {
    const prefix = i === errorLine ? '❌ ' : '   ';
    console.log(`${prefix}${i + 1}: ${lines[i]}`);
  }
}

console.log('\n=== 组件结构检查结果 ===');
console.log(`✅ 是否有默认导出函数: ${structureResult.hasDefaultExport}`);
console.log('\n文件结尾部分:');
console.log('```');
console.log(structureResult.lastLines);
console.log('```');
