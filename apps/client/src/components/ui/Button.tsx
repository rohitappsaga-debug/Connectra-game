import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-primary-500 hover:bg-primary-600 text-white shadow-soft focus:ring-primary-400': variant === 'primary',
            'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-soft focus:ring-gray-300': variant === 'secondary',
            'bg-transparent hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:ring-gray-300': variant === 'ghost',
            'bg-red-500 hover:bg-red-600 text-white shadow-soft focus:ring-red-400': variant === 'danger',
          },
          {
            'px-3 py-2.5 text-sm min-h-[44px]': size === 'sm',
            'px-5 py-3 text-sm min-h-[44px]': size === 'md',
            'px-6 py-3.5 text-base min-h-[48px]': size === 'lg',
          },
          className,
        )}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
