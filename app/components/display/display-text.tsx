import { ButtonCopy } from '@/components/button';

function TextDisplay({ value, withCopy = false }: { value: string; withCopy?: boolean }) {
  return (
    <div className="flex items-center space-x-2">
      <span>{value}</span>
      {withCopy && <ButtonCopy value={value} />}
    </div>
  );
}

export default TextDisplay;
