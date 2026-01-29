
export function getPoints(posts) {

  let points = 0;
  let whalesSeen = [];

  posts.forEach((p) => {
    p.whales.forEach((w) => {if(!whalesSeen.includes(w)) whalesSeen.push(w)});
    points += (1 + ((p.whales.length-1) * 2));
  })

  const multiplier = Math.max(1, whalesSeen.length);

  return (points * multiplier);
  
}

export function getAnnualPoints(posts, year=null) {

  let currentYear = year ? year.toString() : new Date().getFullYear().toString();
  const annualPosts = posts.filter(x => x.datetime.slice(0, 4) === currentYear);

  return getPoints(annualPosts);

}

export function getAllTimePoints(posts) {

  const year = new Date().getFullYear();
  const startYear = 2026;

  let points = 0;
  for(let i = year; i >= startYear; i--) {
    points += getAnnualPoints(posts, i);
  }

  return points;

}