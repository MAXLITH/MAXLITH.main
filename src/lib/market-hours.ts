export const NSE_HOLIDAYS_2026 = [
  '2026-01-26',
  '2026-03-03',
  '2026-03-31',
  '2026-04-03',
  '2026-04-14',
  '2026-05-01',
  '2026-08-15',
  '2026-10-02',
  '2026-10-20',
  '2026-11-08',
  '2026-11-24',
  '2026-12-25',
];

export interface MarketSessionStatus {
  isOpen: boolean;
  isPreOpen?: boolean;
  isWeekend?: boolean;
  session: 'PRE_MARKET' | 'OPEN' | 'POST_MARKET' | 'CLOSED';
  nextSessionText: string;
  currentTimeIST: string;
  nextOpenAt?: string;
  nextCloseAt?: string;
  nextOpenTime?: string;
  nextCloseTime?: string;
  isHoliday?: boolean;
  holidayName?: string | null;
  canPlaceAmo?: boolean;
  squareOffWindow?: boolean;
}

function istNow(from?: Date): Date {
export function istNow(from?: Date): Date {
  const now = from || new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000 + istOffset);
}

export const getISTDate = istNow;
export const isMarketHoliday = isHolidayDate;


function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function isHolidayDate(ymdStr: string, extra: string[] = []): boolean {
  return NSE_HOLIDAYS_2026.includes(ymdStr) || extra.includes(ymdStr);
}

export function isTradingDay(d: Date, extraHolidays: string[] = []): boolean {
  return !isWeekend(d) && !isHolidayDate(ymd(d), extraHolidays);
}

export function getMarketSessionStatus(now?: Date, extraHolidays: string[] = []): MarketSessionStatus {
  const istDate = istNow(now);
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  const timeStr = istDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const preMarketStart = 9 * 60;
  const marketStart = 9 * 60 + 15;
  const squareOff = 15 * 60 + 15;
  const marketEnd = 15 * 60 + 30;
  const trading = isTradingDay(istDate, extraHolidays);

  const nextOpen = nextSessionOpen(istDate, extraHolidays);
  const nextCloseToday = new Date(istDate);
  nextCloseToday.setHours(15, 30, 0, 0);

  const isHol = isHolidayDate(ymd(istDate), extraHolidays);
  const isWknd = isWeekend(istDate);

  if (!trading) {
    return {
      isOpen: false,
      isPreOpen: false,
      isHoliday: isHol,
      isWeekend: isWknd,
      session: 'CLOSED',
      nextSessionText: `Opens ${nextOpen.label}`,
      currentTimeIST: `${timeStr} IST`,
      nextOpenAt: nextOpen.iso,
      isHoliday: isHolidayDate(ymd(istDate), extraHolidays),
      nextOpenTime: nextOpen.iso,
      nextCloseTime: undefined,
      canPlaceAmo: true,
      squareOffWindow: false,
    };
  }

  if (timeInMinutes >= preMarketStart && timeInMinutes < marketStart) {
    return {
      isOpen: false,
      isPreOpen: true,
      isHoliday: false,
      isWeekend: false,
      session: 'PRE_MARKET',
      nextSessionText: 'Regular Session Opens at 09:15 AM IST',
      currentTimeIST: `${timeStr} IST`,
      nextOpenAt: isoToday(istDate, 9, 15),
      nextCloseAt: isoToday(istDate, 15, 30),
      nextOpenTime: isoToday(istDate, 9, 15),
      nextCloseTime: isoToday(istDate, 15, 30),
      canPlaceAmo: false,
      squareOffWindow: false,
    };
  }

  if (timeInMinutes >= marketStart && timeInMinutes <= marketEnd) {
    return {
      isOpen: true,
      isPreOpen: false,
      isHoliday: false,
      isWeekend: false,
      session: 'OPEN',
      nextSessionText: 'Closes at 03:30 PM IST',
      currentTimeIST: `${timeStr} IST`,
      nextCloseAt: isoToday(istDate, 15, 30),
      nextCloseTime: isoToday(istDate, 15, 30),
      canPlaceAmo: false,
      squareOffWindow: timeInMinutes >= squareOff,
    };
  }

  if (timeInMinutes > marketEnd && timeInMinutes < 16 * 60) {
    return {
      isOpen: false,
      isPreOpen: false,
      isHoliday: false,
      isWeekend: false,
      session: 'POST_MARKET',
      nextSessionText: `Opens ${nextOpen.label}`,
      currentTimeIST: `${timeStr} IST`,
      nextOpenAt: nextOpen.iso,
      nextOpenTime: nextOpen.iso,
      canPlaceAmo: true,
      squareOffWindow: false,
    };
  }

  return {
    isOpen: false,
    isPreOpen: false,
    isHoliday: false,
    isWeekend: false,
    session: 'CLOSED',
    nextSessionText: `Opens ${nextOpen.label}`,
    currentTimeIST: `${timeStr} IST`,
    nextOpenAt: nextOpen.iso,
    nextOpenTime: nextOpen.iso,
    canPlaceAmo: true,
    squareOffWindow: false,
  };
}

function isoToday(istDate: Date, h: number, m: number) {
  const d = new Date(istDate);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function nextSessionOpen(istDate: Date, extraHolidays: string[]) {
  const cursor = new Date(istDate);
  const mins = cursor.getHours() * 60 + cursor.getMinutes();
  if (isTradingDay(cursor, extraHolidays) && mins < 9 * 60 + 15) {
    cursor.setHours(9, 15, 0, 0);
    return { iso: cursor.toISOString(), label: 'today at 09:15 AM IST' };
  }
  for (let i = 1; i <= 10; i++) {
    cursor.setDate(cursor.getDate() + (i === 1 ? 1 : 1));
    if (i > 1) {
      /* already incremented */
    }
    const d = new Date(istDate);
    d.setDate(istDate.getDate() + i);
    if (isTradingDay(d, extraHolidays)) {
      const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      d.setHours(9, 15, 0, 0);
      return { iso: d.toISOString(), label: `${names[d.getDay()]} at 09:15 AM IST` };
    }
  }
  return { iso: undefined, label: 'next trading day at 09:15 AM IST' };
}
