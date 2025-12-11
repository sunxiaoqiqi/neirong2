import fs from 'fs';
import path from 'path';

// 文件路径
const filePath = 'src/components/editor/LeftSidebar.tsx';

console.log('开始精确修复LeftSidebar.tsx文件...');

try {
    // 读取文件内容
    let content = fs.readFileSync(filePath, 'utf8');
    console.log(`文件读取成功，当前长度：${content.length} 字符`);
    
    // 去除文件末尾的所有空白字符（包括换行符、空格等）
    content = content.replace(/\s+$/g, '');
    console.log(`去除末尾空白后长度：${content.length} 字符`);
    
    // 检查文件最后一个字符是否是右大括号
    if (content.slice(-1) === '}') {
        // 向前查找最近的 ');' 组合，这应该是函数结束前的返回语句
        const returnMatch = content.lastIndexOf(');');
        if (returnMatch !== -1) {
            // 提取从开头到返回语句加右大括号的部分作为有效内容
            const validContent = content.substring(0, returnMatch + 2) + '\n}';
            console.log(`发现并保留了正确的函数结束部分`);
            
            // 写入修复后的内容
            fs.writeFileSync(filePath, validContent, 'utf8');
            console.log(`文件修复成功！已删除多余的右大括号，修复后长度：${validContent.length} 字符`);
        } else {
            console.log('未找到预期的返回语句模式');
        }
    } else {
        console.log('文件最后一个字符不是右大括号，可能已经被修复');
    }
    
} catch (error) {
    console.error('修复过程中发生错误：', error.message);
}

console.log('精确修复脚本执行完成！');
