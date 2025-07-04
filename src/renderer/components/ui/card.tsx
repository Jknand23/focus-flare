/**
 * Card - Card UI component with header and content sections
 * 
 * A versatile card component with header, content, and title sub-components.
 * Provides consistent styling and spacing for content containers.
 * 
 * @module Card
 * @author FocusFlare Team
 * @since 0.3.0
 */

import React from "react";

// === COMPONENT TYPES ===

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

// === HELPER FUNCTIONS ===

function combineClasses(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

// === COMPONENTS ===

/**
 * Main Card component
 */
export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={combineClasses(
        "rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card header component
 */
export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div
      className={combineClasses(
        "flex flex-col space-y-1.5 p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card content component
 */
export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <div
      className={combineClasses(
        "p-6 pt-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card title component
 */
export function CardTitle({ children, className, ...props }: CardTitleProps) {
  return (
    <h3
      className={combineClasses(
        "text-lg font-semibold leading-none tracking-tight text-gray-900 dark:text-gray-100",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

/**
 * Card description component
 */
export function CardDescription({ children, className, ...props }: CardDescriptionProps) {
  return (
    <p
      className={combineClasses(
        "text-sm text-gray-600 dark:text-gray-400",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
} 