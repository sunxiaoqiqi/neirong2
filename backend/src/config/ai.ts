export const aiConfig = {
  apiKey: process.env.DASHSCOPE_API_KEY || '',
  baseURL: 'https://dashscope.aliyuncs.com/api/v1',
}

if (!aiConfig.apiKey) {
  console.warn('⚠️  警告: DASHSCOPE_API_KEY 未配置，AI功能将不可用')
}

