import { useState, useEffect } from 'react';

interface LogFilterProps {
  value: string;
  onChange: (filter: string) => void;
}

/**
 * 關鍵字過濾輸入框
 * 使用 debounce 避免輸入過程中頻繁觸發過濾
 */
function LogFilter({ value, onChange }: LogFilterProps) {
  const [inputValue, setInputValue] = useState(value);

  // 同步外部值
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounce：輸入停止 300ms 後才觸發 onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== value) {
        onChange(inputValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, value, onChange]);

  return (
    <input
      type="text"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      placeholder="關鍵字過濾..."
      className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

export default LogFilter;
