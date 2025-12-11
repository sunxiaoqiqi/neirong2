import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'components', 'editor', 'LeftSidebar.tsx');
console.log('Creating complete fixed LeftSidebar component...');

// 创建一个包含所有核心功能的完整组件代码
const componentContent = `import React, { useState, useEffect } from 'react';
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
const validateColor = (color) => {
  if (/^#[0-9A-F]{6}$/i.test(color)) {
    return color;
  }
  const colorMap = {
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

const LeftSidebar = ({ canvas, onUpdateTemplate, onAddImage, onAddText, onExport }) => {
  // State management
  const [activeTab, setActiveTab] = useState('images');
  const [showCodeDrawer, setShowCodeDrawer] = useState(false);
  const [templateContent, setTemplateContent] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [imageGallery, setImageGallery] = useState([]);
  const [templateOptions, setTemplateOptions] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [textContent, setTextContent] = useState('');
  
  // Load image gallery
  useEffect(() => {
    const loadImages = async () => {
      try {
        const mockImages = [
          { url: '/images/image1.jpg', name: 'Image 1' },
          { url: '/images/image2.jpg', name: 'Image 2' }
        ];
        setImageGallery(mockImages);
      } catch (error) {
        console.error('Failed to load images:', error);
      }
    };
    loadImages();
  }, []);
  
  // Load template options
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        if (typeof templateService !== 'undefined' && templateService.getTemplates) {
          const templates = await templateService.getTemplates();
          setTemplateOptions(templates.map(t => ({ value: t.id, label: t.name })));
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    };
    loadTemplates();
  }, []);
  
  // Handle image upload
  const handleImageUpload = async (info) => {
    try {
      if (info.file && info.file.status === 'done') {
        message.success('Image uploaded successfully');
        const newImage = {
          url: info.file.response && info.file.response.url ? info.file.response.url : URL.createObjectURL(info.file.originFileObj),
          name: info.file.name
        };
        setImageGallery([...imageGallery, newImage]);
        if (onAddImage) {
          onAddImage(newImage.url);
        }
      } else if (info.file && info.file.status === 'error') {
        message.error('Image upload failed');
      }
    } catch (error) {
      console.error('Upload processing failed:', error);
    }
  };
  
  // Handle template change
  const handleTemplateChange = (value) => {
    setSelectedTemplate(value);
  };
  
  // Generate AI prompt
  const generateAiPrompt = () => {
    if (templateContent) {
      const prompt = "Please generate content based on the following template:\n" + 
                    templateContent + "\n\n" +
                    "Requirements: Maintain the structure and format of the original copy, but replace it with new content.";
      setAiPrompt(prompt);
      message.success('AI prompt generated');
    }
  };
  
  // Handle AI result write back
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
  
  // Copy to clipboard
  const copyToClipboard = (text) => {
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        message.success('Copied to clipboard');
      }).catch(() => {
        message.error('Copy failed');
      });
    }
  };

  return (
    <div className="left-sidebar">
      {/* Main Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} className="h-full">
        {/* Image Gallery Tab */}
        <TabPane tab={<span><FileImageOutlined /> Image Gallery</span>} key="images">
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
                <div key={index} className="relative cursor-pointer" onClick={() => onAddImage && onAddImage(image.url)}>
                  <img 
                    src={image.url} 
                    alt={image.name} 
                    className="w-full h-20 object-cover rounded"
                    onError={(e) => {
                      if (e.target) {
                        e.target.src = '/images/placeholder.jpg';
                      }
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
        
        {/* Template Management Tab */}
        <TabPane tab={<span><FormOutlined /> Template Management</span>} key="templates">
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
              onChange={(e) => e.target && setTemplateContent(e.target.value)}
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
        
        {/* AI Assistant Tab */}
        <TabPane tab={<span><CodeOutlined /> AI Assistant</span>} key="ai">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">AI Prompt</h3>
            <TextArea
              rows={6}
              value={aiPrompt}
              onChange={(e) => e.target && setAiPrompt(e.target.value)}
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
              onChange={(e) => e.target && setAiResult(e.target.value)}
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
              Tip: Paste AI generated content into the input box above by paragraphs
            </div>
            
            {/* Usage Help */}
            <div className="text-xs text-gray-500 border-t border-gray-100 pt-2 mt-4">
              Usage Process: 1. Analyze Template → 2. Input Article → 3. Copy AI Prompt → 4. Write AI Result Back
            </div>
          </div>
        </TabPane>
        
        {/* Export Tab */}
        <TabPane tab={<span><BarChartOutlined /> Export</span>} key="export">
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
      
      {/* Code View Drawer */}
      <Drawer
        title="Template Code"
        placement="right"
        onClose={() => setShowCodeDrawer(false)}
        open={showCodeDrawer}
        width={600}
      >
        <TextArea
          rows={20}
          value={templateContent}
          onChange={(e) => e.target && setTemplateContent(e.target.value)}
          className="font-mono"
        />
      </Drawer>
    </div>
  );
};

export default LeftSidebar;`;

// Write the component file
fs.writeFileSync(filePath, componentContent, 'utf8');
fs.writeFileSync(filePath + '.complete.fixed.bak', componentContent, 'utf8');

console.log('Complete fixed LeftSidebar component created successfully!');
console.log('Fixed file saved to:', filePath);
