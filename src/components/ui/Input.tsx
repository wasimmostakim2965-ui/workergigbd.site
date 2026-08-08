import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

export function Input({ label, error, hint, icon, className = '', ...props }: InputProps) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 ${
            error
              ? 'border-error-300 focus:border-error-500 focus:ring-error-200'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
          } ${icon ? 'pl-10' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export function Select({ label, error, children, className = '', ...props }: SelectProps) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>}
      <select
        className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-all focus:outline-none focus:ring-2 ${
          error
            ? 'border-error-300 focus:border-error-500 focus:ring-error-200'
            : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>}
      <textarea
        className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 ${
          error
            ? 'border-error-300 focus:border-error-500 focus:ring-error-200'
            : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
    </div>
  );
}
