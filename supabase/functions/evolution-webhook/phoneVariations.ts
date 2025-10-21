
// Create phone search variations WITHOUT adding or removing digits
export function createPhoneSearchVariations(phone: string): string[] {
  const variations = new Set<string>();
  variations.add(phone);

  // Add variation with country code
  if (phone.startsWith("55")) {
    variations.add(phone.slice(2)); // Without country code
  } else if (phone.length >= 10) {
    variations.add("55" + phone); // With country code
  }

  // Add variations for last digits (for flexible search)
  if (phone.length >= 11) {
    variations.add(phone.slice(-11)); // Last 11 digits (DDD + 9 digits)
    variations.add(phone.slice(-10)); // Last 10 digits (DDD + 8 digits)
  }

  return Array.from(variations);
}
