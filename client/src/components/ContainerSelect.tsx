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
 * Container dropdown selector
 * Shows container name and status for easy selection
 */
function ContainerSelect({ containers, value, onChange }: ContainerSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">Select container...</option>
      {containers.map((container) => (
        <option key={container.id} value={container.id}>
          {/* Show container name with running status indicator */}
          {container.name} ({container.state === 'running' ? '🟢' : '⚪'})
        </option>
      ))}
    </select>
  );
}

export default ContainerSelect;
