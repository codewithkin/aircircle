/**
 * The main time zone of each country, by ISO 3166-1 alpha-2 code.
 *
 * Used to show what time of day a country is broadcasting into. For countries
 * that span several zones this is the zone of the capital or the largest
 * city — a guide to "is it morning there?", not a schedule.
 */
const ZONES: Record<string, string> = {
  AD: "Europe/Andorra", AE: "Asia/Dubai", AF: "Asia/Kabul", AG: "America/Antigua",
  AL: "Europe/Tirane", AM: "Asia/Yerevan", AO: "Africa/Luanda", AR: "America/Argentina/Buenos_Aires",
  AT: "Europe/Vienna", AU: "Australia/Sydney", AW: "America/Aruba", AZ: "Asia/Baku",
  BA: "Europe/Sarajevo", BB: "America/Barbados", BD: "Asia/Dhaka", BE: "Europe/Brussels",
  BF: "Africa/Ouagadougou", BG: "Europe/Sofia", BH: "Asia/Bahrain", BI: "Africa/Bujumbura",
  BJ: "Africa/Porto-Novo", BM: "Atlantic/Bermuda", BN: "Asia/Brunei", BO: "America/La_Paz",
  BR: "America/Sao_Paulo", BS: "America/Nassau", BT: "Asia/Thimphu", BW: "Africa/Gaborone",
  BY: "Europe/Minsk", BZ: "America/Belize", CA: "America/Toronto", CD: "Africa/Kinshasa",
  CF: "Africa/Bangui", CG: "Africa/Brazzaville", CH: "Europe/Zurich", CI: "Africa/Abidjan",
  CL: "America/Santiago", CM: "Africa/Douala", CN: "Asia/Shanghai", CO: "America/Bogota",
  CR: "America/Costa_Rica", CU: "America/Havana", CV: "Atlantic/Cape_Verde", CW: "America/Curacao",
  CY: "Asia/Nicosia", CZ: "Europe/Prague", DE: "Europe/Berlin", DJ: "Africa/Djibouti",
  DK: "Europe/Copenhagen", DM: "America/Dominica", DO: "America/Santo_Domingo", DZ: "Africa/Algiers",
  EC: "America/Guayaquil", EE: "Europe/Tallinn", EG: "Africa/Cairo", ER: "Africa/Asmara",
  ES: "Europe/Madrid", ET: "Africa/Addis_Ababa", FI: "Europe/Helsinki", FJ: "Pacific/Fiji",
  FO: "Atlantic/Faroe", FR: "Europe/Paris", GA: "Africa/Libreville", GB: "Europe/London",
  GD: "America/Grenada", GE: "Asia/Tbilisi", GH: "Africa/Accra", GI: "Europe/Gibraltar",
  GL: "America/Nuuk", GM: "Africa/Banjul", GN: "Africa/Conakry", GQ: "Africa/Malabo",
  GR: "Europe/Athens", GT: "America/Guatemala", GW: "Africa/Bissau", GY: "America/Guyana",
  HK: "Asia/Hong_Kong", HN: "America/Tegucigalpa", HR: "Europe/Zagreb", HT: "America/Port-au-Prince",
  HU: "Europe/Budapest", ID: "Asia/Jakarta", IE: "Europe/Dublin", IL: "Asia/Jerusalem",
  IN: "Asia/Kolkata", IQ: "Asia/Baghdad", IR: "Asia/Tehran", IS: "Atlantic/Reykjavik",
  IT: "Europe/Rome", JM: "America/Jamaica", JO: "Asia/Amman", JP: "Asia/Tokyo",
  KE: "Africa/Nairobi", KG: "Asia/Bishkek", KH: "Asia/Phnom_Penh", KM: "Indian/Comoro",
  KN: "America/St_Kitts", KP: "Asia/Pyongyang", KR: "Asia/Seoul", KW: "Asia/Kuwait",
  KY: "America/Cayman", KZ: "Asia/Almaty", LA: "Asia/Vientiane", LB: "Asia/Beirut",
  LC: "America/St_Lucia", LI: "Europe/Vaduz", LK: "Asia/Colombo", LR: "Africa/Monrovia",
  LS: "Africa/Maseru", LT: "Europe/Vilnius", LU: "Europe/Luxembourg", LV: "Europe/Riga",
  LY: "Africa/Tripoli", MA: "Africa/Casablanca", MC: "Europe/Monaco", MD: "Europe/Chisinau",
  ME: "Europe/Podgorica", MG: "Indian/Antananarivo", MK: "Europe/Skopje", ML: "Africa/Bamako",
  MM: "Asia/Yangon", MN: "Asia/Ulaanbaatar", MO: "Asia/Macau", MR: "Africa/Nouakchott",
  MT: "Europe/Malta", MU: "Indian/Mauritius", MV: "Indian/Maldives", MW: "Africa/Blantyre",
  MX: "America/Mexico_City", MY: "Asia/Kuala_Lumpur", MZ: "Africa/Maputo", NA: "Africa/Windhoek",
  NE: "Africa/Niamey", NG: "Africa/Lagos", NI: "America/Managua", NL: "Europe/Amsterdam",
  NO: "Europe/Oslo", NP: "Asia/Kathmandu", NZ: "Pacific/Auckland", OM: "Asia/Muscat",
  PA: "America/Panama", PE: "America/Lima", PG: "Pacific/Port_Moresby", PH: "Asia/Manila",
  PK: "Asia/Karachi", PL: "Europe/Warsaw", PR: "America/Puerto_Rico", PS: "Asia/Hebron",
  PT: "Europe/Lisbon", PY: "America/Asuncion", QA: "Asia/Qatar", RE: "Indian/Reunion",
  RO: "Europe/Bucharest", RS: "Europe/Belgrade", RU: "Europe/Moscow", RW: "Africa/Kigali",
  SA: "Asia/Riyadh", SC: "Indian/Mahe", SD: "Africa/Khartoum", SE: "Europe/Stockholm",
  SG: "Asia/Singapore", SI: "Europe/Ljubljana", SK: "Europe/Bratislava", SL: "Africa/Freetown",
  SM: "Europe/San_Marino", SN: "Africa/Dakar", SO: "Africa/Mogadishu", SR: "America/Paramaribo",
  SS: "Africa/Juba", SV: "America/El_Salvador", SY: "Asia/Damascus", SZ: "Africa/Mbabane",
  TD: "Africa/Ndjamena", TG: "Africa/Lome", TH: "Asia/Bangkok", TJ: "Asia/Dushanbe",
  TM: "Asia/Ashgabat", TN: "Africa/Tunis", TR: "Europe/Istanbul", TT: "America/Port_of_Spain",
  TW: "Asia/Taipei", TZ: "Africa/Dar_es_Salaam", UA: "Europe/Kyiv", UG: "Africa/Kampala",
  US: "America/New_York", UY: "America/Montevideo", UZ: "Asia/Tashkent", VA: "Europe/Vatican",
  VC: "America/St_Vincent", VE: "America/Caracas", VN: "Asia/Ho_Chi_Minh", XK: "Europe/Belgrade",
  YE: "Asia/Aden", ZA: "Africa/Johannesburg", ZM: "Africa/Lusaka", ZW: "Africa/Harare",
};

/**
 * The time right now in a country, like "21:47" — or null when the country or
 * its zone isn't known, in which case the caller shows something else rather
 * than a guess.
 */
export function localTimeIn(countryCode: string | undefined, now = new Date()): string | null {
  const zone = countryCode ? ZONES[countryCode.toUpperCase()] : undefined;
  if (!zone) return null;

  try {
    return now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: zone });
  } catch {
    // The runtime doesn't have this zone's data.
    return null;
  }
}
