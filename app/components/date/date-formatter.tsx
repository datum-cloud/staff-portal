import { useApp } from '@/providers/app.provider';
import { parseISO, isValid, format as formatDate } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

type Props = {
  date?: string | Date;
  withTime?: boolean | 'short';
  format?: string;
  fallback?: string;
  withGMT?: boolean; // when formatting with a timezone, append GMT offset suffix (default: true)
};

const DateFormatter = ({
  date,
  withTime,
  format = 'MMM dd, yyyy',
  fallback = 'Invalid Date',
  withGMT = true,
}: Props) => {
  const { settings } = useApp();
  let parsedDate: Date;

  if (!date) {
    return null;
  }

  if (typeof date === 'string') {
    parsedDate = parseISO(date);
  } else {
    parsedDate = date;
  }

  if (!isValid(parsedDate)) {
    return <span>{fallback}</span>;
  }

  if (withTime) {
    if (withTime === 'short') {
      format = 'MMM dd yyyy, h:mm a';
    } else {
      format = 'EEE, MMM dd yyyy, h:mm a';
    }
  }

  // When a timezone is provided in settings, format in that timezone and append GMT offset
  const timeZone = settings?.timezone;

  if (timeZone) {
    // Format in the user's timezone
    const formattedDate = formatInTimeZone(parsedDate, timeZone, format);

    // Get the timezone offset for the suffix
    if (withGMT) {
      const offset = formatInTimeZone(parsedDate, timeZone, 'xxx'); // Returns format like "+07:00" or "-05:00"
      const tzSuffix = ` GMT${offset}`;
      return <span>{`${formattedDate}${tzSuffix}`}</span>;
    }

    return <span>{formattedDate}</span>;
  }

  return <span>{formatDate(parsedDate, format)}</span>;
};

export default DateFormatter;
