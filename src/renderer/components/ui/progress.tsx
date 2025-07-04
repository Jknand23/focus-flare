/**
 * Progress - Simple progress bar UI component
 * 
 * A lightweight progress bar component with customizable styling.
 * Supports different sizes and colors through Tailwind CSS classes.
 * 
 * @module Progress
 * @author FocusFlare Team
 * @since 0.3.0
 */

// React is used implicitly in JSX

// === COMPONENT TYPES ===

interface ProgressProps {
  /** Progress value (0-100) */
  value?: number;
  /** Additional CSS classes */
  className?: string;
  /** Maximum value (default: 100) */
  max?: number;
  /** Accessible label */
  'aria-label'?: string;
}

// === MAIN COMPONENT ===

/**
 * Progress bar component
 */
export function Progress({ 
  value = 0, 
  className = '', 
  max = 100,
  'aria-label': ariaLabel,
  ...props 
}: ProgressProps) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  
  const baseClasses = "relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700";
  const combinedClasses = className ? `${baseClasses} ${className}` : baseClasses;
  
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={ariaLabel}
      className={combinedClasses}
      {...props}
    >
      <div
        className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
        style={{
          width: `${percentage}%`
        }}
      />
    </div>
  );
} 