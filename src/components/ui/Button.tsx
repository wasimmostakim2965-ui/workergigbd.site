import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  onClick,
  type = 'button',
  className = '',
  fullWidth,
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    primary: 'bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:shadow-md',
    secondary: 'border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400',
    accent: 'bg-accent-500 text-white shadow-sm hover:bg-accent-600 hover:shadow-md',
    danger: 'bg-error-600 text-white shadow-sm hover:bg-error-700',
    ghost: 'text-gray-600 hover:bg-gray-100',
  };
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
