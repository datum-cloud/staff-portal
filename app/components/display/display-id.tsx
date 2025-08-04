import { ButtonCopy } from '@/components/button';

function truncateMiddle(str: string, maxLength = 16) {
  if (str.length <= maxLength) return str;
  const half = Math.floor((maxLength - 3) / 2);
  return `${str.slice(0, half)}...${str.slice(-half)}`;
}

function IDDisplay({ value }: { value: string }) {
  return (
    <div className="flex items-center space-x-2">
      <span>{truncateMiddle(value)}</span>
      <ButtonCopy value={value} />
    </div>
  );
}

export default IDDisplay;
