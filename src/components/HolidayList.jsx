import React from 'react';
import { companyHolidays } from '../utils/defaultData';
import { format, parseISO } from 'date-fns';

export const HolidayList = () => {
  return (
    <section className="card holiday-list">
      <h2>Company Holidays (2026)</h2>
      <div className="holiday-grid">
        {companyHolidays.map((holiday, idx) => (
          <div key={idx} className="holiday-item">
            <span className="holiday-date">{format(parseISO(holiday.date), 'dd MMM yyyy')}</span>
            <span className="holiday-name">{holiday.description}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
