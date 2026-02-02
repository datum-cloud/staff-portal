/**
 * Converts a value to a boolean.
 * @param value - The value to convert to boolean.
 * @returns A boolean representation of the input.
 */
export function toBoolean(value: string | boolean | undefined | null): boolean {
  if (typeof value === 'boolean') return value;
  if (!value) return false;
  return value.toLowerCase() === 'true';
}

/**
 * Gets the origin of a URL.
 * @param url - The URL to get the origin of.
 * @returns The origin of the URL.
 */
export function getOrigin(url: string | undefined): string | undefined {
  if (!url) return undefined;

  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

/**
 * Generates a Kubernetes-style metadata name with a prefix and 6 random characters
 * @param prefix - The prefix for the name (e.g., 'cm715p')
 * @returns A string in the format: {prefix}-{6-random-chars}
 */
export function generateMetadataName(prefix: string): string {
  // Generate 6 random alphanumeric characters
  const randomChars = Math.random().toString(36).substring(2, 8).toLowerCase();

  // Combine prefix and random chars with a hyphen
  const name = `${prefix}-${randomChars}`;

  // Ensure the name follows Kubernetes naming conventions:
  // - lowercase
  // - alphanumeric with hyphens
  // - max 63 characters
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .substring(0, 63);
}

/**
 * Converts a string to start case.
 * @param input - The string to convert to start case.
 * @returns The string in start case.
 */
export function startCase(input: string): string {
  if (!input) return '';

  const words = input.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])|\d+/g) || [];
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}
