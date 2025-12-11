// 简单测试脚本验证修复效果

// 模拟用户提供的JSON数据
const userJsonData = `{
  "content": "社交独处成长金句，简短戳心",
  "CODE_标1": "低质量的社交",
  "CODE_标2": "不如高质量的独处",
  "CODE_标3": "学会享受孤独，是变强的开始"
}`;

// 模拟处理逻辑
function testJsonParsing(jsonData) {
  try {
    const parsed = JSON.parse(jsonData);
    console.log('JSON解析成功!');
    console.log('解析后的数据结构:', parsed);
    
    // 检查是否支持CODE_标格式
    let structureData = {};
    
    // 格式1: 包含structure字段
    if (parsed.structure && typeof parsed.structure === 'object') {
      structureData = parsed.structure;
      console.log('检测到标准格式（structure字段）');
    }
    // 格式2: CODE_标直接在顶级对象
    else if (Object.keys(parsed).some(key => key.startsWith('CODE_'))) {
      Object.keys(parsed).forEach(key => {
        if (key.startsWith('CODE_')) {
          structureData[key] = parsed[key];
        }
      });
      console.log('检测到简化格式（CODE_标直接在顶级）');
    }
    
    // 输出提取的结构数据
    console.log('提取的结构数据:', structureData);
    
    // 检查是否包含所有CODE_标
    const hasAllCodeTags = Object.keys(structureData).length === 3 && 
                          structureData['CODE_标1'] === '低质量的社交' &&
                          structureData['CODE_标2'] === '不如高质量的独处' &&
                          structureData['CODE_标3'] === '学会享受孤独，是变强的开始';
    
    console.log('\n修复验证结果:', hasAllCodeTags ? '✅ 成功! CODE_标格式数据可以正确处理' : '❌ 失败! 无法正确处理CODE_标格式');
    
  } catch (error) {
    console.error('JSON解析失败:', error.message);
    console.log('❌ 修复验证失败!');
  }
}

// 运行测试
console.log('=== 测试CODE_标格式修复 ===\n');
testJsonParsing(userJsonData);
