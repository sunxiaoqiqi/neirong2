# 基于唯一标识代码的精确匹配功能

## 功能介绍

本模块提供了一种基于唯一标识代码的精确匹配机制，用于将AI生成的文案内容精确应用到模板的指定位置。通过这种方式，可以确保文案内容能够一对一地匹配到设计模板中的对应文本元素，解决了传统匹配方式中可能出现的内容错位或匹配不准确的问题。

## 核心组件

### 1. `testUniqueCodeMatching.tsx`

核心匹配算法实现，负责：
- 解析AI生成的JSON格式内容
- 基于唯一标识代码查找对应的文本元素
- 将内容精确应用到画布上的指定位置
- 提供完善的错误处理和用户反馈

### 2. `UniqueCodeMatcher.tsx`

独立的UI组件，提供：
- AI结果输入区域
- 示例格式展示功能
- 一键应用精确匹配的按钮

## 集成方法

### 导入组件

```typescript
import { testUniqueCodeMatching } from './testUniqueCodeMatching';
import UniqueCodeMatcher from './UniqueCodeMatcher';
```

### 在已有组件中使用

```typescript
// 在适当的位置渲染UniqueCodeMatcher组件
<UniqueCodeMatcher 
  canvas={canvas} 
  templateAnalysisResult={templateAnalysisResult} 
/>
```

或者直接调用匹配函数：

```typescript
// 当用户点击应用按钮时调用
const handleApply = () => {
  testUniqueCodeMatching(
    canvas, 
    templateAnalysisResult, 
    aiResultInput 
  );
};
```

## 使用流程

1. **分析模板**：首先点击"分析模板"按钮，系统会为每个文本元素生成唯一标识代码
2. **获取AI结果**：将生成的唯一标识代码发送给AI，让AI按照指定格式生成文案
3. **输入结果**：将AI返回的JSON格式内容粘贴到输入框中
4. **精确匹配**：点击"应用文案（精确匹配）"按钮，系统会基于唯一标识代码进行一对一匹配

## JSON格式说明

AI生成的内容必须遵循以下JSON格式：

```json
{
  "structure": {
    "uniqueCode1": "这里是对应uniqueCode1的文本内容",
    "uniqueCode2": "这里是对应uniqueCode2的文本内容",
    "uniqueCode3": "这里是对应uniqueCode3的文本内容"
  }
}
```

**注意事项**：
- 必须使用双引号，不能使用单引号
- 所有键名都必须用双引号包裹
- 确保没有多余的逗号
- uniqueCode必须与模板分析结果完全一致（区分大小写和空格）

## 错误处理

系统内置了完善的错误处理机制，会对以下情况给出明确提示：

1. JSON格式错误：提供详细的格式说明和正确示例
2. 唯一标识代码不匹配：列出所有未能匹配的代码
3. 内容超长：自动进行智能截断，避免文本溢出
4. 其他异常：提供友好的错误信息和解决方案建议

## 最佳实践

1. **保持一致性**：确保AI使用的唯一标识代码与模板分析结果完全一致
2. **分段生成**：对于复杂模板，可以分批次生成和应用文案
3. **检查预览**：每次应用后检查预览效果，确认内容显示正常
4. **备份原始**：在应用新内容前，可以先保存原始模板状态

## 故障排除

### 常见问题及解决方案

1. **匹配失败**：
   - 检查uniqueCode是否完全一致（包括大小写、空格）
   - 确认JSON格式是否正确
   - 重新分析模板获取最新的uniqueCode

2. **部分匹配**：
   - 根据错误提示检查未匹配的代码
   - 确认AI生成的JSON中是否包含所有必要的uniqueCode

3. **内容显示异常**：
   - 检查文本长度是否超过元素容量
   - 确认文本格式是否与模板设计兼容

## 示例

### 模板分析结果示例

```json
{
  "elementMap": {
    "TITLE_001": { "id": "text_1", "estimatedMaxChars": 50 },
    "SUBTITLE_001": { "id": "text_2", "estimatedMaxChars": 100 },
    "PARAGRAPH_001": { "id": "text_3", "estimatedMaxChars": 300 }
  }
}
```

### 对应的AI结果格式

```json
{
  "structure": {
    "TITLE_001": "这是一个精美标题",
    "SUBTITLE_001": "这是一个详细的副标题描述",
    "PARAGRAPH_001": "这里是段落内容，可以包含更多详细的文本信息，系统会根据文本框容量自动调整显示方式。"
  }
}
```
