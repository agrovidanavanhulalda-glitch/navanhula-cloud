import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

export interface DocumentProductOption {
  id: string;
  name: string;
  salePrice: number;
  stock: number;
  code?: string;
}

interface DocumentProductPickerProps {
  products: DocumentProductOption[];
  value?: string;
  onSelect: (product: DocumentProductOption) => void;
  disabled?: boolean;
}

const DocumentProductPicker: React.FC<DocumentProductPickerProps> = ({
  products,
  value,
  onSelect,
  disabled,
}) => {
  const [open, setOpen] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === value),
    [products, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate text-left">
            {selectedProduct ? selectedProduct.name : 'Selecionar produto do estoque'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar produto..." />
          <CommandList>
            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`${product.name} ${product.code || ''}`}
                  onSelect={() => {
                    onSelect(product);
                    setOpen(false);
                  }}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate font-medium">{product.name}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {product.code ? `${product.code} • ` : ''}
                      {formatCurrency(product.salePrice)} • Estoque: {product.stock}
                    </p>
                  </div>
                  <Check className={cn('h-4 w-4', selectedProduct?.id === product.id ? 'opacity-100' : 'opacity-0')} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default DocumentProductPicker;
