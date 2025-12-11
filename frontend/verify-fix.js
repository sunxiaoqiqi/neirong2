import fs from 'fs';
import path from 'path';

// 读取修复后的文件内容
const filePath = path.resolve('./src/components/editor/LeftSidebar.tsx');

// 检查文件是否存在
if (fs.existsSync(filePath)) {
  console.log('File exists:', filePath);
  
  // 读取文件内容
  const content = fs.readFileSync(filePath, 'utf8');
  console.log('File content length:', content.length, 'characters');
  console.log('File line count:', content.split('\n').length, 'lines');
  
  // 检查模板字符串修复是否成功
  const templateStringCount = (content.match(/`/g) || []).length;
  console.log('Template string backticks count:', templateStringCount);
  
  // 检查是否还有未终止的字符串常量
  const unterminatedDoubleQuote = !/"[^"]*(?:[^\\]|\\.)*"/.test(content) || (content.match(/"/g) || []).length % 2 !== 0;
  console.log('Unterminated double quotes detected:', unterminatedDoubleQuote);
  
  console.log('\nVerification result:');
  if (templateStringCount >= 2 && !unterminatedDoubleQuote) {
    console.log('✅ Fix appears to be successful! Template strings are used correctly.');
  } else {
    console.log('❌ Potential issues detected in the fix.');
  }
  
} else {
  console.error('Error: File not found at', filePath);
}
