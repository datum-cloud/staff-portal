import { parseISO, isValid, format as formatDate } from 'date-fns';

type Props = {
  date: string | Date;
  withTime?: boolean | 'short';
  format?: string;
  fallback?: string;
};

const DateFormatter = ({
  date,
  withTime,
  format = 'MMM dd, yyyy',
  fallback = 'Invalid Date',
}: Props) => {
  let parsedDate: Date;

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

  return <span>{formatDate(parsedDate, format)}</span>;
};

export default DateFormatter;
