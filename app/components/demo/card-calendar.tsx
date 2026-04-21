'use client';

import { Calendar } from '@datum-cloud/datum-ui/calendar';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { addDays } from 'date-fns';

const start = new Date(2025, 5, 5);

export function CardsCalendar() {
  return (
    <Card className="hidden max-w-[260px] p-0 sm:flex">
      <CardContent className="p-0">
        <Calendar
          numberOfMonths={1}
          mode="range"
          defaultMonth={start}
          selected={{
            from: start,
            to: addDays(start, 8),
          }}
        />
      </CardContent>
    </Card>
  );
}
