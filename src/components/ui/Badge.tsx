import { ReactNode } from 'react';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'gray' | 'accent';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({ children, variant = 'gray', size = 'sm', dot }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    primary: 'bg-primary-50 text-primary-700 border-primary-200',
    success: 'bg-success-50 text-success-700 border-success-200',
    warning: 'bg-warning-50 text-warning-700 border-warning-200',
    error: 'bg-error-50 text-error-700 border-error-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    accent: 'bg-accent-50 text-accent-700 border-accent-200',
  };

  const dotColors: Record<BadgeVariant, string> = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    gray: 'bg-gray-400',
    accent: 'bg-accent-500',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${variants[variant]} ${sizes[size]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
