import { addDays, isSaturday, isSunday, format, parseISO } from 'date-fns';

import { companyHolidays } from './defaultData';

export const isHoliday = (date) => {
  const dateString = format(date, 'yyyy-MM-dd');
  return companyHolidays.some(h => h.date === dateString);
};

export const isWorkingDay = (date) => {
  if (isSaturday(date) || isSunday(date)) return false;
  if (isHoliday(date)) return false;
  return true;
};

export const getNextWorkingDay = (date) => {
  let nextDate = date;
  while (!isWorkingDay(nextDate)) {
    nextDate = addDays(nextDate, 1);
  }
  return nextDate;
};

export const calculateEndDate = (startDate, mandays) => {
  if (!mandays || mandays <= 0) return null;
  
  let currentDate = startDate;
  
  // If start date is not a working day, move to next working day
  if (!isWorkingDay(currentDate)) {
    currentDate = getNextWorkingDay(currentDate);
  }
  
  let countedDays = 1;
  let endDate = currentDate;
  
  while (countedDays < mandays) {
    endDate = addDays(endDate, 1);
    if (isWorkingDay(endDate)) {
      countedDays++;
    }
  }
  
  return endDate;
};

export const calculateWorkingDaysBetween = (startDate, endDate) => {
  let count = 0;
  let currentDate = startDate;
  
  while (currentDate <= endDate) {
    if (isWorkingDay(currentDate)) {
      count++;
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return count;
};
