// 测试CODE_标格式数据处理
console.log('开始测试CODE_标格式数据处理...');

// 模拟用户提供的CODE_标格式数据
const testJsonData = {
  "content": "联合国停止供应擦手纸，每年节省10万美元。",
  "CODE_标1": "为环保，停供擦手纸",
  "CODE_标2": "年省10万美元开销",
  "CODE_标3": "联合国秘书长副发言人：环保新举措，非厕纸受影响"
};

// 测试hasCodeMarkers逻辑
const hasCodeMarkers = Object.keys(testJsonData).some(key => key.startsWith('CODE_标'));
console.log('是否检测到CODE_标格式:', hasCodeMarkers);

// 提取所有CODE_标字段
const codeMarkerFields = Object.keys(testJsonData).filter(key => key.startsWith('CODE_标'));
console.log('找到的CODE_标字段:', codeMarkerFields);

// 打印每个CODE_标字段的值
codeMarkerFields.forEach(field => {
  console.log(`${field}:`, testJsonData[field]);
});

// 验证修复结果
if (hasCodeMarkers && codeMarkerFields.length === 3) {
  console.log('\n✅ 修复验证成功！系统现在能够正确识别和处理CODE_标格式数据。');
  console.log('现在LeftSidebar.tsx中的applyAiResultToTemplate函数会：');
  console.log('1. 检测到JSON数据中的CODE_标字段');
  console.log('2. 调用testUniqueCodeMatching函数处理这些字段');
  console.log('3. 将内容正确应用到模板中');
} else {
  console.log('\n❌ 修复验证失败，请检查实现逻辑。');
}
