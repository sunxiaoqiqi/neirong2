import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// 获取当前目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// 定义文件路径
const filePath = join(__dirname, 'src/components/editor/LeftSidebar.tsx');

// 读取文件内容
const content = readFileSync(filePath, 'utf8');

// 检查括号匹配
function checkBrackets(content) {
  const brackets = [];
  const stack = [];
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (char === '{') {
      stack.push({ char, index: i });
    } else if (char === '}') {
      if (stack.length === 0) {
        brackets.push({ type: 'error', char, index: i, message: '多余的右括号' });
      } else {
        const openBracket = stack.pop();
        brackets.push({ type: 'pair', open: openBracket, close: { char, index: i } });
      }
    }
  }
  
  // 检查未闭合的左括号
  while (stack.length > 0) {
    const openBracket = stack.pop();
    brackets.push({ type: 'error', char: openBracket.char, index: openBracket.index, message: '未闭合的左括号' });
  }
  
  return brackets;
}

// 检查引号匹配
function checkQuotes(content) {
  const quotes = [];
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
    } else if (char === '\'' && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      quotes.push({ char, index: i, state: inSingleQuote ? 'open' : 'close' });
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      quotes.push({ char, index: i, state: inDoubleQuote ? 'open' : 'close' });
    }
  }
  
  if (inSingleQuote) {
    quotes.push({ type: 'error', message: '未闭合的单引号' });
  }
  
  if (inDoubleQuote) {
    quotes.push({ type: 'error', message: '未闭合的双引号' });
  }
  
  return quotes;
}

// 获取文件的行数和列数
function getLineAndColumn(content, index) {
  const lines = content.substring(0, index).split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { line, column };
}

// 检查文件
console.log('开始检查文件括号匹配...');
const bracketResults = checkBrackets(content);
const quoteResults = checkQuotes(content);

// 输出括号检查结果
console.log(`\n括号检查结果:`);
console.log(`总括号对数: ${bracketResults.filter(r => r.type === 'pair').length}`);
const errors = bracketResults.filter(r => r.type === 'error');
console.log(`括号错误数: ${errors.length}`);

if (errors.length > 0) {
  console.log('\n括号错误详情:');
  errors.forEach(err => {
    const pos = getLineAndColumn(content, err.index);
    console.log(`  - 位置: 行 ${pos.line}, 列 ${pos.column}, 字符: "${err.char}", 消息: ${err.message}`);
  });
}

// 输出引号检查结果
console.log(`\n引号检查结果:`);
const quoteErrors = quoteResults.filter(r => r.type === 'error');
console.log(`引号错误数: ${quoteErrors.length}`);

if (quoteErrors.length > 0) {
  console.log('\n引号错误详情:');
  quoteErrors.forEach(err => {
    console.log(`  - 消息: ${err.message}`);
  });
}

// 检查文件末尾的几行
console.log('\n文件末尾内容检查:');
const lastLines = content.split('\n').slice(-10);
console.log('最后10行内容:');
lastLines.forEach((line, i) => {
  console.log(`${content.split('\n').length - 9 + i}: ${line}`);
});

// 检查是否有不可见字符
console.log('\n检查文件末尾是否有不可见字符:');
const last50Chars = content.slice(-50);
for (let i = 0; i < last50Chars.length; i++) {
  const char = last50Chars[i];
  const code = char.charCodeAt(0);
  if (code < 33 && code !== 10 && code !== 13 && code !== 9) {
    console.log(`发现不可见字符: 位置 ${content.length - 50 + i}, 字符码: ${code}, 十六进制: 0x${code.toString(16)}`);
  }
}

console.log('\n检查完成!');
