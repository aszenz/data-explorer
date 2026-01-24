/**
 * Utility functions for humanizing names and identifiers
 */

/**
 * Converts a name to a human-readable format by:
 * - Converting snake_case to Title Case
 * - Converting camelCase to Title Case
 * - Converting kebab-case to Title Case
 * - Handling file extensions (.malloy, .malloynb)
 * - Preserving acronyms and special formatting
 *
 * @param name - The name to humanize
 * @returns A human-readable version of the name
 *
 * @example
 * humanizeName("user_profile") // "User Profile"
 * humanizeName("userProfile") // "User Profile"
 * humanizeName("user-profile") // "User Profile"
 * humanizeName("sales_data.malloy") // "Sales Data"
 * humanizeName("myAPIEndpoint") // "My API Endpoint"
 */
export function humanizeName(name: string): string {
  // Remove file extensions
  const nameWithoutExt = name.replace(/\.(malloy|malloynb|malloysql)$/i, "");

  // Handle empty or very short names
  if (!nameWithoutExt || nameWithoutExt.length === 0) {
    return name;
  }

  // Split by underscores, hyphens, or camelCase boundaries
  const words = nameWithoutExt
    // Insert space before uppercase letters (for camelCase)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    // Insert space before uppercase sequences followed by lowercase (for acronyms like "APIEndpoint")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    // Replace underscores and hyphens with spaces
    .replace(/[_-]/g, " ")
    // Split into words
    .split(/\s+/)
    // Filter out empty strings
    .filter((word) => word.length > 0);

  // Capitalize each word
  const humanized = words
    .map((word) => {
      // Keep acronyms uppercase (2+ consecutive uppercase letters)
      if (word.length > 1 && word === word.toUpperCase()) {
        return word;
      }
      // Capitalize first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

  return humanized || name;
}
