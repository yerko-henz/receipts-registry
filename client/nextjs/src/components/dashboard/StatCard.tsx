import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  subtext?: string;
  className?: string;
  iconClassName?: string;
  "data-testid"?: string;
  subtextTestId?: string;
}

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendType = 'positive',
  subtext,
  className,
  iconClassName,
  "data-testid": testId,
  subtextTestId
}: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden border-border", className)} data-testid={testId}>
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground" data-testid={`${testId}-title`}>
            {title}
          </p>
          <h2 className="text-3xl font-bold tracking-tight" data-testid={`${testId}-value`}>
             {value}
          </h2>
          
           {(trend || subtext) && (
              <div className="flex items-center gap-2 mt-1">
                  {trend && (
                     <div className={cn(
                       "flex items-center gap-1 text-sm font-medium",
                       trendType === 'positive' && "text-green-600 dark:text-green-400",
                       trendType === 'negative' && "text-red-600 dark:text-red-400",
                       trendType === 'neutral' && "text-gray-600 dark:text-gray-400",
                     )} data-testid={`${testId}-trend`}>
                       {trendType === 'positive' && <ArrowUp className="w-3 h-3" />}
                       {trendType === 'negative' && <ArrowDown className="w-3 h-3" />}
                       {trendType === 'neutral' && <Minus className="w-3 h-3" />}
                       {trend}
                     </div>
                  )}
                 {subtext && (
                    <span className="text-xs text-muted-foreground" data-testid={subtextTestId || `${testId}-subtext`}>
                      {subtext}
                    </span>
                 )}
              </div>
           )}
        </div>

        {Icon && (
            <div className={cn("p-3 rounded-xl bg-primary/10 dark:bg-primary/20", iconClassName)}>
              <Icon className="h-6 w-6 text-primary" />
            </div>
        )}
      </CardContent>
    </Card>
  );
}
