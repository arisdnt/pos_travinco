import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconClassName?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  iconClassName
}: StatCardProps) {
  return (
    <Card className={cn(
      "bg-gradient-to-br border shadow-lg transition-all duration-200 hover:shadow-xl",
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium opacity-80 mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold mb-1">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subtitle && (
              <p className="text-xs opacity-70">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className={cn(
                "flex items-center text-xs mt-1",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}>
                <span className={cn(
                  "mr-1",
                  trend.isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {trend.isPositive ? '↗' : '↘'}
                </span>
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-lg",
            iconClassName
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Predefined stat card variants for consistency
export const StatCardVariants = {
  primary: {
    className: "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-100",
    iconClassName: "bg-blue-500"
  },
  success: {
    className: "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700 text-green-900 dark:text-green-100",
    iconClassName: "bg-green-500"
  },
  warning: {
    className: "from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100",
    iconClassName: "bg-yellow-500"
  },
  danger: {
    className: "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700 text-red-900 dark:text-red-100",
    iconClassName: "bg-red-500"
  },
  purple: {
    className: "from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700 text-purple-900 dark:text-purple-100",
    iconClassName: "bg-purple-500"
  },
  indigo: {
    className: "from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-700 text-indigo-900 dark:text-indigo-100",
    iconClassName: "bg-indigo-500"
  }
};