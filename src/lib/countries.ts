// International country/currency/tax configuration for NAVANHULA CLOUD

export interface CountryConfig {
  code: string;       // ISO 3166-1 alpha-2
  name: string;
  currency: string;   // ISO 4217
  currencySymbol: string;
  locale: string;     // BCP 47
  taxName: string;    // e.g. IVA, VAT, GST
  taxRate: number;    // default tax rate %
  taxRates: { label: string; rate: number }[];
  dateFormat: string; // Intl DateTimeFormat locale
  phonePrefix: string;
  fiscalIdLabel: string; // e.g. NIF, NUIT, TIN
}

export const COUNTRIES: Record<string, CountryConfig> = {
  MZ: {
    code: 'MZ',
    name: 'Moçambique',
    currency: 'MZN',
    currencySymbol: 'MT',
    locale: 'pt-MZ',
    taxName: 'IVA',
    taxRate: 16,
    taxRates: [
      { label: 'IVA Normal (16%)', rate: 16 },
      { label: 'ISPC (5%)', rate: 5 },
      { label: 'IRPC (3%)', rate: 3 },
      { label: 'Isento', rate: 0 },
    ],
    dateFormat: 'pt-MZ',
    phonePrefix: '+258',
    fiscalIdLabel: 'NUIT',
  },
  PT: {
    code: 'PT',
    name: 'Portugal',
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'pt-PT',
    taxName: 'IVA',
    taxRate: 23,
    taxRates: [
      { label: 'IVA Normal (23%)', rate: 23 },
      { label: 'IVA Intermédio (13%)', rate: 13 },
      { label: 'IVA Reduzido (6%)', rate: 6 },
      { label: 'Isento', rate: 0 },
    ],
    dateFormat: 'pt-PT',
    phonePrefix: '+351',
    fiscalIdLabel: 'NIF',
  },
  BR: {
    code: 'BR',
    name: 'Brasil',
    currency: 'BRL',
    currencySymbol: 'R$',
    locale: 'pt-BR',
    taxName: 'ICMS',
    taxRate: 18,
    taxRates: [
      { label: 'ICMS (18%)', rate: 18 },
      { label: 'ISS (5%)', rate: 5 },
      { label: 'Simples Nacional', rate: 6 },
      { label: 'Isento', rate: 0 },
    ],
    dateFormat: 'pt-BR',
    phonePrefix: '+55',
    fiscalIdLabel: 'CNPJ',
  },
  AO: {
    code: 'AO',
    name: 'Angola',
    currency: 'AOA',
    currencySymbol: 'Kz',
    locale: 'pt-AO',
    taxName: 'IVA',
    taxRate: 14,
    taxRates: [
      { label: 'IVA Normal (14%)', rate: 14 },
      { label: 'IVA Reduzido (7%)', rate: 7 },
      { label: 'Isento', rate: 0 },
    ],
    dateFormat: 'pt-AO',
    phonePrefix: '+244',
    fiscalIdLabel: 'NIF',
  },
  ZA: {
    code: 'ZA',
    name: 'South Africa',
    currency: 'ZAR',
    currencySymbol: 'R',
    locale: 'en-ZA',
    taxName: 'VAT',
    taxRate: 15,
    taxRates: [
      { label: 'VAT (15%)', rate: 15 },
      { label: 'Zero-rated', rate: 0 },
    ],
    dateFormat: 'en-ZA',
    phonePrefix: '+27',
    fiscalIdLabel: 'TIN',
  },
  KE: {
    code: 'KE',
    name: 'Kenya',
    currency: 'KES',
    currencySymbol: 'KSh',
    locale: 'en-KE',
    taxName: 'VAT',
    taxRate: 16,
    taxRates: [
      { label: 'VAT (16%)', rate: 16 },
      { label: 'Exempt', rate: 0 },
    ],
    dateFormat: 'en-KE',
    phonePrefix: '+254',
    fiscalIdLabel: 'PIN',
  },
  NG: {
    code: 'NG',
    name: 'Nigeria',
    currency: 'NGN',
    currencySymbol: '₦',
    locale: 'en-NG',
    taxName: 'VAT',
    taxRate: 7.5,
    taxRates: [
      { label: 'VAT (7.5%)', rate: 7.5 },
      { label: 'Exempt', rate: 0 },
    ],
    dateFormat: 'en-NG',
    phonePrefix: '+234',
    fiscalIdLabel: 'TIN',
  },
  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    taxName: 'Sales Tax',
    taxRate: 0, // varies by state
    taxRates: [
      { label: 'No Federal Tax', rate: 0 },
    ],
    dateFormat: 'en-US',
    phonePrefix: '+1',
    fiscalIdLabel: 'EIN',
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    locale: 'en-GB',
    taxName: 'VAT',
    taxRate: 20,
    taxRates: [
      { label: 'Standard (20%)', rate: 20 },
      { label: 'Reduced (5%)', rate: 5 },
      { label: 'Zero-rated', rate: 0 },
    ],
    dateFormat: 'en-GB',
    phonePrefix: '+44',
    fiscalIdLabel: 'UTR',
  },
};

export const DEFAULT_COUNTRY = 'MZ';

export function getCountryConfig(countryCode?: string | null): CountryConfig {
  return COUNTRIES[countryCode || DEFAULT_COUNTRY] || COUNTRIES[DEFAULT_COUNTRY];
}

export function getCountryList(): { code: string; name: string; currency: string }[] {
  return Object.values(COUNTRIES).map(c => ({
    code: c.code,
    name: c.name,
    currency: `${c.currency} (${c.currencySymbol})`,
  }));
}

// Detect country from browser locale
export function detectCountryFromLocale(): string {
  try {
    const lang = navigator.language || 'pt-MZ';
    const parts = lang.split('-');
    const region = parts.length > 1 ? parts[1].toUpperCase() : '';
    if (region && COUNTRIES[region]) return region;
    // Fallback by language
    const langMap: Record<string, string> = { pt: 'MZ', en: 'US', es: 'US', fr: 'FR', de: 'DE' };
    return langMap[parts[0]] || DEFAULT_COUNTRY;
  } catch {
    return DEFAULT_COUNTRY;
  }
}
