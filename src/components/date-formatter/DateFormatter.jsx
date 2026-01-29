const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

const daySuffixes = [
  [['1', '21', '31'], 'st'],
  [['2', '22'], 'nd'],
  [['3', '23'], 'rd']
]

function getSplitDate(datetime) {
  const splitDatetime = datetime.slice(0,10).split('-');

  let day = splitDatetime[2];
  const month = splitDatetime[1];
  const year = splitDatetime[0];

  return { day, month, year }
}

export function getFormattedDate(datetime) {
  
  let { day, month, year } = getSplitDate(datetime);

  if(Array.from(day)[0] === '0') day = day.slice(1, 2);

  let suffix = 'th';
  for(const ds of daySuffixes) {
    if(ds[0].includes(day)) suffix = ds[1];
  }

  return `${day}${suffix} ${months[parseInt(month)-1]} ${year}`
}

export function getShortFormattedData(datetime) {
  let { day, month, year } = getSplitDate(datetime);
  return `${day}/${month}/${year}`;
}