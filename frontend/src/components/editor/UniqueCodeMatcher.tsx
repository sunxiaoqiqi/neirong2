import React, { useState } from 'react';
import { Button, Modal, TextArea, message } from 'antd';
import { EditOutlined, SendOutlined } from '@ant-design/icons';
import { testUniqueCodeMatching, exampleJsonFormat } from './testUniqueCodeMatching';

interface UniqueCodeMatcherProps {
  canvas: any;
  templateAnalysisResult: any;
}

const UniqueCodeMatcher: React.FC<UniqueCodeMatcherProps> = ({ canvas, templateAnalysisResult }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [aiResult, setAiResult] = useState('');

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleApply = () => {
    if (!aiResult.trim()) {
      message.warning('请输入AI生成的文案结果');
      return;
    }

    const success = testUniqueCodeMatching(canvas, templateAnalysisResult, aiResult);
    if (success) {
      setAiResult('');
      setIsModalVisible(false);
    }
  };

  const showExampleFormat = () => {
    setAiResult(exampleJsonFormat);
  };

  return (
    <>
      <Button 
        type="primary" 
        icon={<EditOutlined />} 
        onClick={showModal}
        style={{ marginTop: '8px' }}
      >
        文案精确匹配
      </Button>
      
      <Modal
        title="基于唯一标识代码的文案精确匹配"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            取消
          </Button>,
          <Button key="example" onClick={showExampleFormat}>
            显示示例格式
          </Button>,
          <Button 
            key="apply" 
            type="primary" 
            icon={<SendOutlined />} 
            onClick={handleApply}
          >
            应用文案
          </Button>,
        ]}
        width={700}
      >
        <div style={{ marginBottom: '16px' }}>
          <h4>使用说明：</h4>
          <ul>
            <li>1. 请确保已先进行模板分析，生成了唯一标识代码</li>
            <li>2. 将AI生成的包含唯一标识代码的JSON格式文案粘贴到下方输入框</li>
            <li>3. JSON格式应为：{`{"structure": {"uniqueCode1": "内容1", "uniqueCode2": "内容2"}}`}</li>
            <li>4. 点击"应用文案"按钮，系统将基于唯一标识代码进行精确匹配</li>
          </ul>
        </div>
        <TextArea
          rows={12}
          value={aiResult}
          onChange={(e) => setAiResult(e.target.value)}
          placeholder="请粘贴AI生成的JSON格式文案结果"
          style={{ fontFamily: 'monospace' }}
        />
      </Modal>
    </>
  );
};

export default UniqueCodeMatcher;
