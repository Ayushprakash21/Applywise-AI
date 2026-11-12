import type { StructuredLocation } from '../types/index.ts';

export type LocationEntityType = StructuredLocation['locationType'];

export interface CountryRecord {
  code: string;
  name: string;
  currency: string;
  aliases?: string[];
}

export interface StateRecord {
  code: string;
  name: string;
  countryCode: string;
  aliases?: string[];
}

export interface CityRecord {
  name: string;
  stateCode?: string;
  region: string;
  countryCode: string;
  priority: number; // higher = larger commercial / tech hub for tie-breaking
  aliases?: string[];
}

export interface LocationSuggestion extends StructuredLocation {
  id: string;
  label: string;
  subtitle: string;
  score: number;
}

export const GLOBAL_COUNTRIES: CountryRecord[] = [
  { code: 'IN', name: 'India', currency: 'INR', aliases: ['Bharat', 'Republic of India'] },
  { code: 'US', name: 'United States', currency: 'USD', aliases: ['USA', 'United States of America', 'America'] },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', aliases: ['UK', 'Britain', 'Great Britain', 'England'] },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'DE', name: 'Germany', currency: 'EUR', aliases: ['Deutschland'] },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', aliases: ['The Netherlands', 'Holland'] },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', aliases: ['UAE', 'Emirates'] },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'LU', name: 'Luxembourg', currency: 'EUR', aliases: ['Grand Duchy of Luxembourg'] },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', aliases: ['Schweiz', 'Suisse'] },
  { code: 'IE', name: 'Ireland', currency: 'EUR', aliases: ['Eire'] },
  { code: 'JP', name: 'Japan', currency: 'JPY', aliases: ['Nihon'] },
  { code: 'SE', name: 'Sweden', currency: 'SEK' },
  { code: 'DK', name: 'Denmark', currency: 'DKK' },
  { code: 'NO', name: 'Norway', currency: 'NOK' },
  { code: 'FI', name: 'Finland', currency: 'EUR' },
  { code: 'ES', name: 'Spain', currency: 'EUR', aliases: ['Espana'] },
  { code: 'IT', name: 'Italy', currency: 'EUR', aliases: ['Italia'] },
  { code: 'PT', name: 'Portugal', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', currency: 'EUR' },
  { code: 'AT', name: 'Austria', currency: 'EUR' },
  { code: 'PL', name: 'Poland', currency: 'PLN' },
  { code: 'CZ', name: 'Czechia', currency: 'CZK', aliases: ['Czech Republic'] },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD' },
  { code: 'KR', name: 'South Korea', currency: 'KRW', aliases: ['Korea', 'Republic of Korea'] },
  { code: 'IL', name: 'Israel', currency: 'ILS' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', aliases: ['KSA'] },
  { code: 'QA', name: 'Qatar', currency: 'QAR' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR' },
  { code: 'TH', name: 'Thailand', currency: 'THB' },
  { code: 'VN', name: 'Vietnam', currency: 'VND' },
  { code: 'PH', name: 'Philippines', currency: 'PHP' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
  { code: 'TW', name: 'Taiwan', currency: 'TWD' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', aliases: ['Brasil'] },
  { code: 'MX', name: 'Mexico', currency: 'MXN' },
  { code: 'AR', name: 'Argentina', currency: 'ARS' },
  { code: 'CL', name: 'Chile', currency: 'CLP' },
  { code: 'CO', name: 'Colombia', currency: 'COP' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'EG', name: 'Egypt', currency: 'EGP' },
  { code: 'TR', name: 'Turkey', currency: 'TRY', aliases: ['Turkiye'] },
  { code: 'RO', name: 'Romania', currency: 'RON' },
  { code: 'HU', name: 'Hungary', currency: 'HUF' },
  { code: 'GR', name: 'Greece', currency: 'EUR' },
  { code: 'EE', name: 'Estonia', currency: 'EUR' },
  { code: 'LV', name: 'Latvia', currency: 'EUR' },
  { code: 'LT', name: 'Lithuania', currency: 'EUR' },
  { code: 'SK', name: 'Slovakia', currency: 'EUR' },
  { code: 'SI', name: 'Slovenia', currency: 'EUR' },
  { code: 'HR', name: 'Croatia', currency: 'EUR' },
  { code: 'BG', name: 'Bulgaria', currency: 'BGN' },
  { code: 'UA', name: 'Ukraine', currency: 'UAH' },
  { code: 'IS', name: 'Iceland', currency: 'ISK' },
  { code: 'CY', name: 'Cyprus', currency: 'EUR' },
  { code: 'MT', name: 'Malta', currency: 'EUR' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD' },
  { code: 'OM', name: 'Oman', currency: 'OMR' },
  { code: 'JO', name: 'Jordan', currency: 'JOD' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR' },
  { code: 'NP', name: 'Nepal', currency: 'NPR' },
  { code: 'CN', name: 'China', currency: 'CNY' },
  { code: 'PE', name: 'Peru', currency: 'PEN' },
  { code: 'CR', name: 'Costa Rica', currency: 'CRC' },
  { code: 'PA', name: 'Panama', currency: 'PAB' },
  { code: 'UY', name: 'Uruguay', currency: 'UYU' },
  { code: 'MA', name: 'Morocco', currency: 'MAD' },
  { code: 'GH', name: 'Ghana', currency: 'GHS' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF' },
];

export const GLOBAL_STATES: StateRecord[] = [
  // India — all 28 states & 8 UTs
  { code: 'IN-AP', name: 'Andhra Pradesh', countryCode: 'IN' },
  { code: 'IN-AR', name: 'Arunachal Pradesh', countryCode: 'IN' },
  { code: 'IN-AS', name: 'Assam', countryCode: 'IN' },
  { code: 'IN-BR', name: 'Bihar', countryCode: 'IN' },
  { code: 'IN-CT', name: 'Chhattisgarh', countryCode: 'IN' },
  { code: 'IN-GA', name: 'Goa', countryCode: 'IN' },
  { code: 'IN-GJ', name: 'Gujarat', countryCode: 'IN' },
  { code: 'IN-HR', name: 'Haryana', countryCode: 'IN' },
  { code: 'IN-HP', name: 'Himachal Pradesh', countryCode: 'IN' },
  { code: 'IN-JH', name: 'Jharkhand', countryCode: 'IN' },
  { code: 'IN-KA', name: 'Karnataka', countryCode: 'IN' },
  { code: 'IN-KL', name: 'Kerala', countryCode: 'IN' },
  { code: 'IN-MP', name: 'Madhya Pradesh', countryCode: 'IN', aliases: ['MP'] },
  { code: 'IN-MH', name: 'Maharashtra', countryCode: 'IN' },
  { code: 'IN-MN', name: 'Manipur', countryCode: 'IN' },
  { code: 'IN-ML', name: 'Meghalaya', countryCode: 'IN' },
  { code: 'IN-MZ', name: 'Mizoram', countryCode: 'IN' },
  { code: 'IN-NL', name: 'Nagaland', countryCode: 'IN' },
  { code: 'IN-OR', name: 'Odisha', countryCode: 'IN', aliases: ['Orissa'] },
  { code: 'IN-PB', name: 'Punjab', countryCode: 'IN' },
  { code: 'IN-RJ', name: 'Rajasthan', countryCode: 'IN' },
  { code: 'IN-SK', name: 'Sikkim', countryCode: 'IN' },
  { code: 'IN-TN', name: 'Tamil Nadu', countryCode: 'IN' },
  { code: 'IN-TG', name: 'Telangana', countryCode: 'IN' },
  { code: 'IN-TR', name: 'Tripura', countryCode: 'IN' },
  { code: 'IN-UP', name: 'Uttar Pradesh', countryCode: 'IN', aliases: ['UP'] },
  { code: 'IN-UT', name: 'Uttarakhand', countryCode: 'IN' },
  { code: 'IN-WB', name: 'West Bengal', countryCode: 'IN' },
  { code: 'IN-AN', name: 'Andaman and Nicobar Islands', countryCode: 'IN' },
  { code: 'IN-CH', name: 'Chandigarh', countryCode: 'IN' },
  { code: 'IN-DN', name: 'Dadra and Nagar Haveli and Daman and Diu', countryCode: 'IN' },
  { code: 'IN-DL', name: 'Delhi', countryCode: 'IN', aliases: ['Delhi NCR', 'NCR', 'New Delhi'] },
  { code: 'IN-JK', name: 'Jammu and Kashmir', countryCode: 'IN' },
  { code: 'IN-LA', name: 'Ladakh', countryCode: 'IN' },
  { code: 'IN-LD', name: 'Lakshadweep', countryCode: 'IN' },
  { code: 'IN-PY', name: 'Puducherry', countryCode: 'IN', aliases: ['Pondicherry'] },

  // United States — all 50 states + DC
  { code: 'US-AL', name: 'Alabama', countryCode: 'US', aliases: ['AL'] },
  { code: 'US-AK', name: 'Alaska', countryCode: 'US', aliases: ['AK'] },
  { code: 'US-AZ', name: 'Arizona', countryCode: 'US', aliases: ['AZ'] },
  { code: 'US-AR', name: 'Arkansas', countryCode: 'US', aliases: ['AR'] },
  { code: 'US-CA', name: 'California', countryCode: 'US', aliases: ['CA'] },
  { code: 'US-CO', name: 'Colorado', countryCode: 'US', aliases: ['CO'] },
  { code: 'US-CT', name: 'Connecticut', countryCode: 'US', aliases: ['CT'] },
  { code: 'US-DE', name: 'Delaware', countryCode: 'US', aliases: ['DE'] },
  { code: 'US-DC', name: 'District of Columbia', countryCode: 'US', aliases: ['DC', 'Washington DC'] },
  { code: 'US-FL', name: 'Florida', countryCode: 'US', aliases: ['FL'] },
  { code: 'US-GA', name: 'Georgia', countryCode: 'US', aliases: ['GA'] },
  { code: 'US-HI', name: 'Hawaii', countryCode: 'US', aliases: ['HI'] },
  { code: 'US-ID', name: 'Idaho', countryCode: 'US', aliases: ['ID'] },
  { code: 'US-IL', name: 'Illinois', countryCode: 'US', aliases: ['IL'] },
  { code: 'US-IN', name: 'Indiana', countryCode: 'US', aliases: ['IN'] },
  { code: 'US-IA', name: 'Iowa', countryCode: 'US', aliases: ['IA'] },
  { code: 'US-KS', name: 'Kansas', countryCode: 'US', aliases: ['KS'] },
  { code: 'US-KY', name: 'Kentucky', countryCode: 'US', aliases: ['KY'] },
  { code: 'US-LA', name: 'Louisiana', countryCode: 'US', aliases: ['LA'] },
  { code: 'US-ME', name: 'Maine', countryCode: 'US', aliases: ['ME'] },
  { code: 'US-MD', name: 'Maryland', countryCode: 'US', aliases: ['MD'] },
  { code: 'US-MA', name: 'Massachusetts', countryCode: 'US', aliases: ['MA'] },
  { code: 'US-MI', name: 'Michigan', countryCode: 'US', aliases: ['MI'] },
  { code: 'US-MN', name: 'Minnesota', countryCode: 'US', aliases: ['MN'] },
  { code: 'US-MS', name: 'Mississippi', countryCode: 'US', aliases: ['MS'] },
  { code: 'US-MO', name: 'Missouri', countryCode: 'US', aliases: ['MO'] },
  { code: 'US-MT', name: 'Montana', countryCode: 'US', aliases: ['MT'] },
  { code: 'US-NE', name: 'Nebraska', countryCode: 'US', aliases: ['NE'] },
  { code: 'US-NV', name: 'Nevada', countryCode: 'US', aliases: ['NV'] },
  { code: 'US-NH', name: 'New Hampshire', countryCode: 'US', aliases: ['NH'] },
  { code: 'US-NJ', name: 'New Jersey', countryCode: 'US', aliases: ['NJ'] },
  { code: 'US-NM', name: 'New Mexico', countryCode: 'US', aliases: ['NM'] },
  { code: 'US-NY', name: 'New York', countryCode: 'US', aliases: ['NY'] },
  { code: 'US-NC', name: 'North Carolina', countryCode: 'US', aliases: ['NC'] },
  { code: 'US-ND', name: 'North Dakota', countryCode: 'US', aliases: ['ND'] },
  { code: 'US-OH', name: 'Ohio', countryCode: 'US', aliases: ['OH'] },
  { code: 'US-OK', name: 'Oklahoma', countryCode: 'US', aliases: ['OK'] },
  { code: 'US-OR', name: 'Oregon', countryCode: 'US', aliases: ['OR'] },
  { code: 'US-PA', name: 'Pennsylvania', countryCode: 'US', aliases: ['PA'] },
  { code: 'US-RI', name: 'Rhode Island', countryCode: 'US', aliases: ['RI'] },
  { code: 'US-SC', name: 'South Carolina', countryCode: 'US', aliases: ['SC'] },
  { code: 'US-SD', name: 'South Dakota', countryCode: 'US', aliases: ['SD'] },
  { code: 'US-TN', name: 'Tennessee', countryCode: 'US', aliases: ['TN'] },
  { code: 'US-TX', name: 'Texas', countryCode: 'US', aliases: ['TX'] },
  { code: 'US-UT', name: 'Utah', countryCode: 'US', aliases: ['UT'] },
  { code: 'US-VT', name: 'Vermont', countryCode: 'US', aliases: ['VT'] },
  { code: 'US-VA', name: 'Virginia', countryCode: 'US', aliases: ['VA'] },
  { code: 'US-WA', name: 'Washington', countryCode: 'US', aliases: ['WA'] },
  { code: 'US-WV', name: 'West Virginia', countryCode: 'US', aliases: ['WV'] },
  { code: 'US-WI', name: 'Wisconsin', countryCode: 'US', aliases: ['WI'] },
  { code: 'US-WY', name: 'Wyoming', countryCode: 'US', aliases: ['WY'] },

  // Canada
  { code: 'CA-ON', name: 'Ontario', countryCode: 'CA', aliases: ['ON'] },
  { code: 'CA-BC', name: 'British Columbia', countryCode: 'CA', aliases: ['BC'] },
  { code: 'CA-QC', name: 'Quebec', countryCode: 'CA', aliases: ['QC'] },
  { code: 'CA-AB', name: 'Alberta', countryCode: 'CA', aliases: ['AB'] },
  { code: 'CA-MB', name: 'Manitoba', countryCode: 'CA' },
  { code: 'CA-NS', name: 'Nova Scotia', countryCode: 'CA' },
  { code: 'CA-SK', name: 'Saskatchewan', countryCode: 'CA' },
  { code: 'CA-NB', name: 'New Brunswick', countryCode: 'CA' },

  // United Kingdom
  { code: 'GB-ENG', name: 'England', countryCode: 'GB' },
  { code: 'GB-SCT', name: 'Scotland', countryCode: 'GB' },
  { code: 'GB-WLS', name: 'Wales', countryCode: 'GB' },
  { code: 'GB-NIR', name: 'Northern Ireland', countryCode: 'GB' },

  // Germany
  { code: 'DE-BE', name: 'Berlin', countryCode: 'DE' },
  { code: 'DE-BY', name: 'Bavaria', countryCode: 'DE', aliases: ['Bayern'] },
  { code: 'DE-HE', name: 'Hesse', countryCode: 'DE', aliases: ['Hessen'] },
  { code: 'DE-HH', name: 'Hamburg', countryCode: 'DE' },
  { code: 'DE-BW', name: 'Baden-Wuerttemberg', countryCode: 'DE', aliases: ['Baden-Württemberg'] },
  { code: 'DE-NW', name: 'North Rhine-Westphalia', countryCode: 'DE', aliases: ['NRW'] },

  // Netherlands
  { code: 'NL-NH', name: 'North Holland', countryCode: 'NL', aliases: ['Noord-Holland'] },
  { code: 'NL-ZH', name: 'South Holland', countryCode: 'NL', aliases: ['Zuid-Holland'] },
  { code: 'NL-UT', name: 'Utrecht', countryCode: 'NL' },
  { code: 'NL-NB', name: 'North Brabant', countryCode: 'NL', aliases: ['Noord-Brabant'] },
  { code: 'NL-GE', name: 'Gelderland', countryCode: 'NL' },

  // Australia
  { code: 'AU-NSW', name: 'New South Wales', countryCode: 'AU', aliases: ['NSW'] },
  { code: 'AU-VIC', name: 'Victoria', countryCode: 'AU', aliases: ['VIC'] },
  { code: 'AU-QLD', name: 'Queensland', countryCode: 'AU', aliases: ['QLD'] },
  { code: 'AU-WA', name: 'Western Australia', countryCode: 'AU', aliases: ['WA'] },
  { code: 'AU-SA', name: 'South Australia', countryCode: 'AU', aliases: ['SA'] },
  { code: 'AU-ACT', name: 'Australian Capital Territory', countryCode: 'AU', aliases: ['ACT'] },

  // UAE
  { code: 'AE-DU', name: 'Dubai', countryCode: 'AE' },
  { code: 'AE-AZ', name: 'Abu Dhabi', countryCode: 'AE' },
  { code: 'AE-SH', name: 'Sharjah', countryCode: 'AE' },

  // Luxembourg
  { code: 'LU-LU', name: 'Luxembourg District', countryCode: 'LU' },

  // France
  { code: 'FR-IDF', name: 'Ile-de-France', countryCode: 'FR', aliases: ['Île-de-France'] },
  { code: 'FR-ARA', name: 'Auvergne-Rhone-Alpes', countryCode: 'FR' },
  { code: 'FR-OCC', name: 'Occitanie', countryCode: 'FR' },
  { code: 'FR-PAC', name: 'Provence-Alpes-Cote d\'Azur', countryCode: 'FR' },

  // Switzerland
  { code: 'CH-ZH', name: 'Zurich', countryCode: 'CH', aliases: ['Zürich'] },
  { code: 'CH-GE', name: 'Geneva', countryCode: 'CH', aliases: ['Genève'] },
  { code: 'CH-BS', name: 'Basel-Stadt', countryCode: 'CH' },
  { code: 'CH-ZG', name: 'Zug', countryCode: 'CH' },

  // Ireland
  { code: 'IE-L', name: 'Leinster', countryCode: 'IE' },
  { code: 'IE-M', name: 'Munster', countryCode: 'IE' },

  // Japan
  { code: 'JP-13', name: 'Tokyo', countryCode: 'JP' },
  { code: 'JP-27', name: 'Osaka', countryCode: 'JP' },
  { code: 'JP-14', name: 'Kanagawa', countryCode: 'JP' },
  { code: 'JP-40', name: 'Fukuoka', countryCode: 'JP' },

  // Singapore
  { code: 'SG-01', name: 'Central Singapore', countryCode: 'SG' },
];

export const GLOBAL_CITIES: CityRecord[] = [
  // India — comprehensive national coverage across states & commercial centers
  { name: 'Indore', stateCode: 'IN-MP', region: 'Madhya Pradesh', countryCode: 'IN', priority: 90 },
  { name: 'Bhopal', stateCode: 'IN-MP', region: 'Madhya Pradesh', countryCode: 'IN', priority: 84 },
  { name: 'Gwalior', stateCode: 'IN-MP', region: 'Madhya Pradesh', countryCode: 'IN', priority: 74 },
  { name: 'Jabalpur', stateCode: 'IN-MP', region: 'Madhya Pradesh', countryCode: 'IN', priority: 74 },
  { name: 'Ujjain', stateCode: 'IN-MP', region: 'Madhya Pradesh', countryCode: 'IN', priority: 68 },
  { name: 'Bengaluru', stateCode: 'IN-KA', region: 'Karnataka', countryCode: 'IN', priority: 99, aliases: ['Bangalore', 'BLR'] },
  { name: 'Mysuru', stateCode: 'IN-KA', region: 'Karnataka', countryCode: 'IN', priority: 76, aliases: ['Mysore'] },
  { name: 'Mangaluru', stateCode: 'IN-KA', region: 'Karnataka', countryCode: 'IN', priority: 72, aliases: ['Mangalore'] },
  { name: 'Hubballi', stateCode: 'IN-KA', region: 'Karnataka', countryCode: 'IN', priority: 68, aliases: ['Hubli'] },
  { name: 'Mumbai', stateCode: 'IN-MH', region: 'Maharashtra', countryCode: 'IN', priority: 99, aliases: ['Bombay'] },
  { name: 'Pune', stateCode: 'IN-MH', region: 'Maharashtra', countryCode: 'IN', priority: 96, aliases: ['Poona'] },
  { name: 'Nagpur', stateCode: 'IN-MH', region: 'Maharashtra', countryCode: 'IN', priority: 82 },
  { name: 'Thane', stateCode: 'IN-MH', region: 'Maharashtra', countryCode: 'IN', priority: 80 },
  { name: 'Nashik', stateCode: 'IN-MH', region: 'Maharashtra', countryCode: 'IN', priority: 74 },
  { name: 'Navi Mumbai', stateCode: 'IN-MH', region: 'Maharashtra', countryCode: 'IN', priority: 84 },
  { name: 'New Delhi', stateCode: 'IN-DL', region: 'Delhi', countryCode: 'IN', priority: 98, aliases: ['Delhi', 'NCR'] },
  { name: 'Gurugram', stateCode: 'IN-HR', region: 'Haryana', countryCode: 'IN', priority: 95, aliases: ['Gurgaon'] },
  { name: 'Faridabad', stateCode: 'IN-HR', region: 'Haryana', countryCode: 'IN', priority: 78 },
  { name: 'Noida', stateCode: 'IN-UP', region: 'Uttar Pradesh', countryCode: 'IN', priority: 93 },
  { name: 'Ghaziabad', stateCode: 'IN-UP', region: 'Uttar Pradesh', countryCode: 'IN', priority: 77 },
  { name: 'Lucknow', stateCode: 'IN-UP', region: 'Uttar Pradesh', countryCode: 'IN', priority: 85 },
  { name: 'Kanpur', stateCode: 'IN-UP', region: 'Uttar Pradesh', countryCode: 'IN', priority: 78 },
  { name: 'Varanasi', stateCode: 'IN-UP', region: 'Uttar Pradesh', countryCode: 'IN', priority: 74 },
  { name: 'Agra', stateCode: 'IN-UP', region: 'Uttar Pradesh', countryCode: 'IN', priority: 72 },
  { name: 'Hyderabad', stateCode: 'IN-TG', region: 'Telangana', countryCode: 'IN', priority: 97 },
  { name: 'Warangal', stateCode: 'IN-TG', region: 'Telangana', countryCode: 'IN', priority: 70 },
  { name: 'Chennai', stateCode: 'IN-TN', region: 'Tamil Nadu', countryCode: 'IN', priority: 96, aliases: ['Madras'] },
  { name: 'Coimbatore', stateCode: 'IN-TN', region: 'Tamil Nadu', countryCode: 'IN', priority: 83 },
  { name: 'Madurai', stateCode: 'IN-TN', region: 'Tamil Nadu', countryCode: 'IN', priority: 74 },
  { name: 'Kolkata', stateCode: 'IN-WB', region: 'West Bengal', countryCode: 'IN', priority: 94, aliases: ['Calcutta'] },
  { name: 'Siliguri', stateCode: 'IN-WB', region: 'West Bengal', countryCode: 'IN', priority: 69 },
  { name: 'Ahmedabad', stateCode: 'IN-GJ', region: 'Gujarat', countryCode: 'IN', priority: 92 },
  { name: 'Surat', stateCode: 'IN-GJ', region: 'Gujarat', countryCode: 'IN', priority: 86 },
  { name: 'Vadodara', stateCode: 'IN-GJ', region: 'Gujarat', countryCode: 'IN', priority: 82, aliases: ['Baroda'] },
  { name: 'Gandhinagar', stateCode: 'IN-GJ', region: 'Gujarat', countryCode: 'IN', priority: 78 },
  { name: 'Anand', stateCode: 'IN-GJ', region: 'Gujarat', countryCode: 'IN', priority: 70 },
  { name: 'Rajkot', stateCode: 'IN-GJ', region: 'Gujarat', countryCode: 'IN', priority: 75 },
  { name: 'Jaipur', stateCode: 'IN-RJ', region: 'Rajasthan', countryCode: 'IN', priority: 89 },
  { name: 'Jodhpur', stateCode: 'IN-RJ', region: 'Rajasthan', countryCode: 'IN', priority: 74 },
  { name: 'Udaipur', stateCode: 'IN-RJ', region: 'Rajasthan', countryCode: 'IN', priority: 73 },
  { name: 'Kota', stateCode: 'IN-RJ', region: 'Rajasthan', countryCode: 'IN', priority: 72 },
  { name: 'Chandigarh', stateCode: 'IN-CH', region: 'Chandigarh', countryCode: 'IN', priority: 87 },
  { name: 'Mohali', stateCode: 'IN-PB', region: 'Punjab', countryCode: 'IN', priority: 80 },
  { name: 'Ludhiana', stateCode: 'IN-PB', region: 'Punjab', countryCode: 'IN', priority: 76 },
  { name: 'Amritsar', stateCode: 'IN-PB', region: 'Punjab', countryCode: 'IN', priority: 74 },
  { name: 'Kochi', stateCode: 'IN-KL', region: 'Kerala', countryCode: 'IN', priority: 86, aliases: ['Cochin'] },
  { name: 'Thiruvananthapuram', stateCode: 'IN-KL', region: 'Kerala', countryCode: 'IN', priority: 82, aliases: ['Trivandrum'] },
  { name: 'Kozhikode', stateCode: 'IN-KL', region: 'Kerala', countryCode: 'IN', priority: 72, aliases: ['Calicut'] },
  { name: 'Bhubaneswar', stateCode: 'IN-OR', region: 'Odisha', countryCode: 'IN', priority: 82 },
  { name: 'Cuttack', stateCode: 'IN-OR', region: 'Odisha', countryCode: 'IN', priority: 70 },
  { name: 'Visakhapatnam', stateCode: 'IN-AP', region: 'Andhra Pradesh', countryCode: 'IN', priority: 81, aliases: ['Vizag'] },
  { name: 'Vijayawada', stateCode: 'IN-AP', region: 'Andhra Pradesh', countryCode: 'IN', priority: 74 },
  { name: 'Patna', stateCode: 'IN-BR', region: 'Bihar', countryCode: 'IN', priority: 79 },
  { name: 'Ranchi', stateCode: 'IN-JH', region: 'Jharkhand', countryCode: 'IN', priority: 76 },
  { name: 'Jamshedpur', stateCode: 'IN-JH', region: 'Jharkhand', countryCode: 'IN', priority: 74 },
  { name: 'Raipur', stateCode: 'IN-CT', region: 'Chhattisgarh', countryCode: 'IN', priority: 76 },
  { name: 'Dehradun', stateCode: 'IN-UT', region: 'Uttarakhand', countryCode: 'IN', priority: 75 },
  { name: 'Guwahati', stateCode: 'IN-AS', region: 'Assam', countryCode: 'IN', priority: 76 },
  { name: 'Panaji', stateCode: 'IN-GA', region: 'Goa', countryCode: 'IN', priority: 74 },
  { name: 'Shimla', stateCode: 'IN-HP', region: 'Himachal Pradesh', countryCode: 'IN', priority: 68 },
  { name: 'Puducherry', stateCode: 'IN-PY', region: 'Puducherry', countryCode: 'IN', priority: 68, aliases: ['Pondicherry'] },

  // United States
  { name: 'New York', stateCode: 'US-NY', region: 'New York', countryCode: 'US', priority: 100, aliases: ['NYC', 'New York City'] },
  { name: 'San Francisco', stateCode: 'US-CA', region: 'California', countryCode: 'US', priority: 99, aliases: ['SF'] },
  { name: 'San Jose', stateCode: 'US-CA', region: 'California', countryCode: 'US', priority: 94 },
  { name: 'Los Angeles', stateCode: 'US-CA', region: 'California', countryCode: 'US', priority: 97, aliases: ['LA'] },
  { name: 'San Diego', stateCode: 'US-CA', region: 'California', countryCode: 'US', priority: 88 },
  { name: 'Seattle', stateCode: 'US-WA', region: 'Washington', countryCode: 'US', priority: 97 },
  { name: 'Bellevue', stateCode: 'US-WA', region: 'Washington', countryCode: 'US', priority: 84 },
  { name: 'Austin', stateCode: 'US-TX', region: 'Texas', countryCode: 'US', priority: 95 },
  { name: 'Dallas', stateCode: 'US-TX', region: 'Texas', countryCode: 'US', priority: 92 },
  { name: 'Houston', stateCode: 'US-TX', region: 'Texas', countryCode: 'US', priority: 92 },
  { name: 'Boston', stateCode: 'US-MA', region: 'Massachusetts', countryCode: 'US', priority: 95 },
  { name: 'Cambridge', stateCode: 'US-MA', region: 'Massachusetts', countryCode: 'US', priority: 86 },
  { name: 'Chicago', stateCode: 'US-IL', region: 'Illinois', countryCode: 'US', priority: 96 },
  { name: 'Atlanta', stateCode: 'US-GA', region: 'Georgia', countryCode: 'US', priority: 91 },
  { name: 'Denver', stateCode: 'US-CO', region: 'Colorado', countryCode: 'US', priority: 89 },
  { name: 'Boulder', stateCode: 'US-CO', region: 'Colorado', countryCode: 'US', priority: 78 },
  { name: 'Miami', stateCode: 'US-FL', region: 'Florida', countryCode: 'US', priority: 89 },
  { name: 'Raleigh', stateCode: 'US-NC', region: 'North Carolina', countryCode: 'US', priority: 84 },
  { name: 'Charlotte', stateCode: 'US-NC', region: 'North Carolina', countryCode: 'US', priority: 86 },
  { name: 'Phoenix', stateCode: 'US-AZ', region: 'Arizona', countryCode: 'US', priority: 87 },
  { name: 'Washington', stateCode: 'US-DC', region: 'District of Columbia', countryCode: 'US', priority: 93, aliases: ['Washington DC'] },
  { name: 'Philadelphia', stateCode: 'US-PA', region: 'Pennsylvania', countryCode: 'US', priority: 88 },
  { name: 'Minneapolis', stateCode: 'US-MN', region: 'Minnesota', countryCode: 'US', priority: 84 },
  { name: 'Salt Lake City', stateCode: 'US-UT', region: 'Utah', countryCode: 'US', priority: 82 },

  // United Kingdom
  { name: 'London', stateCode: 'GB-ENG', region: 'England', countryCode: 'GB', priority: 100 },
  { name: 'Manchester', stateCode: 'GB-ENG', region: 'England', countryCode: 'GB', priority: 88 },
  { name: 'Birmingham', stateCode: 'GB-ENG', region: 'England', countryCode: 'GB', priority: 85 },
  { name: 'Bristol', stateCode: 'GB-ENG', region: 'England', countryCode: 'GB', priority: 83 },
  { name: 'Cambridge', stateCode: 'GB-ENG', region: 'England', countryCode: 'GB', priority: 84 },
  { name: 'Oxford', stateCode: 'GB-ENG', region: 'England', countryCode: 'GB', priority: 82 },
  { name: 'Leeds', stateCode: 'GB-ENG', region: 'England', countryCode: 'GB', priority: 80 },
  { name: 'Edinburgh', stateCode: 'GB-SCT', region: 'Scotland', countryCode: 'GB', priority: 88 },
  { name: 'Glasgow', stateCode: 'GB-SCT', region: 'Scotland', countryCode: 'GB', priority: 83 },
  { name: 'Cardiff', stateCode: 'GB-WLS', region: 'Wales', countryCode: 'GB', priority: 77 },
  { name: 'Belfast', stateCode: 'GB-NIR', region: 'Northern Ireland', countryCode: 'GB', priority: 78 },

  // Germany
  { name: 'Berlin', stateCode: 'DE-BE', region: 'Berlin', countryCode: 'DE', priority: 99 },
  { name: 'Munich', stateCode: 'DE-BY', region: 'Bavaria', countryCode: 'DE', priority: 97, aliases: ['Munchen', 'München'] },
  { name: 'Frankfurt', stateCode: 'DE-HE', region: 'Hesse', countryCode: 'DE', priority: 94, aliases: ['Frankfurt am Main'] },
  { name: 'Hamburg', stateCode: 'DE-HH', region: 'Hamburg', countryCode: 'DE', priority: 92 },
  { name: 'Stuttgart', stateCode: 'DE-BW', region: 'Baden-Wuerttemberg', countryCode: 'DE', priority: 87 },
  { name: 'Cologne', stateCode: 'DE-NW', region: 'North Rhine-Westphalia', countryCode: 'DE', priority: 86, aliases: ['Koln', 'Köln'] },
  { name: 'Dusseldorf', stateCode: 'DE-NW', region: 'North Rhine-Westphalia', countryCode: 'DE', priority: 86, aliases: ['Düsseldorf'] },

  // Netherlands & Luxembourg
  { name: 'Amsterdam', stateCode: 'NL-NH', region: 'North Holland', countryCode: 'NL', priority: 98 },
  { name: 'Rotterdam', stateCode: 'NL-ZH', region: 'South Holland', countryCode: 'NL', priority: 88 },
  { name: 'The Hague', stateCode: 'NL-ZH', region: 'South Holland', countryCode: 'NL', priority: 85, aliases: ['Den Haag'] },
  { name: 'Utrecht', stateCode: 'NL-UT', region: 'Utrecht', countryCode: 'NL', priority: 86 },
  { name: 'Eindhoven', stateCode: 'NL-NB', region: 'North Brabant', countryCode: 'NL', priority: 85 },
  { name: 'Luxembourg City', stateCode: 'LU-LU', region: 'Luxembourg District', countryCode: 'LU', priority: 94, aliases: ['Luxembourg'] },

  // Canada
  { name: 'Toronto', stateCode: 'CA-ON', region: 'Ontario', countryCode: 'CA', priority: 98 },
  { name: 'Waterloo', stateCode: 'CA-ON', region: 'Ontario', countryCode: 'CA', priority: 85 },
  { name: 'Ottawa', stateCode: 'CA-ON', region: 'Ontario', countryCode: 'CA', priority: 87 },
  { name: 'Vancouver', stateCode: 'CA-BC', region: 'British Columbia', countryCode: 'CA', priority: 96 },
  { name: 'Montreal', stateCode: 'CA-QC', region: 'Quebec', countryCode: 'CA', priority: 94, aliases: ['Montréal'] },
  { name: 'Calgary', stateCode: 'CA-AB', region: 'Alberta', countryCode: 'CA', priority: 87 },

  // France, Switzerland, Ireland, Nordics, Iberia, Italy, CEE
  { name: 'Paris', stateCode: 'FR-IDF', region: 'Ile-de-France', countryCode: 'FR', priority: 99 },
  { name: 'Lyon', stateCode: 'FR-ARA', region: 'Auvergne-Rhone-Alpes', countryCode: 'FR', priority: 86 },
  { name: 'Toulouse', stateCode: 'FR-OCC', region: 'Occitanie', countryCode: 'FR', priority: 82 },
  { name: 'Zurich', stateCode: 'CH-ZH', region: 'Zurich', countryCode: 'CH', priority: 96, aliases: ['Zürich'] },
  { name: 'Geneva', stateCode: 'CH-GE', region: 'Geneva', countryCode: 'CH', priority: 90, aliases: ['Genève'] },
  { name: 'Basel', stateCode: 'CH-BS', region: 'Basel-Stadt', countryCode: 'CH', priority: 84 },
  { name: 'Zug', stateCode: 'CH-ZG', region: 'Zug', countryCode: 'CH', priority: 82 },
  { name: 'Dublin', stateCode: 'IE-L', region: 'Leinster', countryCode: 'IE', priority: 96 },
  { name: 'Cork', stateCode: 'IE-M', region: 'Munster', countryCode: 'IE', priority: 80 },
  { name: 'Stockholm', region: 'Stockholm', countryCode: 'SE', priority: 94 },
  { name: 'Copenhagen', region: 'Capital Region', countryCode: 'DK', priority: 92 },
  { name: 'Oslo', region: 'Oslo', countryCode: 'NO', priority: 90 },
  { name: 'Helsinki', region: 'Uusimaa', countryCode: 'FI', priority: 89 },
  { name: 'Madrid', region: 'Madrid', countryCode: 'ES', priority: 93 },
  { name: 'Barcelona', region: 'Catalonia', countryCode: 'ES', priority: 94 },
  { name: 'Lisbon', region: 'Lisbon', countryCode: 'PT', priority: 90 },
  { name: 'Milan', region: 'Lombardy', countryCode: 'IT', priority: 91, aliases: ['Milano'] },
  { name: 'Rome', region: 'Lazio', countryCode: 'IT', priority: 88, aliases: ['Roma'] },
  { name: 'Brussels', region: 'Brussels', countryCode: 'BE', priority: 90 },
  { name: 'Vienna', region: 'Vienna', countryCode: 'AT', priority: 90, aliases: ['Wien'] },
  { name: 'Warsaw', region: 'Masovia', countryCode: 'PL', priority: 90, aliases: ['Warszawa'] },
  { name: 'Krakow', region: 'Lesser Poland', countryCode: 'PL', priority: 85, aliases: ['Kraków'] },
  { name: 'Prague', region: 'Prague', countryCode: 'CZ', priority: 89, aliases: ['Praha'] },
  { name: 'Tallinn', region: 'Harju', countryCode: 'EE', priority: 84 },

  // APAC & ANZ & MENA & Americas
  { name: 'Singapore', stateCode: 'SG-01', region: 'Central Singapore', countryCode: 'SG', priority: 99 },
  { name: 'Tokyo', stateCode: 'JP-13', region: 'Tokyo', countryCode: 'JP', priority: 99 },
  { name: 'Osaka', stateCode: 'JP-27', region: 'Osaka', countryCode: 'JP', priority: 89 },
  { name: 'Yokohama', stateCode: 'JP-14', region: 'Kanagawa', countryCode: 'JP', priority: 84 },
  { name: 'Sydney', stateCode: 'AU-NSW', region: 'New South Wales', countryCode: 'AU', priority: 98 },
  { name: 'Melbourne', stateCode: 'AU-VIC', region: 'Victoria', countryCode: 'AU', priority: 96 },
  { name: 'Brisbane', stateCode: 'AU-QLD', region: 'Queensland', countryCode: 'AU', priority: 87 },
  { name: 'Perth', stateCode: 'AU-WA', region: 'Western Australia', countryCode: 'AU', priority: 83 },
  { name: 'Auckland', region: 'Auckland', countryCode: 'NZ', priority: 88 },
  { name: 'Dubai', stateCode: 'AE-DU', region: 'Dubai', countryCode: 'AE', priority: 98 },
  { name: 'Abu Dhabi', stateCode: 'AE-AZ', region: 'Abu Dhabi', countryCode: 'AE', priority: 92 },
  { name: 'Riyadh', region: 'Riyadh Province', countryCode: 'SA', priority: 90 },
  { name: 'Doha', region: 'Doha', countryCode: 'QA', priority: 88 },
  { name: 'Tel Aviv', region: 'Tel Aviv District', countryCode: 'IL', priority: 94 },
  { name: 'Seoul', region: 'Seoul', countryCode: 'KR', priority: 95 },
  { name: 'Hong Kong', region: 'Hong Kong', countryCode: 'HK', priority: 95 },
  { name: 'Taipei', region: 'Taipei', countryCode: 'TW', priority: 90 },
  { name: 'Kuala Lumpur', region: 'Kuala Lumpur', countryCode: 'MY', priority: 90 },
  { name: 'Bangkok', region: 'Bangkok', countryCode: 'TH', priority: 88 },
  { name: 'Jakarta', region: 'Jakarta', countryCode: 'ID', priority: 89 },
  { name: 'Manila', region: 'Metro Manila', countryCode: 'PH', priority: 88 },
  { name: 'Ho Chi Minh City', region: 'Ho Chi Minh', countryCode: 'VN', priority: 87 },
  { name: 'Sao Paulo', region: 'Sao Paulo', countryCode: 'BR', priority: 94, aliases: ['São Paulo'] },
  { name: 'Mexico City', region: 'CDMX', countryCode: 'MX', priority: 92, aliases: ['Ciudad de México'] },
  { name: 'Buenos Aires', region: 'Buenos Aires', countryCode: 'AR', priority: 88 },
  { name: 'Santiago', region: 'Santiago Metropolitan', countryCode: 'CL', priority: 85 },
  { name: 'Bogota', region: 'Bogota', countryCode: 'CO', priority: 85, aliases: ['Bogotá'] },
  { name: 'Johannesburg', region: 'Gauteng', countryCode: 'ZA', priority: 87 },
  { name: 'Cape Town', region: 'Western Cape', countryCode: 'ZA', priority: 88 },
  { name: 'Nairobi', region: 'Nairobi', countryCode: 'KE', priority: 84 },
  { name: 'Lagos', region: 'Lagos', countryCode: 'NG', priority: 86 },
  { name: 'Cairo', region: 'Cairo', countryCode: 'EG', priority: 86 },
  { name: 'Istanbul', region: 'Istanbul', countryCode: 'TR', priority: 91 },
];

const COUNTRY_BY_CODE = new Map<string, CountryRecord>(
  GLOBAL_COUNTRIES.map((c) => [c.code.toUpperCase(), c])
);

export function normalizeLocationToken(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,/()-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getCountryByCodeOrName(countryCodeOrName: string): CountryRecord | undefined {
  const needle = normalizeLocationToken(countryCodeOrName);
  if (!needle) return undefined;
  const upper = needle.toUpperCase();
  if (COUNTRY_BY_CODE.has(upper)) return COUNTRY_BY_CODE.get(upper);
  return GLOBAL_COUNTRIES.find(
    (c) =>
      normalizeLocationToken(c.name) === needle ||
      (c.aliases || []).some((a) => normalizeLocationToken(a) === needle)
  );
}

export function getCountries(options?: { includeRemote?: boolean }): Array<{
  code: string;
  name: string;
  currency: string;
}> {
  const list = [...GLOBAL_COUNTRIES]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({ code: c.code, name: c.name, currency: c.currency }));
  if (options?.includeRemote) {
    return [{ code: 'REMOTE', name: 'Remote Worldwide', currency: 'USD' }, ...list];
  }
  return list;
}

export function getStatesByCountry(countryCodeOrName: string): StateRecord[] {
  const country = getCountryByCodeOrName(countryCodeOrName);
  if (!country) return [];
  return GLOBAL_STATES.filter((s) => s.countryCode === country.code).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function getCitiesByState(
  countryCodeOrName: string,
  stateCodeOrName?: string,
  query?: string
): CityRecord[] {
  const country = getCountryByCodeOrName(countryCodeOrName);
  if (!country) return [];

  let cities = GLOBAL_CITIES.filter((c) => c.countryCode === country.code);

  if (stateCodeOrName && stateCodeOrName.trim()) {
    const normState = normalizeLocationToken(stateCodeOrName);
    const matchedState = GLOBAL_STATES.find(
      (s) =>
        s.countryCode === country.code &&
        (normalizeLocationToken(s.code) === normState ||
          normalizeLocationToken(s.name) === normState ||
          (s.aliases || []).some((a) => normalizeLocationToken(a) === normState))
    );
    cities = cities.filter((c) => {
      if (matchedState) {
        return (
          c.stateCode === matchedState.code ||
          normalizeLocationToken(c.region) === normalizeLocationToken(matchedState.name)
        );
      }
      return normalizeLocationToken(c.region) === normState;
    });
  }

  if (query && query.trim()) {
    const q = normalizeLocationToken(query);
    cities = cities.filter(
      (c) =>
        normalizeLocationToken(c.name).includes(q) ||
        normalizeLocationToken(c.region).includes(q) ||
        (c.aliases || []).some((a) => normalizeLocationToken(a).includes(q))
    );
  }

  return cities.sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
}

function scoreFieldMatch(normQuery: string, normTarget: string): number {
  if (!normTarget || !normQuery) return 0;
  if (normTarget === normQuery) return 120;
  if (normTarget.startsWith(normQuery)) return 95;
  const tokens = normTarget.split(' ');
  if (tokens.some((t) => t.startsWith(normQuery))) return 80;
  if (normTarget.includes(normQuery)) return 60;
  return 0;
}

export interface SearchLocationOptions {
  types?: LocationEntityType[];
  countryCode?: string;
  includeRemote?: boolean;
  limit?: number;
}

export function searchLocations(
  rawQuery: string,
  options: SearchLocationOptions = {}
): LocationSuggestion[] {
  const normQuery = normalizeLocationToken(rawQuery);
  const limit = Math.max(1, Math.min(options.limit ?? 15, 50));
  const allowedTypes = new Set<LocationEntityType>(
    options.types && options.types.length > 0
      ? options.types
      : ['city', 'region', 'country', ...(options.includeRemote ? (['remote'] as const) : [])]
  );

  const countryFilter = options.countryCode
    ? getCountryByCodeOrName(options.countryCode)?.code
    : undefined;

  // If empty query, return top popular hubs / countries so opening dropdown still shows helpful choices
  if (!normQuery) {
    const defaults: LocationSuggestion[] = [];
    if (allowedTypes.has('remote') || options.includeRemote) {
      defaults.push({
        id: 'remote:global',
        city: undefined,
        region: undefined,
        country: 'Remote Worldwide',
        countryCode: 'REMOTE',
        formattedAddress: 'Remote Worldwide',
        locationType: 'remote',
        label: 'Remote Worldwide',
        subtitle: 'Work from anywhere / Distributed',
        score: 100,
      });
    }
    const topCities = [...GLOBAL_CITIES]
      .filter((c) => !countryFilter || c.countryCode === countryFilter)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
    for (const c of topCities) {
      const country = COUNTRY_BY_CODE.get(c.countryCode);
      if (!country) continue;
      const formattedAddress =
        c.name === country.name ? c.name : `${c.name}, ${c.region}, ${country.name}`;
      defaults.push({
        id: `city:${c.countryCode}:${c.region}:${c.name}`,
        city: c.name,
        region: c.region,
        country: country.name,
        countryCode: country.code,
        formattedAddress,
        locationType: 'city',
        label: c.name,
        subtitle: `${c.region}, ${country.name}`,
        score: c.priority,
      });
    }
    return defaults.slice(0, limit);
  }

  const queryParts = normQuery.split(',').map((p) => p.trim()).filter(Boolean);
  const resultsByKey = new Map<string, LocationSuggestion>();

  // 1. Remote pseudo-options
  if (allowedTypes.has('remote') || options.includeRemote) {
    const remoteScore = Math.max(
      scoreFieldMatch(normQuery, 'remote'),
      scoreFieldMatch(normQuery, 'remote worldwide'),
      scoreFieldMatch(normQuery, 'anywhere')
    );
    if (remoteScore > 0) {
      resultsByKey.set('remote:global', {
        id: 'remote:global',
        country: 'Remote Worldwide',
        countryCode: 'REMOTE',
        formattedAddress: 'Remote Worldwide',
        locationType: 'remote',
        label: 'Remote Worldwide',
        subtitle: 'Global / Location-independent',
        score: remoteScore + 20,
      });
    }
  }

  // 2. Cities
  if (allowedTypes.has('city')) {
    for (const city of GLOBAL_CITIES) {
      if (countryFilter && city.countryCode !== countryFilter) continue;
      const country = COUNTRY_BY_CODE.get(city.countryCode);
      if (!country) continue;

      const formattedAddress =
        city.name === country.name
          ? city.name
          : `${city.name}, ${city.region}, ${country.name}`;
      const normCity = normalizeLocationToken(city.name);
      const normRegion = normalizeLocationToken(city.region);
      const normCountry = normalizeLocationToken(country.name);
      const normFormatted = normalizeLocationToken(formattedAddress);

      const cityScore = scoreFieldMatch(normQuery, normCity);
      const formattedScore = scoreFieldMatch(normQuery, normFormatted);
      const aliasScore = (city.aliases || []).reduce(
        (best, a) => Math.max(best, scoreFieldMatch(normQuery, normalizeLocationToken(a))),
        0
      );

      let score = Math.max(
        cityScore > 0 ? cityScore + 15 : 0,
        formattedScore,
        aliasScore > 0 ? aliasScore + 12 : 0
      );

      // Multi-token support like "indore madhya" or "indore india"
      if (score === 0 || queryParts.length > 1) {
        const words = normQuery.split(' ').filter(Boolean);
        const combined = `${normCity} ${normRegion} ${normCountry} ${(city.aliases || []).map(normalizeLocationToken).join(' ')}`;
        if (words.length > 1 && words.every((w) => combined.includes(w))) {
          score = Math.max(score, 90);
        }
      }

      if (score > 0) {
        const finalScore = score + Math.round(city.priority / 10);
        const key = `city:${normalizeLocationToken(formattedAddress)}`;
        const existing = resultsByKey.get(key);
        if (!existing || finalScore > existing.score) {
          resultsByKey.set(key, {
            id: `city:${country.code}:${city.stateCode || city.region}:${city.name}`,
            city: city.name,
            region: city.region,
            country: country.name,
            countryCode: country.code,
            formattedAddress,
            locationType: 'city',
            label: formattedAddress,
            subtitle: `City · ${country.name} (${country.code})`,
            score: finalScore,
          });
        }
      }
    }
  }

  // 3. States / Regions
  if (allowedTypes.has('region')) {
    for (const state of GLOBAL_STATES) {
      if (countryFilter && state.countryCode !== countryFilter) continue;
      const country = COUNTRY_BY_CODE.get(state.countryCode);
      if (!country) continue;

      const formattedAddress = `${state.name}, ${country.name}`;
      const score = Math.max(
        scoreFieldMatch(normQuery, normalizeLocationToken(state.name)),
        scoreFieldMatch(normQuery, normalizeLocationToken(formattedAddress)),
        ...(state.aliases || []).map((a) => scoreFieldMatch(normQuery, normalizeLocationToken(a)))
      );
      if (score > 0) {
        const key = `region:${normalizeLocationToken(formattedAddress)}`;
        const existing = resultsByKey.get(key);
        if (!existing || score > existing.score) {
          resultsByKey.set(key, {
            id: `region:${state.code}`,
            region: state.name,
            country: country.name,
            countryCode: country.code,
            formattedAddress,
            locationType: 'region',
            label: formattedAddress,
            subtitle: `State / Region · ${country.name}`,
            score,
          });
        }
      }
    }
  }

  // 4. Countries
  if (allowedTypes.has('country')) {
    for (const country of GLOBAL_COUNTRIES) {
      if (countryFilter && country.code !== countryFilter) continue;
      const score = Math.max(
        scoreFieldMatch(normQuery, normalizeLocationToken(country.name)),
        scoreFieldMatch(normQuery, normalizeLocationToken(country.code)),
        ...(country.aliases || []).map((a) => scoreFieldMatch(normQuery, normalizeLocationToken(a)))
      );
      if (score > 0) {
        const key = `country:${country.code}`;
        const existing = resultsByKey.get(key);
        if (!existing || score > existing.score) {
          resultsByKey.set(key, {
            id: `country:${country.code}`,
            country: country.name,
            countryCode: country.code,
            formattedAddress: country.name,
            locationType: 'country',
            label: country.name,
            subtitle: `Country · ISO ${country.code}`,
            score: score - 2, // Slightly below exact city match when city also matches identically
          });
        }
      }
    }
  }

  return Array.from(resultsByKey.values())
    .sort((a, b) => b.score - a.score || a.formattedAddress.localeCompare(b.formattedAddress))
    .slice(0, limit);
}

export function parseLocationString(raw: string): StructuredLocation | null {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;

  const norm = normalizeLocationToken(trimmed);
  if (norm === 'remote' || norm === 'remote worldwide' || norm === 'worldwide') {
    return {
      country: 'Remote Worldwide',
      countryCode: 'REMOTE',
      formattedAddress: 'Remote Worldwide',
      locationType: 'remote',
    };
  }

  const exactSuggestions = searchLocations(trimmed, { includeRemote: true, limit: 5 });
  if (exactSuggestions.length > 0 && exactSuggestions[0].score >= 85) {
    const top = exactSuggestions[0];
    return {
      city: top.city,
      region: top.region,
      country: top.country,
      countryCode: top.countryCode,
      formattedAddress: top.formattedAddress,
      locationType: top.locationType,
    };
  }

  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  const lastCountry = getCountryByCodeOrName(parts[parts.length - 1] || '');
  if (parts.length >= 3 && lastCountry) {
    return {
      city: parts[0],
      region: parts[1],
      country: lastCountry.name,
      countryCode: lastCountry.code,
      formattedAddress: `${parts[0]}, ${parts[1]}, ${lastCountry.name}`,
      locationType: 'city',
    };
  }
  if (parts.length === 2 && lastCountry) {
    const matchedCity = GLOBAL_CITIES.find(
      (c) =>
        c.countryCode === lastCountry.code &&
        (normalizeLocationToken(c.name) === normalizeLocationToken(parts[0]) ||
          (c.aliases || []).some((a) => normalizeLocationToken(a) === normalizeLocationToken(parts[0])))
    );
    if (matchedCity) {
      return {
        city: matchedCity.name,
        region: matchedCity.region,
        country: lastCountry.name,
        countryCode: lastCountry.code,
        formattedAddress: `${matchedCity.name}, ${matchedCity.region}, ${lastCountry.name}`,
        locationType: 'city',
      };
    }
    return {
      region: parts[0],
      country: lastCountry.name,
      countryCode: lastCountry.code,
      formattedAddress: `${parts[0]}, ${lastCountry.name}`,
      locationType: 'region',
    };
  }

  return null;
}

export function locationMatchesFilter(
  candidateLocation: string | undefined,
  candidateCountry: string | undefined,
  filterValue: string
): boolean {
  const filterNorm = normalizeLocationToken(filterValue);
  if (!filterNorm || filterNorm === 'all' || filterNorm === 'all locations' || filterNorm === 'all countries') {
    return true;
  }

  const locNorm = normalizeLocationToken(candidateLocation || '');
  const countryNorm = normalizeLocationToken(candidateCountry || '');

  if (filterNorm === 'remote' || filterNorm === 'remote worldwide') {
    return locNorm.includes('remote') || countryNorm.includes('remote') || locNorm.includes('worldwide') || locNorm.includes('anywhere');
  }

  // Resolve structured info for richer matching (e.g. searching "India" matches "Indore, Madhya Pradesh, India" or "Bengaluru")
  const matchedCountry = getCountryByCodeOrName(filterValue);
  if (matchedCountry) {
    const cName = normalizeLocationToken(matchedCountry.name);
    const cCode = normalizeLocationToken(matchedCountry.code);
    if (countryNorm === cName || countryNorm === cCode || locNorm.includes(cName)) {
      return true;
    }
    for (const alias of matchedCountry.aliases || []) {
      const normAlias = normalizeLocationToken(alias);
      if (countryNorm === normAlias || locNorm.includes(normAlias)) return true;
    }
    // Check if candidateLocation contains a known city in that country
    const citiesInCountry = GLOBAL_CITIES.filter((c) => c.countryCode === matchedCountry.code);
    if (citiesInCountry.some((c) => locNorm.includes(normalizeLocationToken(c.name)))) {
      return true;
    }
  }

  // City or region token matching (e.g. "Indore, Madhya Pradesh, India" -> matches "Indore")
  const firstToken = normalizeLocationToken(filterValue.split(',')[0] || '');
  if (locNorm.includes(filterNorm) || countryNorm.includes(filterNorm)) return true;
  if (firstToken && locNorm.includes(firstToken)) return true;

  return false;
}
