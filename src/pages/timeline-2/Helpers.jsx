import { LANE_WIDTH, LANES, OFFSET_MULTIPLIERS } from "./TimelineConstants";

// Groups an array of posts by their date
export function groupPostsByDate(posts) {
  const dateGroups = [];
  for(const p of posts) {
    const date = p.datetime.slice(0, 10);
    if(dateGroups.length > 0 && dateGroups[dateGroups.length-1].date === date) dateGroups[dateGroups.length-1].posts.push(p);
    else dateGroups.push({date: date, posts: [p]});
  }
  return dateGroups;
}


export function getLaneX(whales) {
  if(whales.length === 3) return LANES['green'];
    if(whales.length === 1) return LANES[whales[0]];
  else {
    // If using the middle whale (green), always go the side of the other whale
    if(whales.includes('green')) {
      if(whales.includes('blue')) return LANES['leftMid'];
      else return LANES['rightMid'];
    }
    // If not, choose leftMid
    return LANES['leftMid'];
  }
}


export function getLaneOffset(totalWhales, i) {
  return OFFSET_MULTIPLIERS[totalWhales][i] * LANE_WIDTH;
}


// Used when getting the x pos and x offset for the
// first station in which a whale appears
export function getInitialX(stations, whale) {
  let x;
  let offset;

  for(const s of stations) {
    for(let i = 0; i < s.post.whales.length; i++) {
      if(s.post.whales[i] === whale) {
        x = getLaneX(s.post.whales);
        offset = getLaneOffset(s.post.whales.length, i);
        return (x + offset);
      }
    }
  }

  return null;
}


export function pointsToQuadraticPath(points, radius = 14, whale, currentPost, nextPost) {

  if (!points || points.length < 2) return "";

  let d = `M ${points[0][0]} ${points[0][1]}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    // last segment → just line
    if (i === points.length - 1) {
      d += ` L ${curr[0]} ${curr[1]}`;
      continue;
    }

    const next = points[i + 1];

    // If no corner (colinear), just line through
    const v1 = unitVec(curr, prev); // note reversed for corner math
    const v2 = unitVec(curr, next);

    // colinear if direction doesn't change (dot ≈ ±1)
    const dot = v1[0] * v2[0] + v1[1] * v2[1];
    const isCorner = Math.abs(dot) < 0.999;

    if (!isCorner) {
      d += ` L ${curr[0]} ${curr[1]}`;
      continue;
    }

    const cross = v1[0] * v2[1] - v1[1] * v2[0];

    // Adjust radius based on turns
    let newRadius = radius;
    if(currentPost) {
      const currentWhales = currentPost.whales;
      const leftTurn = cross > 0;
      if(currentWhales.length === 2){
        // Determine if this whale is on the left or right
        if(
          leftTurn && currentWhales[1] === whale ||
          !leftTurn && currentWhales[0] === whale
        ) newRadius = radius * 0.6;
      }
      else if(nextPost) {
        const nextWhales = nextPost.whales;
        if(nextWhales.length === 2) {
          if(
            leftTurn && nextWhales[1] === whale ||
            !leftTurn && nextWhales[0] === whale
          ) newRadius = radius * 0.6;
        }
      }
    }

    // Limit radius so we don't overshoot short segments
    const r = Math.min(newRadius, dist(prev, curr) / 2, dist(curr, next) / 2);

    // points where the curve begins/ends around the corner
    const inDir = unitVec(curr, prev);  // direction from curr to prev
    const outDir = unitVec(curr, next); // direction from curr to next

    const p1 = [curr[0] + inDir[0] * r, curr[1] + inDir[1] * r];   // back along incoming
    const p2 = [curr[0] + outDir[0] * r, curr[1] + outDir[1] * r]; // forward along outgoing

    d += ` L ${p1[0]} ${p1[1]} Q ${curr[0]} ${curr[1]} ${p2[0]} ${p2[1]}`;
  }

  return d;
}

function dist(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.hypot(dx, dy);
}

function unitVec(from, to) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len];
}


export function getWhaleColour(name) {
  return window.getComputedStyle(document.documentElement).getPropertyValue(`--whale-${name}`)
}