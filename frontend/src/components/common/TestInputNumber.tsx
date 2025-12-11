import React from 'react';
import { InputNumber, Space } from 'antd';

// 测试InputNumber组件的formatter属性是否能正确显示单位
const TestInputNumber: React.FC = () => {
  const [value, setValue] = React.useState<number>(50);

  return (
    <div>
      <h3>测试InputNumber的formatter属性</h3>
      
      {/* 正确的方式：使用formatter属性 */}
      <div style={{ marginBottom: 20 }}>
        <p>正确方式（使用formatter）：</p>
        <Space.Compact style={{ width: '100%' }}>
          <InputNumber
            style={{ flex: 1 }}
            min={0}
            max={100}
            value={value}
            onChange={(newValue) => setValue(newValue || 0)}
            formatter={(value) => `${value}%`}
          />
        </Space.Compact>
      </div>

      {/* 不推荐的方式：使用单独的Input显示单位 */}
      <div>
        <p>不推荐方式（使用单独的Input显示单位）：</p>
        <Space.Compact style={{ width: '100%' }}>
          <InputNumber
            style={{ flex: 1 }}
            min={0}
            max={100}
            value={value}
            onChange={(newValue) => setValue(newValue || 0)}
          />
          {/* 这个方式会导致addonAfter警告 */}
        </Space.Compact>
      </div>
    </div>
  );
};

export default TestInputNumber;
