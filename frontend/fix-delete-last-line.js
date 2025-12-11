import fs from 'fs';

// 文件路径
const filePath = 'src/components/editor/LeftSidebar.tsx';

console.log('开始删除最后一行修复...');

try {
    // 读取文件内容并按行分割
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    console.log(`原始文件行数：${lines.length}`);
    
    // 如果文件不为空，删除最后一行
    if (lines.length > 0) {
        const newLines = lines.slice(0, -1);
        const newContent = newLines.join('\n');
        
        // 写入修复后的内容
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`修复后文件行数：${newLines.length}`);
        console.log('成功删除最后一行！');
    } else {
        console.log('文件为空，无需修复');
    }
    
} catch (error) {
    console.error('修复过程中发生错误：', error.message);
}

console.log('删除最后一行修复脚本执行完成！');
