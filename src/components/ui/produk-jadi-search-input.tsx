'use client';

import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProdukJadi {
  id: string;
  nama_produk_jadi: string;
}

interface ProdukJadiSearchInputProps {
  produkJadiList: ProdukJadi[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function ProdukJadiSearchInput({
  produkJadiList,
  value,
  onValueChange,
  placeholder = "Cari produk jadi...",
  className,
  required = false
}: ProdukJadiSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter produk berdasarkan search term
  const filteredProduk = produkJadiList.filter(produk =>
    produk.nama_produk_jadi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected produk untuk display
  const selectedProduk = produkJadiList.find(p => String(p.id) === String(value));

  // Update search term ketika value berubah dari luar
  useEffect(() => {
    if (value && selectedProduk) {
      setSearchTerm(selectedProduk.nama_produk_jadi);
    } else {
      setSearchTerm('');
    }
  }, [value, selectedProduk]);

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
      // atau jika input tidak cocok dengan nama produk yang dipilih, clear selection
      if (selectedProduk && !selectedProduk.nama_produk_jadi.toLowerCase().includes(newValue.toLowerCase())) {
        onValueChange('');
      }
    }
  };

  // Handle produk selection
  const handleSelectProduk = (produk: ProdukJadi) => {
    setSearchTerm(produk.nama_produk_jadi);
    onValueChange(String(produk.id));
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
          prev < filteredProduk.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredProduk.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredProduk[highlightedIndex]) {
          handleSelectProduk(filteredProduk[highlightedIndex]);
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
        
        // Jika ada selection dan search term tidak cocok, kembalikan ke nama produk yang dipilih
        if (selectedProduk && searchTerm !== selectedProduk.nama_produk_jadi) {
          setSearchTerm(selectedProduk.nama_produk_jadi);
        }
        // Jika tidak ada selection dan ada search term, clear search term
        else if (!selectedProduk && searchTerm) {
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedProduk, searchTerm]);

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
          {filteredProduk.length > 0 ? (
            <ul ref={listRef} className="py-1">
              {filteredProduk.map((produk, index) => (
                <li
                  key={produk.id}
                  className={cn(
                    "px-3 py-2 cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground",
                    index === highlightedIndex && "bg-accent text-accent-foreground",
                    String(value) === String(produk.id) && "bg-primary/10 text-primary font-medium"
                  )}
                  onClick={() => handleSelectProduk(produk)}
                >
                  <div className="flex items-center justify-between">
                    <span>{produk.nama_produk_jadi}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Tidak ada produk jadi ditemukan
            </div>
          )}
        </div>
      )}
    </div>
  );
}