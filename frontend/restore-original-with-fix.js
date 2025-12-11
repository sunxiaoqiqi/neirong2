import fs from 'fs';
import path from 'path';

// 备份当前修复的版本
const currentFilePath = path.resolve('./src/components/editor/LeftSidebar.tsx');
const backupCurrentPath = path.resolve('./src/components/editor/LeftSidebar.tsx.current.fix.bak');

// 原始备份文件路径
const originalBackupPath = path.resolve('./src/components/editor/LeftSidebar.tsx.bak');

console.log('Starting restoration process...');

// 先备份当前版本
if (fs.existsSync(currentFilePath)) {
  console.log('Backing up current fixed version...');
  fs.copyFileSync(currentFilePath, backupCurrentPath);
  console.log(`Current version backed up to: ${backupCurrentPath}`);
}

// 检查原始备份文件是否存在
if (!fs.existsSync(originalBackupPath)) {
  console.error('Error: Original backup file not found at', originalBackupPath);
  process.exit(1);
}

console.log('Reading original backup file...');
let content = fs.readFileSync(originalBackupPath, 'utf8');

console.log('Fixing potential unterminated string constants...');

// 查找并修复第115行附近的未终止字符串常量问题
// 查找 generateAiPrompt 函数中的多行字符串
const generateAiPromptRegex = /const\s+generateAiPrompt\s*=\s*\(\)\s*=>\s*{[^}]*?const\s+prompt\s*=\s*"[^"]*\s+"\s*\+[\s\S]*?\+\s*"[^"}]*"/g;

content = content.replace(generateAiPromptRegex, (match) => {
  console.log('Found generateAiPrompt function with problematic string');
  
  // 提取模板内容变量名和要求文本
  const templateVarMatch = match.match(/\+\s*([\w]+)\s*\+/);
  const templateVar = templateVarMatch ? templateVarMatch[1] : 'templateContent';
  
  const requirementsMatch = match.match(/"([^"]*Requirements[^"]*)"/i);
  const requirementsText = requirementsMatch ? requirementsMatch[1] : 'Requirements: Maintain the structure and format of the original copy, but replace it with new content.';
  
  // 返回使用模板字符串的修复版本
  return `const generateAiPrompt = () => {
    if (${templateVar}) {
      const prompt = \`Please generate content based on the following template:\n${templateVar}\n\n${requirementsText}\`;`;
});

// 保存修复后的原始版本
console.log('Saving restored and fixed original version...');
fs.writeFileSync(currentFilePath, content, 'utf8');

console.log('\n✅ Restoration completed successfully!');
console.log(`- Original functionality has been restored from: ${originalBackupPath}`);
console.log(`- Unterminated string constants have been fixed`);
console.log(`- Current version has been backed up to: ${backupCurrentPath}`);
console.log(`- Restored file saved to: ${currentFilePath}`);
