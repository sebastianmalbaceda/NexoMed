// Utility functions for patient data

/**
 * Returns the patient's full display name, safely handling null surnames.
 * Avoids rendering "null" or a trailing space when surnames is missing.
 */
export function fullName(p: { name: string; surnames: string | null }): string {
  return p.surnames ? `${p.name} ${p.surnames}` : p.name;
}

/**
 * Normalize allergies array — filter out empty strings
 */
export function parseAllergies(allergies: string[] | null | undefined): string[] {
  if (!allergies) return [];
  return allergies.map(a => a.trim()).filter(a => a !== '');
}

/**
 * Get allergies count from array
 */
export function getAllergiesCount(allergies: string[] | null | undefined): number {
  return parseAllergies(allergies).length;
}
