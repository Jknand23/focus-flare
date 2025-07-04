/**
 * Badge - Badge UI component for labels and status indicators
 * 
 * A flexible badge component with multiple variants for displaying
 * labels, status indicators, and categorical information.
 * 
 * @module Badge
 * @author FocusFlare Team
 * @since 0.3.0
 */

import React from "react";

// === COMPONENT TYPES ===

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  className?: string;
}

// === HELPER FUNCTIONS ===

function combineClasses(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Gets variant-specific CSS classes
 */
function getVariantClasses(variant: BadgeProps['variant']): string {
  switch (variant) {
    case 'secondary':
      return 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-300';
    case 'outline':
      return 'border border-gray-200 bg-transparent text-gray-900 dark:border-gray-700 dark:text-gray-300';
    case 'destructive':
      return 'bg-red-500 text-white dark:bg-red-600';
    default:
      return 'bg-blue-500 text-white dark:bg-blue-600';
  }
}

// === MAIN COMPONENT ===

/**
 * Badge component for labels and status indicators
 */
export function Badge({ 
  children, 
  variant = 'default', 
  className,
  ...props 
}: BadgeProps) {
  return (
    <span
      className={combineClasses(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        getVariantClasses(variant),
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
} 