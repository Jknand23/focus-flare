/**
 * Button - Button UI component with multiple variants and sizes
 * 
 * A versatile button component supporting different variants, sizes,
 * and states. Provides consistent styling and behavior across the app.
 * 
 * @module Button
 * @author FocusFlare Team
 * @since 0.3.0
 */

import React from "react";

// === COMPONENT TYPES ===

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

// === HELPER FUNCTIONS ===

function combineClasses(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Gets variant-specific CSS classes
 */
function getVariantClasses(variant: ButtonProps['variant']): string {
  switch (variant) {
    case 'outline':
      return 'border border-gray-200 bg-transparent text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700';
    case 'ghost':
      return 'bg-transparent text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700';
    case 'destructive':
      return 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700';
    default:
      return 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700';
  }
}

/**
 * Gets size-specific CSS classes
 */
function getSizeClasses(size: ButtonProps['size']): string {
  switch (size) {
    case 'sm':
      return 'h-8 px-3 text-sm';
    case 'lg':
      return 'h-11 px-8 text-base';
    default:
      return 'h-10 px-4 text-sm';
  }
}

// === MAIN COMPONENT ===

/**
 * Button component
 */
export function Button({ 
  children, 
  variant = 'default', 
  size = 'default',
  className,
  disabled,
  ...props 
}: ButtonProps) {
  return (
    <button
      className={combineClasses(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50",
        getVariantClasses(variant),
        getSizeClasses(size),
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
} 