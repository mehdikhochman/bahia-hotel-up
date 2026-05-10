/**
 * Bahia pricing rules — Côte d'Ivoire.
 *
 * TVA: 18 % (loi de finances 2026)
 * Taxe de séjour: 500 XOF / personne / nuit (catégorie hôtellerie luxe)
 *
 * Helper is pure / synchronous so it can run client-side (preview) AND
 * server-side (canonical persisted breakdown). Keeping a single source of
 * truth prevents the classic "what you saw isn't what you were charged".
 */

export const VAT_RATE = 0.18;
export const CITY_TAX_PER_PERSON_PER_NIGHT = 500;

export type Pricing = {
  subtotal: number;
  vat: number;
  cityTax: number;
  total: number;
};

export function computePricing(input: {
  pricePerNight: number;
  nights: number;
  guests: number;
}): Pricing {
  const nights = Math.max(0, input.nights);
  const guests = Math.max(0, input.guests);
  const subtotal = input.pricePerNight * nights;
  const cityTax = CITY_TAX_PER_PERSON_PER_NIGHT * nights * guests;
  const vat = Math.round(subtotal * VAT_RATE);
  const total = subtotal + vat + cityTax;
  return { subtotal, vat, cityTax, total };
}
