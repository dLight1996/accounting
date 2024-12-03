import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// 扩展 dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

// 设置默认时区
dayjs.tz.setDefault('Asia/Shanghai');

export interface MonthRange {
  startDate: Date;
  endDate: Date;
  lastMonthStart: Date;
  lastMonthEnd: Date;
  currentMonth: string; // 格式：YYYY-MM
}

export interface DateRange {
  start: string;
  end: string;
}

/**
 * 获取指定日期所属的"月份"（26号到25号为一个月）
 * @param date 指定日期
 * @returns 所属月份（YYYY-MM格式）
 */
export function getMonthByDate(date: Date): string {
  const day = dayjs(date);
  const dayOfMonth = day.date();
  
  // 如果日期小于等于25号，属于上个月的统计周期
  // 例如：11月15号属于10月26号到11月25号这个周期，所以返回10月
  if (dayOfMonth <= 25) {
    return day.subtract(1, 'month').format('YYYY-MM');
  }
  return day.format('YYYY-MM');
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

  // 对于任意月份，统计周期都是本月26号到下月25号
  // 例如：11月的统计周期是11月26号到12月25号
  // 所以要往前推一个月，这样11月的数据就会显示在10月的统计周期里
  const startDate = dayjs(new Date(year, month, 26)).startOf('day');
  const endDate = dayjs(new Date(year, month + 1, 25)).endOf('day');

  // 上月的日期范围（上一个26-25周期）
  const lastMonthStart = dayjs(new Date(year, month - 1, 26)).startOf('day');
  const lastMonthEnd = dayjs(new Date(year, month, 25)).endOf('day');

  console.log('=== Month Range Calculation ===');
  console.log('Input date:', {
    date: currentDay.format('YYYY-MM-DD'),
    year,
    month: month + 1,
  });
  console.log('Current period:', {
    start: startDate.format('YYYY-MM-DD HH:mm:ss'),
    end: endDate.format('YYYY-MM-DD HH:mm:ss'),
  });
  console.log('Last period:', {
    start: lastMonthStart.format('YYYY-MM-DD HH:mm:ss'),
    end: lastMonthEnd.format('YYYY-MM-DD HH:mm:ss'),
  });
  console.log('=== Calculation Complete ===');

  return {
    startDate: startDate.toDate(),
    endDate: endDate.toDate(),
    lastMonthStart: lastMonthStart.toDate(),
    lastMonthEnd: lastMonthEnd.toDate(),
    currentMonth: currentDay.format('YYYY-MM'),
  };
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

/**
 * 获取指定月份的库存日期范围（上月26号到本月25号）
 * @param month dayjs对象，表示选择的月份
 * @returns 日期范围对象，包含start和end
 */
export function getInventoryDateRange(month: dayjs.Dayjs): DateRange {
  // 确保我们使用当前年份
  const now = dayjs();
  let targetMonth = month.year(now.year());
  
  // 如果选择的月份大于当前月份，说明是去年的月份
  if (targetMonth.month() > now.month()) {
    targetMonth = targetMonth.subtract(1, 'year');
  }

  // 设置为当地时间的开始和结束
  const start = targetMonth.date(26).subtract(1, 'month').startOf('day').format('YYYY-MM-DD');
  const end = targetMonth.date(25).endOf('day').format('YYYY-MM-DD');

  console.log('Date range calculation:', {
    input: month.format('YYYY-MM-DD HH:mm:ss'),
    now: now.format('YYYY-MM-DD HH:mm:ss'),
    targetMonth: targetMonth.format('YYYY-MM-DD HH:mm:ss'),
    start,
    end,
  });

  return { start, end };
}

/**
 * 获取格式化的日期范围字符串
 * @param range 日期范围对象
 * @returns 格式化的日期范围字符串，如：2024-10-26 ~ 2024-11-25
 */
export function formatDateRange(range: DateRange): string {
  return `${range.start} ~ ${range.end}`;
}
