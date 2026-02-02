import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import type { Container } from '../types';

// 從 types/index.ts 引入 Container 型別，消除重複定義

interface ContainerSelectProps {
  containers: Container[];
  value: string;
  onChange: (containerId: string) => void;
}

/**
 * Container dropdown selector using Headless UI
 * 支援自定義最大高度，超過 8 個選項後顯示卷軸
 */
function ContainerSelect({ containers, value, onChange }: ContainerSelectProps) {
  // 根據 value 找到當前選中的容器
  const selectedContainer = containers.find((c) => c.id === value);

  return (
    <Listbox value={value} onChange={onChange}>
      {/* min-w-[200px] 最小寬度，max-w-md (448px) 最大寬度 */}
      <div className="relative min-w-[200px] max-w-md">
        {/* 下拉按鈕：overflow-x-auto 超過最大寬度時可水平滾動，pr-8 預留箭頭空間 */}
        <ListboxButton className="w-full bg-gray-700 border border-gray-600 rounded px-3 pr-8 py-1.5 text-sm text-left whitespace-nowrap overflow-x-auto focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
          {selectedContainer ? (
            <span>
              {selectedContainer.state === 'running' ? '🟢' : '⚪'}{' '}
              {selectedContainer.name}
            </span>
          ) : (
            <span className="text-gray-400">Select container...</span>
          )}
          {/* 下拉箭頭 */}
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </span>
        </ListboxButton>

        {/* 下拉選單：max-h-64 垂直最多顯示 8 個選項，max-w-md (448px) 水平最大寬度，overflow-auto 支援雙向滾動 */}
        <ListboxOptions className="absolute z-10 mt-1 min-w-full max-w-md bg-gray-700 border border-gray-600 rounded shadow-lg max-h-80 overflow-auto focus:outline-none">
          {containers.map((container) => (
            <ListboxOption
              key={container.id}
              value={container.id}
              className="px-3 py-2 text-sm whitespace-nowrap cursor-pointer data-[focus]:bg-gray-600 data-[selected]:bg-blue-600"
            >
              {container.state === 'running' ? '🟢' : '⚪'} {container.name}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}

export default ContainerSelect;
