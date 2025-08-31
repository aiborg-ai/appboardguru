/**
 * Shared industry constants for consistent mapping across the application
 */

export interface IndustryOption {
  value: string;
  label: string;
}

// Map of display labels to database values
export const INDUSTRY_MAP: Record<string, string> = {
  'Technology': 'technology',
  'Finance & Banking': 'finance',
  'Healthcare & Life Sciences': 'healthcare',
  'Education': 'education',
  'Manufacturing': 'manufacturing',
  'Retail & E-commerce': 'retail',
  'Real Estate': 'real_estate',
  'Legal Services': 'legal',
  'Consulting': 'consulting',
  'Media & Entertainment': 'media',
  'Energy & Utilities': 'energy',
  'Transportation & Logistics': 'transportation',
  'Food & Beverage': 'food_beverage',
  'Non-Profit': 'non_profit',
  'Government': 'government',
  'Other': 'other'
};

// Array of industry options for dropdowns
export const INDUSTRY_OPTIONS: IndustryOption[] = Object.entries(INDUSTRY_MAP).map(([label, value]) => ({
  value,
  label
}));

// Function to get the database value from a label
export function getIndustryValue(label: string): string {
  return INDUSTRY_MAP[label] || label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

// Function to get the display label from a database value
export function getIndustryLabel(value: string): string {
  const entry = Object.entries(INDUSTRY_MAP).find(([_, v]) => v === value);
  return entry ? entry[0] : value;
}