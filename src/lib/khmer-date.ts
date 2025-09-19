
"use client";

const KHMER_DAY_STRING: {[key: string]: string} = {
  '1': '១កើត', '2': '២កើត', '3': '៣កើត', '4': '៤កើត', '5': '៥កើត',
  '6': '៦កើត', '7': '៧កើត', '8': '៨កើត', '9': '៩កើត', '10': '១០កើត',
  '11': '១១កើត', '12': '១២កើត', '13': '១៣កើត', '14': '១៤កើត', '15': '១៥កើត',
  '16': '១រោច', '17': '២រោច', '18': '៣រោច', '19': '៤រោច', '20': '៥រោច',
  '21': '៦រោច', '22': '៧រោច', '23': '៨រោច', '24': '៩រោច', '25': '១០រោច',
  '26': '១១រោច', '27': '១២រោច', '28': '១៣រោច', '29': '១៤រោច', '30': '១៥រោច',
};

const KHMER_DAY_OF_WEEK: {[key: number]: string} = {
  0: 'អាទិត្យ', // Sunday
  1: 'ចន្ទ',   // Monday
  2: 'អង្គារ', // Tuesday
  3: 'ពុធ',   // Wednesday
  4: 'ព្រហស្បតិ៍', // Thursday
  5: 'សុក្រ',    // Friday
  6: 'សៅរ៍',   // Saturday
};

const KHMER_DIGITS: {[key: string]: string} = {
  '0': '០', '1': '១', '2': '២', '3': '៣', '4': '៤',
  '5': '៥', '6': '៦', '7': '៧', '8': '៨', '9': '៩',
};

const KHMER_GREGORIAN_MONTHS: {[key: number]: string} = {
    0: 'មករា',
    1: 'កុម្ភៈ',
    2: 'មីនា',
    3: 'មេសា',
    4: 'ឧសភា',
    5: 'មិថុនា',
    6: 'កក្កដា',
    7: 'សីហា',
    8: 'កញ្ញា',
    9: 'តុលា',
    10: 'វិច្ឆិកា',
    11: 'ធ្នូ',
};

const KHMER_MONTHS: string[] = [
  'ចេត្រ', 'ពិសាខ', 'ជេស្ឋ', 'អាសាឍ', 'ស្រាពណ៍', 'ភទ្របទ',
  'អស្សុជ', 'កត្តិក', 'មិគសិរ', 'បុស្ស', 'មាឃ', 'ផល្គុន',
];

const KHMER_ZODIAC: string[] = [
  'ជូត', 'ឆ្លូវ', 'ខាល', 'ថោះ', 'រោង', 'ម្សាញ់',
  'មមី', 'មមែ', 'វក', 'រកា', 'ច', 'កុរ',
];

const KHMER_STEMS: string[] = [
  'ឯកស័ក', 'ទោស័ក', 'ត្រីស័ក', 'ចត្វាស័ក', 'បញ្ចស័ក',
  'ឆស័ក', 'សប្តស័ក', 'អដ្ឋស័ក', 'នព្វស័ក', 'សំរឹទ្ធិស័ក',
];

function replaceAll(text: string, dic: {[key: string]: string}): string {
  let newText = text;
  for (const i in dic) {
    newText = newText.replace(new RegExp(i, 'g'), dic[i]);
  }
  return newText;
}

function isValidDate(day: number, month: number, year: number): boolean {
  if (!(month >= 1 && month <= 12)) return false;
  if (year < 1) return false;
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
    daysInMonth[1] = 29;
  }
  return day >= 1 && day <= daysInMonth[month - 1];
}

function gregorianToJd(day: number, month: number, year: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jd =
    day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) -
    Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  return jd;
}

function getNewMoonDay(k: number, timezone: number = 7.0): number {
  const T = k / 1236.85;
  let JDE =
    2451550.09766 + 29.530588861 * k + 0.00015437 * T ** 2 -
    0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
  JDE += timezone / 24.0;
  return Math.floor(JDE + 0.5);
}

function getSunLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T ** 2;
  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T ** 2;
  M = (M * Math.PI) / 180; // to radians
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T ** 2) * Math.sin(M) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  const solarLong = (L0 + C) % 360;
  return solarLong;
}

function isLeapMonth(jd_start: number, jd_end: number): boolean {
  const long_start = getSunLongitude(jd_start);
  const long_end = getSunLongitude(jd_end);
  for (let i = 0; i < 12; i++) {
    const term = i * 30.0;
    if (
      (long_start <= term && term < long_end) ||
      (long_end < long_start && (long_start <= term || term < long_end))
    ) {
      return false;
    }
  }
  return true;
}

function getKhmerZodiacYear(lunar_year: number): string {
  return KHMER_ZODIAC[(lunar_year - 4) % 12];
}

function getKhmerStem(year: number): string {
    return KHMER_STEMS[(year - 4) % 10];
}

function gregorianToKhmerLunar(day: number, month: number, year: number) {
  if (!isValidDate(day, month, year)) {
    throw new Error('Invalid Gregorian date');
  }

  const jd = gregorianToJd(day, month, year);

  let k = Math.floor((jd - 2451545.0) / 29.530588853);
  let new_moon_jd = getNewMoonDay(k);

  if (new_moon_jd > jd) {
    k -= 1;
    new_moon_jd = getNewMoonDay(k);
  } else if (getNewMoonDay(k + 1) <= jd) {
    k += 1;
    new_moon_jd = getNewMoonDay(k);
  }

  let lunar_day = jd - new_moon_jd + 1;
  if (lunar_day < 1) {
    k -= 1;
    new_moon_jd = getNewMoonDay(k);
    lunar_day = jd - new_moon_jd + 1;
  }
  
  const ref_year = year - (month < 4 || (month === 4 && day < 14) ? 1 : 0);
  const jd_ref = gregorianToJd(14, 4, ref_year);
  const k_ref = Math.floor((jd_ref - 2451545.0) / 29.530588853);
  
  let month_count = 0;
  let current_k = k_ref;
  while (getNewMoonDay(current_k) <= new_moon_jd) {
      month_count++;
      current_k++;
  }

  let is_leap = false;
  let leap_month_count = 0;

  for (let i = 0; i < month_count; i++) {
    const month_start = getNewMoonDay(k_ref + i);
    const month_end = getNewMoonDay(k_ref + i + 1);
    if (isLeapMonth(month_start, month_end)) {
      if (i < month_count -1) {
        leap_month_count++;
      } else {
        is_leap = true;
      }
    }
  }
  
  const lunar_year = year + 544 - (month < 4 || (month === 4 && day < 14) ? 1 : 0);
  let lunar_month = (month_count - leap_month_count - 1) % 12;

  let month_name = KHMER_MONTHS[lunar_month];

  if(is_leap) {
    if (lunar_month === 7) { // Asath
        month_name = 'បឋមាសាឍ';
    } else {
       month_name = KHMER_MONTHS[(lunar_month + 11) % 12];
    }
  }

  const zodiac_year = getKhmerZodiacYear(lunar_year);
  const stem = getKhmerStem(lunar_year);

  return {
    lunar_day: KHMER_DAY_STRING[String(lunar_day)],
    lunar_month: month_name,
    lunar_year: replaceAll(String(lunar_year), KHMER_DIGITS),
    zodiac_year: zodiac_year,
    stem: stem,
  };
}

export function formatToKhmerLunarDate(date: Date): string {
    const dd = date.getDate();
    const mm = date.getMonth() + 1;
    const yyyy = date.getFullYear();
    const dayName = KHMER_DAY_OF_WEEK[date.getDay()];
  
    try {
        const result = gregorianToKhmerLunar(dd, mm, yyyy);
        return `ថ្ងៃ${dayName} ${result.lunar_day} ខែ${result.lunar_month} ឆ្នាំ${result.zodiac_year} ${result.stem} ព.ស. ${result.lunar_year}`;
    } catch (e) {
        console.error("Error converting to Khmer Lunar Date:", e);
        return date.toLocaleDateString('km-KH');
    }
}

export function formatToKhmerGregorian(date: Date): string {
    const day = replaceAll(String(date.getDate()), KHMER_DIGITS);
    const month = KHMER_GREGORIAN_MONTHS[date.getMonth()];
    const year = replaceAll(String(date.getFullYear()), KHMER_DIGITS);
    return `ត្រូវនឹងថ្ងៃទី ${day} ខែ ${month} ឆ្នាំ ${year}`;
}
