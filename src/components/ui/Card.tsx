import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm ${hover ? 'transition-all hover:shadow-md hover:border-gray-300' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'error';
}

export function StatCard({ label, value, icon, trend, trendUp, color = 'primary' }: StatCardProps) {
  const colors: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600',
    accent: 'bg-accent-50 text-accent-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    error: 'bg-error-50 text-error-600',
  };

  return (
    <Card className="p-5" hover>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-500">{label}</span>
          <span className="mt-1 text-2xl font-bold text-gray-900">{value}</span>
          {trend && (
            <span className={`mt-1 text-xs font-medium ${trendUp ? 'text-success-600' : 'text-error-600'}`}>
              {trend}
            </span>
          )}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
