import React, { useMemo } from 'react';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { isHoliday, isWorkingDay } from '../utils/dateCalculations';
import { companyHolidays } from '../utils/defaultData';

export const Timeline = ({ activities }) => {
  const timelineData = useMemo(() => {
    const validActivities = activities.filter(a => a.startDate && a.endDate);
    if (validActivities.length === 0) return null;

    let minDate = parseISO(validActivities[0].startDate);
    let maxDate = parseISO(validActivities[0].endDate);

    validActivities.forEach(act => {
      const start = parseISO(act.startDate);
      const end = parseISO(act.endDate);
      if (start < minDate) minDate = start;
      if (end > maxDate) maxDate = end;
    });

    // Add a few days padding
    minDate = addDays(minDate, -2);
    maxDate = addDays(maxDate, 4);

    const totalDays = differenceInDays(maxDate, minDate) + 1;
    const days = [];
    for (let i = 0; i < totalDays; i++) {
      const current = addDays(minDate, i);
      const isWeekend = !isWorkingDay(current) && !isHoliday(current);
      const isHol = isHoliday(current);
      const holidayData = isHol ? companyHolidays.find(h => h.date === format(current, 'yyyy-MM-dd')) : null;
      
      days.push({
        date: current,
        isWeekend,
        isHoliday: isHol,
        holidayName: holidayData ? holidayData.description : ''
      });
    }

    return { minDate, maxDate, totalDays, days, validActivities };
  }, [activities]);

  if (!timelineData) return <div className="card"><p>No valid timeline data to display.</p></div>;

  // Generate a unique string to force a full re-render of the grid when dates change,
  // preventing any browser CSS Grid layout caching or visual sync glitches.
  const gridKey = JSON.stringify(timelineData.validActivities.map(a => `${a.id}-${a.startDate}-${a.endDate}-${a.name}`));

  return (
    <section className="card timeline-section">
      <h2>Timeline Visualization</h2>
      <div className="timeline-container">
        <div 
          key={gridKey}
          className="timeline-grid" 
          style={{ gridTemplateColumns: `250px repeat(${timelineData.totalDays}, minmax(30px, 1fr))` }}
        >
          
          {/* Header Row */}
          <div className="timeline-header-cell sticky-left">Activity</div>
          {timelineData.days.map((day, idx) => (
            <div 
              key={idx} 
              className={`timeline-header-cell date-cell ${day.isWeekend ? 'weekend' : ''} ${day.isHoliday ? 'holiday' : ''}`}
              title={day.isHoliday ? day.holidayName : ''}
            >
              <div className="day-name">{format(day.date, 'EE')}</div>
              <div className="day-number">{format(day.date, 'd')}</div>
              <div className="month-name">{format(day.date, 'MMM')}</div>
            </div>
          ))}

          {/* Activity Rows */}
          {timelineData.validActivities.map((act, actIdx) => {
            const start = parseISO(act.startDate);
            const end = parseISO(act.endDate);
            const startOffset = differenceInDays(start, timelineData.minDate);
            const duration = differenceInDays(end, start) + 1;
            const currentRow = actIdx + 2;

            return (
              <React.Fragment key={act.id}>
                <div className="timeline-activity-name sticky-left" style={{ gridRow: currentRow, gridColumn: 1 }}>
                  {act.name}
                </div>
                
                {/* Background Grid Cells */}
                {timelineData.days.map((day, idx) => (
                  <div 
                    key={`bg-${idx}`} 
                    className={`timeline-bg-cell ${day.isWeekend ? 'weekend' : ''} ${day.isHoliday ? 'holiday' : ''}`}
                    style={{ gridRow: currentRow, gridColumn: idx + 2 }}
                  ></div>
                ))}
                
                {/* Overlay Bar */}
                <div 
                  className="timeline-bar-wrapper" 
                  style={{ 
                    gridColumn: `${startOffset + 2} / span ${duration}`,
                    gridRow: currentRow
                  }}
                >
                  <div className="timeline-bar">
                    <span className="bar-label">{act.mandays} days</span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
};
