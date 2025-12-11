import React from 'react';
import { message, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { confirm } = Modal;

// 模拟基于唯一标识代码的精确匹配功能
export const testUniqueCodeMatching = (
  canvas: any,
  templateAnalysisResult: any,
  aiResult: string
) => {
  // 参数验证
  if (!canvas) {
    message.error('画布未初始化，请刷新页面重试');
    return false;
  }
  
  if (!templateAnalysisResult) {
    message.warning('请先点击"分析模板"按钮生成唯一标识代码');
    return false;
  }
  
  if (!aiResult || !aiResult.trim()) {
    message.warning('请输入AI生成的文案结果');
    return false;
  }

  try {
    // 尝试解析JSON格式
    let jsonData;
    try {
      jsonData = JSON.parse(aiResult);
    } catch (parseError) {
      message.error('请输入有效的JSON格式数据！');
      confirm({
        title: 'JSON格式错误',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>输入的内容不是有效的JSON格式，请检查以下几点：</p>
            <ul>
              <li>确保使用双引号而不是单引号</li>
              <li>确保所有键名都用双引号包裹</li>
              <li>确保没有多余的逗号</li>
              <li>点击"显示示例格式"查看正确的JSON格式</li>
            </ul>
          </div>
        ),
        onOk() {},
      });
      return false;
    }

    // 检查JSON结构并支持两种格式
    let structureData = {};
    
    // 格式1: 包含structure字段的标准格式
    if (jsonData.structure && typeof jsonData.structure === 'object') {
      structureData = jsonData.structure;
    }
    // 格式2: CODE_标直接在顶级对象中的简化格式
    else if (Object.keys(jsonData).some(key => key.startsWith('CODE_'))) {
      structureData = {};
      // 提取所有以CODE_开头的键值对
      Object.keys(jsonData).forEach(key => {
        if (key.startsWith('CODE_')) {
          structureData[key] = jsonData[key];
        }
      });
    }
    else {
      message.error('JSON格式不正确，缺少有效的结构数据！');
      confirm({
        title: 'JSON结构错误',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>JSON数据支持两种格式：</p>
            <p>1. 标准格式（包含structure字段）：</p>
            <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '12px', overflowX: 'auto' }}>
              {JSON.stringify({
                "structure": {
                  "CODE_标1": "内容1",
                  "CODE_标2": "内容2"
                }
              }, null, 2)}
            </pre>
            <p>2. 简化格式（CODE_标直接在顶级对象）：</p>
            <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '12px', overflowX: 'auto' }}>
              {JSON.stringify({
                "content": "整体内容概述",
                "CODE_标1": "内容1",
                "CODE_标2": "内容2"
              }, null, 2)}
            </pre>
          </div>
        ),
        onOk() {},
      });
      return false;
    }

    // 获取唯一标识代码映射表
    const elementMap = templateAnalysisResult.elementMap || {};
    
    // 检查映射表是否存在
    if (Object.keys(elementMap).length === 0) {
      message.error('模板分析结果中未找到唯一标识代码映射表');
      message.warning('请重新分析模板以生成唯一标识代码');
      return false;
    }

    // 统计变量
    let processedElements = 0;
    const unmatchedCodes: string[] = [];

    // 遍历JSON结果中的所有唯一标识代码
    Object.keys(structureData).forEach((uniqueCode: string) => {
      // 获取对应的内容
      const content = structureData[uniqueCode];
      
      // 验证内容格式
      if (typeof content !== 'string') {
        console.warn(`唯一标识代码 ${uniqueCode} 的内容不是字符串格式`);
        return;
      }
      
      if (!content.trim()) {
        console.warn(`唯一标识代码 ${uniqueCode} 的内容为空`);
        return;
      }

      // 查找对应的文本元素
      const textElement = elementMap[uniqueCode];
      if (!textElement) {
        unmatchedCodes.push(uniqueCode);
        return;
      }

      // 在画布中找到对应的对象并更新文本
      const obj = canvas.getObjects().find((o: any) => o.id === textElement.id);
      if (obj && (obj.type === 'textbox' || obj.type === 'text')) {
        const maxLength = textElement.estimatedMaxChars || 200;
        // 智能截断函数
        const smartTruncate = (text: string, maxLength: number) => {
          if (text.length <= maxLength) return text;
          return text.substring(0, maxLength - 3) + '...';
        };
        
        // 应用内容
        obj.set('text', smartTruncate(content, maxLength));
        processedElements++;
      } else {
        console.warn(`未找到ID为 ${textElement.id} 的文本对象`);
      }
    });

    // 渲染画布更新
    canvas.renderAll();

    // 显示详细的匹配结果
    const totalCodes = Object.keys(jsonData.structure).length;
    
    if (processedElements > 0) {
      let successMessage = `✅ 精确匹配成功！共处理 ${processedElements} 个文本元素`;
      
      // 如果有未匹配的代码，显示警告信息
      if (unmatchedCodes.length > 0) {
        successMessage += `\n\n⚠️ 注意：以下 ${unmatchedCodes.length} 个唯一标识代码未找到匹配：\n${unmatchedCodes.join('、')}`;
        
        message.success(successMessage, 5);
        
        confirm({
          title: '部分匹配成功',
          icon: <ExclamationCircleOutlined />,
          content: (
            <div>
              <p>已成功匹配 ${processedElements}/${totalCodes} 个文本元素</p>
              <p style={{ color: '#faad14' }}>未匹配的唯一标识代码：</p>
              <pre style={{ backgroundColor: '#fff7e6', padding: '8px', borderRadius: '4px', fontSize: '12px', color: '#fa8c16' }}>
                ${unmatchedCodes.join('\n')}</pre>
              <p style={{ fontSize: '12px', color: '#8c8c8c' }}>
                提示：请确保唯一标识代码与模板分析结果完全一致，区分大小写和空格</p>
            </div>
          ),
          onOk() {},
        });
      } else {
        message.success(successMessage);
      }
    } else {
      // 完全未匹配的情况
      message.error('未能匹配任何文本元素！');
      confirm({
        title: '匹配失败',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>请检查以下几点：</p>
            <ul>
              <li>唯一标识代码是否与模板分析结果一致？</li>
              <li>是否使用了最新的模板分析结果？</li>
              <li>JSON格式是否正确？</li>
              <li>点击"显示示例格式"查看正确的格式</li>
            </ul>
          </div>
        ),
        onOk() {},
      });
    }

    return true;
  } catch (error) {
    console.error('应用AI结果时发生未知错误:', error);
    message.error('操作过程中发生错误，请重试');
    return false;
  }
};

// 示例JSON格式（供用户参考）
export const exampleJsonFormat = `// 格式1: 标准格式（包含structure字段）
{
  "content": "社交独处成长金句，简短戳心",
  "structure": {
    "CODE_标1": "低质量的社交",
    "CODE_标2": "不如高质量的独处",
    "CODE_标3": "学会享受孤独，是变强的开始"
  }
}

// 格式2: 简化格式（CODE_标直接在顶级对象）
{
  "content": "社交独处成长金句，简短戳心",
  "CODE_标1": "低质量的社交",
  "CODE_标2": "不如高质量的独处",
  "CODE_标3": "学会享受孤独，是变强的开始"
}`;

export default {
  testUniqueCodeMatching,
  exampleJsonFormat
};
