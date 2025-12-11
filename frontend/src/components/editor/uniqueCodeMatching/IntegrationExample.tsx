import React, { useState } from 'react';
import { Button, Input, message } from 'antd';
import { testUniqueCodeMatching } from '../testUniqueCodeMatching';

const { TextArea } = Input;

// 集成示例组件 - 展示如何将精确匹配功能集成到现有系统
const IntegrationExample: React.FC<{
  canvas: any; // Fabric.js canvas实例
  templateAnalysisResult?: any; // 模板分析结果
  onTemplateAnalyze?: () => void; // 分析模板的回调函数
}> = ({ canvas, templateAnalysisResult, onTemplateAnalyze }) => {
  const [aiResultInput, setAiResultInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // 分析模板获取唯一标识代码
  const handleAnalyzeTemplate = async () => {
    if (!canvas) {
      message.warning('画布未初始化');
      return;
    }

    try {
      setIsAnalyzing(true);
      
      // 调用外部分析模板的函数
      if (onTemplateAnalyze) {
        await onTemplateAnalyze();
      } else {
        // 模拟分析模板的过程（实际使用时应替换为真实的分析逻辑）
        // 这里只是示例，实际项目中需要实现真实的模板分析功能
        await new Promise(resolve => setTimeout(resolve, 500));
        message.success('模板分析完成');
      }
    } catch (error) {
      console.error('分析模板失败:', error);
      message.error('分析模板失败，请重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 应用AI结果（使用精确匹配）
  const handleApplyResult = async () => {
    if (!canvas) {
      message.error('画布未初始化');
      return;
    }

    if (!templateAnalysisResult) {
      message.warning('请先分析模板获取唯一标识代码');
      return;
    }

    if (!aiResultInput.trim()) {
      message.warning('请输入AI生成的JSON格式结果');
      return;
    }

    try {
      setIsApplying(true);
      
      // 调用精确匹配函数
      const success = testUniqueCodeMatching(
        canvas,
        templateAnalysisResult,
        aiResultInput
      );
      
      if (success) {
        // 匹配成功后的处理（可选）
        // 可以清空输入框或进行其他操作
        // setAiResultInput('');
      }
    } catch (error) {
      console.error('应用AI结果失败:', error);
      message.error('应用失败，请重试');
    } finally {
      setIsApplying(false);
    }
  };

  // 显示示例格式
  const handleShowExample = () => {
    const exampleFormat = `{
  "structure": {
    "TITLE_001": "这是标题内容",
    "SUBTITLE_001": "这是副标题内容",
    "PARAGRAPH_001": "这是段落内容，根据唯一标识代码精确匹配到对应位置"
  }
}`;
    
    setAiResultInput(exampleFormat);
    message.info('示例格式已填充到输入框');
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
      <h3 style={{ marginBottom: '16px', color: '#333' }}>基于唯一标识代码的精确匹配</h3>
      
      <div style={{ marginBottom: '16px' }}>
        <Button 
          type="primary" 
          onClick={handleAnalyzeTemplate}
          loading={isAnalyzing}
          disabled={isAnalyzing}
          style={{ marginBottom: '8px' }}
        >
          分析模板获取唯一标识代码
        </Button>
        <p style={{ fontSize: '12px', color: '#666', margin: '8px 0' }}>
          点击后系统将为模板中的每个文本元素生成唯一标识代码
        </p>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          AI生成的JSON结果：
        </label>
        <TextArea
          rows={8}
          value={aiResultInput}
          onChange={(e) => setAiResultInput(e.target.value)}
          placeholder={`请输入符合以下格式的JSON:\n{\n  "structure": {\n    "唯一标识代码1": "对应内容1",\n    "唯一标识代码2": "对应内容2"\n  }\n}`}
          style={{ fontFamily: 'monospace', fontSize: '12px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <Button 
          onClick={handleShowExample}
          style={{ flex: 1 }}
        >
          显示示例格式
        </Button>
        <Button 
          type="primary" 
          onClick={handleApplyResult}
          loading={isApplying}
          disabled={isApplying || !templateAnalysisResult}
          style={{ flex: 2 }}
        >
          应用文案（精确匹配）
        </Button>
      </div>

      {templateAnalysisResult && templateAnalysisResult.elementMap && (
        <div style={{ marginTop: '12px' }}>
          <p style={{ fontSize: '12px', color: '#666' }}>
            已识别到 {Object.keys(templateAnalysisResult.elementMap).length} 个文本元素
          </p>
        </div>
      )}
    </div>
  );
};

export default IntegrationExample;
