"use client";

import { Search, Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchAndFilterFormProps = {
  // Search props
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  
  // Date filter props
  startDate: string;
  endDate: string;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  onApply: () => void;
  
  // Style props
  className?: string;
  showDateFilter?: boolean;
};

export function SearchAndFilterForm({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Cari data...",
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
  onApply,
  className,
  showDateFilter = true,
}: SearchAndFilterFormProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm",
        className
      )}
    >
      {/* Search Input */}
      <div className="relative flex-1 w-full sm:w-auto min-w-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
        />
      </div>

      {/* Date Filter */}
      {showDateFilter && (
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Periode:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => onChangeStart(e.target.value)}
              className="h-10 px-3 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors min-w-[140px]"
              title="Tanggal mulai"
            />
            
            <span className="text-gray-400 text-sm">—</span>
            
            <input
              type="date"
              value={endDate}
              onChange={(e) => onChangeEnd(e.target.value)}
              className="h-10 px-3 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors min-w-[140px]"
              title="Tanggal selesai"
            />
          </div>
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={onApply}
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white border-0 transition-colors"
          >
            <Filter className="h-4 w-4 mr-2" />
            Terapkan
          </Button>
        </div>
      )}
    </div>
  );
}

export default SearchAndFilterForm;