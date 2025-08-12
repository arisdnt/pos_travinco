'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Product {
  id: string;
  nama_produk_jadi: string;
  harga_jual: number;
}

interface ProductSearchInputProps {
  products: Product[];
  value: string;
  onSelect: (productId: string) => void;
  placeholder?: string;
  className?: string;
}

export function ProductSearchInput({
  products,
  value,
  onSelect,
  placeholder = "Cari produk...",
  className = ""
}: ProductSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get selected product name for display
  const selectedProduct = products.find(p => p.id === value);
  const displayValue = selectedProduct ? selectedProduct.nama_produk_jadi : searchTerm;

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.nama_produk_jadi.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
    setSelectedIndex(-1);
  }, [searchTerm, products]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        dropdownRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        // Reset search term if no product is selected
        if (!value) {
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    
    // Clear selection if user is typing
    if (value && newValue !== selectedProduct?.nama_produk_jadi) {
      onSelect('');
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (!searchTerm && !value) {
      setSearchTerm('');
    }
  };

  const handleProductSelect = (product: Product) => {
    onSelect(product.id);
    setSearchTerm(product.nama_produk_jadi);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredProducts[selectedIndex]) {
          handleProductSelect(filteredProducts[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-4"
          autoComplete="off"
        />
        {value && (
          <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500 w-4 h-4" />
        )}
      </div>

      {isOpen && filteredProducts.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredProducts.map((product, index) => (
            <div
              key={product.id}
              onClick={() => handleProductSelect(product)}
              className={`px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                index === selectedIndex
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              } ${
                value === product.id
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {product.nama_produk_jadi}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 font-semibold">
                    {formatCurrency(product.harga_jual)}
                  </p>
                </div>
                {value === product.id && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && filteredProducts.length === 0 && searchTerm.trim() !== '' && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg"
        >
          <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
            Tidak ada produk yang ditemukan
          </div>
        </div>
      )}
    </div>
  );
}