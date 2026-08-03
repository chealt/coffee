const millisecondsPerDay = 1000 * 60 * 60 * 24;
const calculateDifference = ({ from, to }) => {
  const fromDate = new Date(from);
  const toDate = to ? new Date(to) : new Date();

  const fromDateUTC = Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const toDateUTC = Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());

  return Math.floor((toDateUTC - fromDateUTC) / millisecondsPerDay);
};

export { calculateDifference };
