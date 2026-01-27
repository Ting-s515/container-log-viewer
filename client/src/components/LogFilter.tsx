import { useState, useEffect } from 'react';

interface LogFilterProps {
  value: string;
  onChange: (filter: string) => void;
}

/**
 * Keyword filter input
 * Uses debounce to avoid frequent filter triggers during typing
 */
function LogFilter({ value, onChange }: LogFilterProps) {
  const [inputValue, setInputValue] = useState(value);

  // Sync with external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounce: trigger onChange 300ms after user stops typing
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
      placeholder="input keyword"
      className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

export default LogFilter;
