'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Check } from 'lucide-react';

interface BahanBaku {
  id: string;
  nama_bahan_baku: string;
  unit: string;
}

interface BahanBakuSearchInputProps {
  bahanBakuList: BahanBaku[];
  value: string;
  onSelect: (bahanBakuId: string) => void;
  placeholder?: string;
  className?: string;
}

export function BahanBakuSearchInput({
  bahanBakuList,
  value,
  onSelect,
  placeholder = "Cari bahan baku...",
  className = ""
}: BahanBakuSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredBahanBaku, setFilteredBahanBaku] = useState<BahanBaku[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get selected bahan baku name for display
  const selectedBahanBaku = bahanBakuList.find(b => b.id === value);
  const displayValue = selectedBahanBaku ? selectedBahanBaku.nama_bahan_baku : searchTerm;

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredBahanBaku(bahanBakuList);
    } else {
      const filtered = bahanBakuList.filter(bahan =>
        bahan.nama_bahan_baku.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredBahanBaku(filtered);
    }
    setSelectedIndex(-1);
  }, [searchTerm, bahanBakuList]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        dropdownRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        // Reset search term if no bahan baku is selected
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
    if (value && newValue !== selectedBahanBaku?.nama_bahan_baku) {
      onSelect('');
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (!searchTerm && !value) {
      setSearchTerm('');
    }
  };

  const handleBahanBakuSelect = (bahan: BahanBaku) => {
    onSelect(bahan.id);
    setSearchTerm(bahan.nama_bahan_baku);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredBahanBaku.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredBahanBaku[selectedIndex]) {
          handleBahanBakuSelect(filteredBahanBaku[selectedIndex]);
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

      {isOpen && filteredBahanBaku.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredBahanBaku.map((bahan, index) => (
            <div
              key={bahan.id}
              onClick={() => handleBahanBakuSelect(bahan)}
              className={`px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                index === selectedIndex
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              } ${
                value === bahan.id
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {bahan.nama_bahan_baku}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Satuan: {bahan.unit}
                  </p>
                </div>
                {value === bahan.id && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && filteredBahanBaku.length === 0 && searchTerm.trim() !== '' && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg"
        >
          <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
            Tidak ada bahan baku yang ditemukan
          </div>
        </div>
      )}
    </div>
  );
}