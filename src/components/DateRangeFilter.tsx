"use client";

import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DateRangeFilterProps = {
  startDate: string;
  endDate: string;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  onApply: () => void;
  className?: string;
};

export function DateRangeFilter({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
  onApply,
  className,
}: DateRangeFilterProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 flex-wrap",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600 dark:text-gray-300 mr-1">Tanggal</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onChangeStart(e.target.value)}
          className="h-8 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 focus:outline-none"
          title="Tanggal mulai"
        />
        <span className="text-gray-400">—</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onChangeEnd(e.target.value)}
          className="h-8 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 focus:outline-none"
          title="Tanggal selesai"
        />
      </div>
      <Button variant="outline" size="sm" onClick={onApply}>
        Terapkan
      </Button>
    </div>
  );
}

export default DateRangeFilter;

