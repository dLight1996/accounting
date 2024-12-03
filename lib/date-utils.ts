import dayjs from 'dayjs';

export interface MonthRange {
  startDate: Date;
  endDate: Date;
  lastMonthStart: Date;
  lastMonthEnd: Date;
  currentMonth: string; // 格式：YYYY-MM
}

/**
 * 获取指定月份的日期范围（26号到25号）
 * @param date 指定日期，默认为当前日期
 * @returns 月份范围信息
 */
export function getMonthRange(date: Date = new Date()): MonthRange {
  const currentDay = dayjs(date);
  const year = currentDay.year();
  const month = currentDay.month(); // 0-11

  // 对于任意月份，统计周期都是上月26号到本月25号
  // 例如：12月的统计周期是11月26号到12月25号
  const startDate = dayjs(new Date(year, month - 1, 26)).startOf('day');
  const endDate = dayjs(new Date(year, month, 25)).endOf('day');

  // 上月的日期范围（上一个26-25周期）
  const lastMonthStart = dayjs(new Date(year, month - 2, 26)).startOf('day');
  const lastMonthEnd = dayjs(new Date(year, month - 1, 25)).endOf('day');

  return {
    startDate: startDate.toDate(),
    endDate: endDate.toDate(),
    lastMonthStart: lastMonthStart.toDate(),
    lastMonthEnd: lastMonthEnd.toDate(),
    currentMonth: currentDay.format('YYYY-MM'),
  };
}

/**
 * 获取指定日期所属的"月份"（26号到25号为一个月）
 * @param date 指定日期
 * @returns 所属月份（YYYY-MM格式）
 */
export function getMonthByDate(date: Date): string {
  const day = dayjs(date);
  if (day.date() <= 25) {
    return day.subtract(1, 'month').format('YYYY-MM');
  }
  return day.format('YYYY-MM');
}

/**
 * 检查日期是否在指定的月份范围内
 * @param date 要检查的日期
 * @param monthDate 月份中的任意一天
 * @returns 是否在月份范围内
 */
export function isDateInMonth(date: Date, monthDate: Date): boolean {
  const { startDate, endDate } = getMonthRange(monthDate);
  const checkDate = dayjs(date);
  return checkDate.isAfter(dayjs(startDate)) && checkDate.isBefore(dayjs(endDate));
}

/**
 * 获取相对于指定月份的偏移月份范围
 * @param monthOffset 月份偏移量（正数为往后，负数为往前）
 * @param baseDate 基准日期，默认为当前日期
 * @returns 月份范围信息
 */
export function getOffsetMonthRange(monthOffset: number, baseDate: Date = new Date()): MonthRange {
  const offsetDate = dayjs(baseDate).add(monthOffset, 'month').toDate();
  return getMonthRange(offsetDate);
}
