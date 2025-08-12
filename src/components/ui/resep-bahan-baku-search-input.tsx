'use client';

import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BahanBaku {
  id: string;
  nama_bahan_baku: string;
  unit: string;
}

interface ResepBahanBakuSearchInputProps {
  bahanBakuList: BahanBaku[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  excludeIds?: string[];
}

export function ResepBahanBakuSearchInput({
  bahanBakuList,
  value,
  onValueChange,
  placeholder = "Cari bahan baku...",
  className,
  required = false,
  excludeIds = []
}: ResepBahanBakuSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter bahan baku berdasarkan search term dan exclude IDs
  const filteredBahanBaku = bahanBakuList.filter(bahan =>
    bahan.nama_bahan_baku.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !excludeIds.map(String).includes(String(bahan.id))
  );

  // Get selected bahan baku untuk display
  const selectedBahanBaku = bahanBakuList.find(b => String(b.id) === String(value));

  // Update search term ketika value berubah dari luar
  useEffect(() => {
    if (value && selectedBahanBaku) {
      setSearchTerm(selectedBahanBaku.nama_bahan_baku);
    } else {
      setSearchTerm('');
    }
  }, [value, selectedBahanBaku]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
    
    // Jika input kosong, clear selection
    if (!newValue) {
      onValueChange('');
    } else {
      // Jika user mengetik dan tidak ada yang cocok dengan selection saat ini,
      // atau jika input tidak cocok dengan nama bahan baku yang dipilih, clear selection
      if (selectedBahanBaku && !selectedBahanBaku.nama_bahan_baku.toLowerCase().includes(newValue.toLowerCase())) {
        onValueChange('');
      }
    }
  };

  // Handle bahan baku selection
  const handleSelectBahanBaku = (bahanBaku: BahanBaku) => {
    setSearchTerm(bahanBaku.nama_bahan_baku);
    onValueChange(String(bahanBaku.id));
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredBahanBaku.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredBahanBaku.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredBahanBaku[highlightedIndex]) {
          handleSelectBahanBaku(filteredBahanBaku[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
        
        // Jika ada selection dan search term tidak cocok, kembalikan ke nama bahan baku yang dipilih
        if (selectedBahanBaku && searchTerm !== selectedBahanBaku.nama_bahan_baku) {
          setSearchTerm(selectedBahanBaku.nama_bahan_baku);
        }
        // Jika tidak ada selection dan ada search term, clear search term
        else if (!selectedBahanBaku && searchTerm) {
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedBahanBaku, searchTerm]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
          {filteredBahanBaku.length > 0 ? (
            <ul ref={listRef} className="py-1">
              {filteredBahanBaku.map((bahanBaku, index) => (
                <li
                  key={bahanBaku.id}
                  className={cn(
                    "px-3 py-2 cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground",
                    index === highlightedIndex && "bg-accent text-accent-foreground",
                    String(value) === String(bahanBaku.id) && "bg-primary/10 text-primary font-medium"
                  )}
                  onClick={() => handleSelectBahanBaku(bahanBaku)}
                >
                  <div className="flex items-center justify-between">
                    <span>{bahanBaku.nama_bahan_baku}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {bahanBaku.unit}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {excludeIds.length > 0 && bahanBakuList.length > 0 
                ? "Semua bahan baku sudah dipilih atau tidak ada yang cocok"
                : "Tidak ada bahan baku ditemukan"
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}