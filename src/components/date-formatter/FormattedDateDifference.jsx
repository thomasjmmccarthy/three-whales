export function getFormattedDateDifference(dtStr, now = new Date()) {
  const [Y, M, D, HM] = dtStr.split("-");      // YYYY MM DD HH:MM
  const [H, Min] = HM.split(":");

  const postDate = new Date(
    Number(Y),
    Number(M) - 1,
    Number(D),
    Number(H),
    Number(Min),
    0,
    0
  );

  // If year differs: "day<suffix> month year"
  if (postDate.getFullYear() !== now.getFullYear()) {
    return `${postDate.getDate()}${ordinal(postDate.getDate())} ${monthName(
      postDate
    )} ${postDate.getFullYear()}`;
  }

  const diffMs = now - postDate;
  const diffSec = Math.floor(diffMs / 1000);

  // Future dates (if any) – treat as "0 seconds ago" or adjust as you like
  if (diffSec < 0) return "0 seconds ago";

  if (diffSec < 60) {
    return `${diffSec} second${diffSec === 1 ? "" : "s"} ago`;
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  }

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  }

  const diffDay = Math.floor(diffHr / 24);

  // "x days ago" for < 1 month (~30 days)
  if (diffDay < 30) {
    return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  }

  // Month logic for same-year dates
  const monthsDiff =
    (now.getFullYear() - postDate.getFullYear()) * 12 +
    (now.getMonth() - postDate.getMonth());

  if (monthsDiff < 2) {
    return "Last month";
  }

  // Otherwise: "day<suffix> month"
  return `${postDate.getDate()}${ordinal(postDate.getDate())} ${monthName(
    postDate
  )}`;
}

function monthName(d) {
  return d.toLocaleString("en-GB", { month: "long" });
}

function ordinal(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}
