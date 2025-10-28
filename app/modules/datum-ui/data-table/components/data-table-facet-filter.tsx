import { Button } from '@/modules/shadcn/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/modules/shadcn/ui/dropdown-menu';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';

export interface FacetOption {
  value: string;
  label: string;
}

export interface FacetMenuItem {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

export interface DataTableFacetFilterProps {
  label: string;
  placeholder?: string;
  options: FacetOption[];
  value?: string | string[];
  onValueChange: (value: string | string[] | undefined) => void;
  multiSelect?: boolean;
  clearLabel?: string;
  menuItems?: FacetMenuItem[];
  className?: string;
}

export function DataTableFacetFilter({
  label,
  placeholder,
  options,
  value,
  onValueChange,
  multiSelect = false,
  clearLabel = t`Clear`,
  menuItems,
  className,
}: DataTableFacetFilterProps) {
  const currentValue = value;
  const selectedCount = multiSelect
    ? Array.isArray(currentValue)
      ? currentValue.length
      : 0
    : currentValue
      ? 1
      : 0;

  const handleOptionChange = (optionValue: string, checked: boolean) => {
    if (multiSelect) {
      const currentArray = Array.isArray(currentValue) ? currentValue : [];
      const newValue = checked
        ? [...currentArray, optionValue]
        : currentArray.filter((v) => v !== optionValue);
      onValueChange(newValue.length > 0 ? newValue : undefined);
    } else {
      onValueChange(checked ? optionValue : undefined);
    }
  };

  const handleClear = () => {
    onValueChange(undefined);
  };

  const isOptionSelected = (optionValue: string) => {
    if (multiSelect) {
      return Array.isArray(currentValue) && currentValue.includes(optionValue);
    }
    return currentValue === optionValue;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className}>
          {selectedCount > 0 ? `${label} (${selectedCount})` : placeholder || label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>
          <Trans>{label}</Trans>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={isOptionSelected(option.value)}
            onCheckedChange={(checked) => handleOptionChange(option.value, Boolean(checked))}
            onSelect={(e) => e.preventDefault()}>
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}

        {menuItems && menuItems.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {menuItems.map((item, index) => (
              <DropdownMenuItem
                key={index}
                onSelect={(e) => {
                  e.preventDefault();
                  item.onClick();
                }}
                data-variant={item.variant}>
                <Trans>{item.label}</Trans>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleClear} data-variant="destructive">
          <Trans>{clearLabel}</Trans>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
