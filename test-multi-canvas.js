// 测试多画布内容划分功能
// 模拟applyAiResultToTemplate函数中的核心逻辑

// 测试数据模型
const testScenarios = [
  {
    name: '土豆丝制作例子',
    data: {
      'canvas1': '做炒土豆丝',
      'CODE_标 1': '超级简单',
      'CODE_标 2': '新人可会',
      'canvas2': '购买土豆',
      'CODE_标 1': '找有大又重的，才是好的',
      'CODE_标 2': '注意不要有发芽的',
      'canvas3': '处理土豆',
      'CODE_标 1': '洗好土豆，把土豆切成细丝',
      'CODE_标 2': '用挂丝器小心手'
    },
    expectedCanvases: ['canvas1', 'canvas2', 'canvas3']
  },
  {
    name: '单一画布示例',
    data: {
      'canvas1': '单一画布测试',
      'CODE_标 1': '只有一个画布',
      'CODE_标 2': '简单情况'
    },
    expectedCanvases: ['canvas1']
  },
  {
    name: '部分CODE_标示例',
    data: {
      'canvas1': '第一个画布',
      'CODE_标 1': '只有一个标',
      'canvas2': '第二个画布'
    },
    expectedCanvases: ['canvas1', 'canvas2']
  }
];

// 模拟核心逻辑函数
function simulateCanvasMapping(data) {
  const canvasContentMap = {};
  
  // 首先找出所有的canvas键
  const canvasKeys = [];
  for (let i = 1; i <= 10; i++) {
    const key = `canvas${i}`;
    if (key in data) {
      canvasKeys.push(key);
      // 初始化画布内容映射
      canvasContentMap[key.toLowerCase()] = {
        theme: data[key],
        codeMarkers: {}
      };
    }
  }
  
  // 然后按照canvas顺序关联CODE_标数据
  for (let i = 0; i < canvasKeys.length; i++) {
    const currentCanvas = canvasKeys[i];
    const nextCanvas = i < canvasKeys.length - 1 ? canvasKeys[i + 1] : null;
    
    // 遍历所有键，找出当前画布对应的CODE_标数据
    Object.keys(data).forEach(key => {
      if (key.includes('CODE_标') && typeof data[key] === 'string') {
        // 检查这个CODE_标是否应该属于当前画布
        // 这里简单处理：如果没有下一个画布，或者当前键在数据中的位置在下一个画布之前
        // 就认为这个CODE_标属于当前画布
        const currentCanvasIndex = Object.keys(data).indexOf(currentCanvas);
        const keyIndex = Object.keys(data).indexOf(key);
        const nextCanvasIndex = nextCanvas ? Object.keys(data).indexOf(nextCanvas) : Infinity;
        
        if (keyIndex > currentCanvasIndex && keyIndex < nextCanvasIndex) {
          canvasContentMap[currentCanvas.toLowerCase()].codeMarkers[key] = data[key];
        }
      }
    });
  }
  
  return canvasContentMap;
}

// 测试函数
function testScenario(scenario) {
  console.log(`\n======= 测试: ${scenario.name} =======`);
  console.log('输入数据:', scenario.data);
  
  // 执行模拟逻辑
  const result = simulateCanvasMapping(scenario.data);
  
  // 验证结果
  console.log('\n映射结果:');
  let allPassed = true;
  
  // 验证期望的画布是否都被正确处理
  scenario.expectedCanvases.forEach(canvasKey => {
    const canvasId = canvasKey.toLowerCase();
    if (result[canvasId]) {
      console.log(`${canvasKey}: ${result[canvasId].theme}`);
      Object.entries(result[canvasId].codeMarkers).forEach(([markerKey, value]) => {
        console.log(`  - ${markerKey}: ${value}`);
      });
    } else {
      console.log(`❌ 错误: ${canvasKey} 未被正确处理`);
      allPassed = false;
    }
  });
  
  // 检查是否有意外的画布
  Object.keys(result).forEach(canvasId => {
    const canvasKey = canvasId.toLowerCase();
    if (!scenario.expectedCanvases.some(expected => expected.toLowerCase() === canvasKey)) {
      console.log(`❌ 错误: 发现意外的画布 ${canvasId}`);
      allPassed = false;
    }
  });
  
  if (allPassed) {
    console.log('\n✅ 测试通过!');
    return true;
  } else {
    console.log('\n❌ 测试失败!');
    return false;
  }
}

// 运行所有测试
function runAllTests() {
  console.log('开始测试多画布内容划分功能...');
  console.log('================================');
  
  let totalTests = testScenarios.length;
  let passedTests = 0;
  
  testScenarios.forEach(scenario => {
    if (testScenario(scenario)) {
      passedTests++;
    }
  });
  
  console.log('\n================================');
  console.log(`测试结果: ${passedTests}/${totalTests} 测试通过`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试都通过了!');
    return true;
  } else {
    console.log('❌ 部分测试失败，请检查问题。');
    return false;
  }
}

// 运行测试
const allTestsPassed = runAllTests();

// 根据测试结果设置退出码
process.exit(allTestsPassed ? 0 : 1);
