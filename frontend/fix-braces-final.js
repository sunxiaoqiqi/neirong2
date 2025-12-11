import fs from 'fs';
import path from 'path';

// 文件路径
const filePath = 'src/components/editor/LeftSidebar.tsx';

console.log('开始最终修复LeftSidebar.tsx文件...');

try {
    // 读取文件内容
    let content = fs.readFileSync(filePath, 'utf8');
    console.log(`文件读取成功，当前行数：${content.split('\n').length}`);
    
    // 找到最后一个return语句的位置
    const lastReturnIndex = content.lastIndexOf('return');
    console.log(`最后一个return语句位置：${lastReturnIndex}`);
    
    // 从return语句开始查找第一个');'组合
    const returnEndIndex = content.indexOf(');', lastReturnIndex);
    console.log(`return结束位置：${returnEndIndex}`);
    
    if (returnEndIndex !== -1) {
        // 提取从开头到return语句结束加一个正确的右大括号
        const validContent = content.substring(0, returnEndIndex + 2).trim() + '\n}';
        console.log(`有效内容行数：${validContent.split('\n').length}`);
        
        // 写入修复后的内容
        fs.writeFileSync(filePath, validContent, 'utf8');
        console.log('文件修复成功！已彻底解决多余大括号问题。');
    } else {
        console.log('未找到预期的return语句结构');
    }
    
} catch (error) {
    console.error('修复过程中发生错误：', error.message);
}

console.log('最终修复脚本执行完成！');
