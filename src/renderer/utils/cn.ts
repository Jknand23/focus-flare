/**
 * Class Name Utility - Simple utility for combining CSS class names
 * 
 * Provides a basic utility function for conditionally combining class names
 * without external dependencies. Handles strings, arrays, and conditional classes.
 * 
 * @module ClassNameUtils
 * @author FocusFlare Team
 * @since 0.3.0
 */

/**
 * Type for class name values
 */
type ClassValue = string | number | boolean | undefined | null | ClassValue[];

/**
 * Combines class names conditionally
 * 
 * @param inputs - Class values to combine
 * @returns Combined class string
 */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  
  for (const input of inputs) {
    if (!input) continue;
    
    if (typeof input === 'string') {
      classes.push(input);
    } else if (typeof input === 'number') {
      classes.push(input.toString());
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) classes.push(nested);
    }
  }
  
  return classes.join(' ');
} 