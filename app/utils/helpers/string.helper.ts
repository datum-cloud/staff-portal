export function toBoolean(value: string | boolean | undefined | null): boolean {
  if (typeof value === 'boolean') return value;
  if (!value) return false;
  return value.toLowerCase() === 'true';
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
