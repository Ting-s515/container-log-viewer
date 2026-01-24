interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
}

interface ContainerSelectProps {
  containers: Container[];
  value: string;
  onChange: (containerId: string) => void;
}

/**
 * 容器選擇下拉選單
 * 顯示容器名稱與狀態，方便使用者選擇目標容器
 */
function ContainerSelect({ containers, value, onChange }: ContainerSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">選擇容器...</option>
      {containers.map((container) => (
        <option key={container.id} value={container.id}>
          {/* 顯示容器名稱與運行狀態 */}
          {container.name} ({container.state === 'running' ? '🟢' : '⚪'})
        </option>
      ))}
    </select>
  );
}

export default ContainerSelect;
