// 简单直接的测试
const userData = {
  "content": "社交独处成长金句，简短戳心",
  "CODE_标1": "低质量的社交",
  "CODE_标2": "不如高质量的独处",
  "CODE_标3": "学会享受孤独，是变强的开始"
};

// 模拟修复后的逻辑
let structureData = {};

// 检查是否有CODE_开头的键
const hasCodeKeys = Object.keys(userData).some(key => key.startsWith('CODE_'));
console.log('有CODE_标格式:', hasCodeKeys);

// 提取CODE_标数据
Object.keys(userData).forEach(key => {
  if (key.startsWith('CODE_')) {
    structureData[key] = userData[key];
  }
});

// 详细输出每个CODE_标
console.log('\n提取的CODE_标数据:');
Object.keys(structureData).forEach(key => {
  console.log(`${key}: "${structureData[key]}"`);
});

// 验证完整性
console.log('\n验证结果:');
console.log('CODE_标1存在:', !!structureData['CODE_标1']);
console.log('CODE_标2存在:', !!structureData['CODE_标2']);
console.log('CODE_标3存在:', !!structureData['CODE_标3']);
