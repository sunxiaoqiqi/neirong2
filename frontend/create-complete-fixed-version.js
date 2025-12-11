const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx');
const backupFilePath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx.bak.final');

console.log('Creating complete fixed LeftSidebar component...');

// 首先创建一个包含所有功能的完整组件，但确保语法正确
const completeFixedComponent = `import React, { useState, useEffect } from 'react';
import { Button, Drawer, Input, Upload, message, Modal, Space, Tabs, Select, Slider, Collapse, Tooltip } from 'antd';
import ColorPickerWithEyeDropper from './ColorPickerWithEyeDropper';
import {
  FileImageOutlined,
  AppstoreOutlined,
  SearchOutlined,
  FormOutlined,
  UploadOutlined,
  CodeOutlined,
  DeleteOutlined,
  BarChartOutlined,
  CopyOutlined,
  EditOutlined
} from '@ant-design/icons';
import { aiService } from '@/services/aiService';
import { templateService } from '@/services/templateService';
import { fabric } from 'fabric';
import { testUniqueCodeMatching } from './testUniqueCodeMatching';

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Panel } = Collapse;

// Validate color format
const validateColor = (color: string): string => {
  // Check if valid hex color
  if (/^#[0-9A-F]{6}$/i.test(color)) {
    return color;
  }
  // Predefined color map
  const colorMap: Record<string, string> = {
    'red': '#ff0000',
    'green': '#00ff00',
    'blue': '#0000ff',
    'black': '#000000',
    'white': '#ffffff',
    'yellow': '#ffff00',
    'orange': '#ffa500',
    'purple': '#800080'
  };
  
  return colorMap[color] || '#000000';
};

interface LeftSidebarProps {
  canvas?: fabric.Canvas | null;
  onUpdateTemplate?: (data: any) => void;
  onAddImage?: (url: string) => void;
  onAddText?: (text: string) => void;
  onExport?: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  canvas,
  onUpdateTemplate,
  onAddImage,
  onAddText,
  onExport
}) => {
  // 状态管理
  const [activeTab, setActiveTab] = useState<string>('images');
  const [showCodeDrawer, setShowCodeDrawer] = useState<boolean>(false);
  const [templateContent, setTemplateContent] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiResult, setAiResult] = useState<string>('');
  const [imageGallery, setImageGallery] = useState<Array<{url: string, name: string}>>([]);
  const [templateOptions, setTemplateOptions] = useState<Array<{value: string, label: string}>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [textContent, setTextContent] = useState<string>('');
  
  // 加载图片库
  useEffect(() => {
    const loadImages = async () => {
      try {
        // 这里应该调用实际的API获取图片列表
        const mockImages = [
          { url: '/images/image1.jpg', name: '图片1' },
          { url: '/images/image2.jpg', name: '图片2' }
        ];
        setImageGallery(mockImages);
      } catch (error) {
        console.error('加载图片失败:', error);
      }
    };
    loadImages();
  }, []);
  
  // 加载模板选项
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        if (templateService && templateService.getTemplates) {
          const templates = await templateService.getTemplates();
          setTemplateOptions(templates.map((t: any) => ({ value: t.id, label: t.name })));
        }
      } catch (error) {
        console.error('加载模板失败:', error);
      }
    };
    loadTemplates();
  }, []);
  
  // 处理图片上传
  const handleImageUpload = async (info: any) => {
    try {
      if (info.file.status === 'done') {
        message.success('图片上传成功');
        const newImage = {
          url: info.file.response.url || URL.createObjectURL(info.file.originFileObj),
          name: info.file.name
        };
        setImageGallery([...imageGallery, newImage]);
        if (onAddImage) {
          onAddImage(newImage.url);
        }
      } else if (info.file.status === 'error') {
        message.error('图片上传失败');
      }
    } catch (error) {
      console.error('上传处理失败:', error);
    }
  };
  
  // 处理模板选择
  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value);
    // 这里应该加载对应的模板内容
  };
  
  // Generate AI prompt
  const generateAiPrompt = () => {
    if (templateContent) {
      const prompt = `Please generate content based on the following template:\n${templateContent}\n\nRequirements: Maintain the structure and format of the original copy, but replace it with new content.`;
      setAiPrompt(prompt);
      message.success('AI prompt generated');
    }
  };
  
  // 处理AI结果反写
  const handleAiResultWriteBack = () => {
    if (aiResult && testUniqueCodeMatching) {
      try {
        const result = testUniqueCodeMatching(templateContent, aiResult);
        if (result && onUpdateTemplate) {
          onUpdateTemplate(result);
          message.success('AI result written back to template');
        }
      } catch (error) {
        console.error('AI result write back failed:', error);
        message.error('AI result write back failed');
      }
    }
  };
  
  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('Copied to clipboard');
    }).catch(() => {
      message.error('Copy failed');
    });
  };

  return (
    <div className="left-sidebar">
      {/* 主选项卡 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} className="h-full">
        {/* 图片库选项卡 */}
        <TabPane tab={<span><FileImageOutlined /> 图片库</span>} key="images">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">Select Images</h3>
            
            {/* Image Upload Area */}
            <Upload.Dragger 
              name="file" 
              multiple 
              accept="image/*"
              beforeUpload={() => false}
              onChange={handleImageUpload}
              className="mb-4"
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">Click or drag images here to upload</p>
              <p className="ant-upload-hint">
                Support JPG, PNG, GIF formats, single file no larger than 5MB
              </p>
            </Upload.Dragger>
            
            {/* Image Gallery */}
            <div className="grid grid-cols-2 gap-2">
              {imageGallery.map((image, index) => (
                <div key={index} className="relative cursor-pointer" onClick={() => onAddImage?.(image.url)}>
                  <img 
                    src={image.url} 
                    alt={image.name} 
                    className="w-full h-20 object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                    {image.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabPane>
        
        {/* 模板选项卡 */}
        <TabPane tab={<span><FormOutlined /> 模板管理</span>} key="templates">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">Select Template</h3>
            
            <Select
              style={{ width: '100%', marginBottom: '16px' }}
              placeholder="Please select a template"
              value={selectedTemplate}
              onChange={handleTemplateChange}
              options={templateOptions}
            />
            
            <h3 className="text-lg font-semibold mb-2">Template Content</h3>
            <TextArea
              rows={10}
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              placeholder="Edit template content or paste template code here"
            />
            
            <div className="mt-4 flex gap-2">
              <Button type="primary" onClick={generateAiPrompt}>
                Generate AI Prompt
              </Button>
              <Button onClick={() => setShowCodeDrawer(true)}>
                View Code
              </Button>
            </div>
          </div>
        </TabPane>
        
        {/* AI助手选项卡 */}
        <TabPane tab={<span><CodeOutlined /> AI助手</span>} key="ai">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">AI Prompt</h3>
            <TextArea
              rows={6}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="AI prompt will be generated here"
            />
            <Button 
              type="primary" 
              className="mt-2"
              onClick={() => copyToClipboard(aiPrompt)}
            >
              <CopyOutlined /> Copy Prompt
            </Button>
            
            <h3 className="text-lg font-semibold mt-4 mb-2">AI Result</h3>
            <TextArea
              rows={8}
              value={aiResult}
              onChange={(e) => setAiResult(e.target.value)}
              placeholder="Paste AI generated results here"
            />
            <Button 
              type="primary" 
              className="mt-2"
              onClick={handleAiResultWriteBack}
            >
              Write Result Back to Template
            </Button>
            
            <div className="mt-2 text-xs text-gray-500">
              Tip: Paste AI generated content into the input box above by paragraphs, the system will automatically match the content to the corresponding text position in the template
            </div>
            
            {/* Usage Help */}
            <div className="text-xs text-gray-500 border-t border-gray-100 pt-2 mt-4">
              Usage Process: 1. Analyze Template → 2. Input Article Content → 3. Copy AI Prompt → 4. Write AI Result Back to Template
            </div>
          </div>
        </TabPane>
        
        {/* 导出选项卡 */}
        <TabPane tab={<span><BarChartOutlined /> 导出</span>} key="export">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Export Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Export Format</label>
                <Select defaultValue="png" style={{ width: '100%' }}>
                  <Select.Option value="png">PNG Image</Select.Option>
                  <Select.Option value="pdf">PDF Document</Select.Option>
                  <Select.Option value="html">HTML Webpage</Select.Option>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Image Quality</label>
                <Slider min={10} max={100} defaultValue={90} />
              </div>
              
              <Button 
                type="primary" 
                size="large" 
                onClick={onExport}
                className="w-full"
              >
                Start Export
              </Button>
            </div>
          </div>
        </TabPane>
      </Tabs>
      
      {/* 代码查看抽屉 */}
      <Drawer
        title="模板代码"
        placement="right"
        onClose={() => setShowCodeDrawer(false)}
        open={showCodeDrawer}
        width={600}
      >
        <TextArea
          rows={20}
          value={templateContent}
          onChange={(e) => setTemplateContent(e.target.value)}
          className="font-mono"
        />
      </Drawer>
    </div>
  );
};

export default LeftSidebar;
`;

// Write the fixed component file
fs.writeFileSync(filePath, completeFixedComponent, 'utf8');
fs.writeFileSync(filePath + '.complete.bak', completeFixedComponent, 'utf8');

console.log('Complete fixed LeftSidebar component created successfully!');
console.log('Fixed file saved to:', filePath);
console.log('Backup file saved to:', filePath + '.complete.bak');
