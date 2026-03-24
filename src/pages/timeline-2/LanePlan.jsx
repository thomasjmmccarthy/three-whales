import { getLaneOffset, getLaneX } from "./Helpers";
import { WHALES } from "./TimelineConstants";

/*
  Creates and returns a LanePlan.
  A LanePlan contains two distinctive points of information:
  - xEntries      : details the entry points of a whale's line into each block.
                    [...{blue: x, green: x, purple: x},...]
  - xExits        : details the exit points of a whale's lane into each block.
                    [...{blue: x, green: x, purple: x},...]
  - entryOffsets  : details the offsets of the entry lines for each block.
                    [...{blue: x, green: x, purple: x},...]
  - exitOffsets   : details the offsets of the exit lines for each block.
                    [...{blue: x, green: x, purple: x},...]
*/
export function LanePlan(dateGroups) {

  const xEntries = [];
  const xExits = [];
  const entryOffsets = [];
  const exitOffsets = [];

  let firstStationMet = { blue: false, green: false, purple: false };

  for(let i = 0; i < dateGroups.length; i++) {

    function getLastFrom(array) { return(i==0) ? {blue:null, green:null, purple:null} : array[i-1] };

    // Entry values are the same as the last group's exit values   
    const xEntry = { ...getLastFrom(xExits) };
    const entryOffset = { ...getLastFrom(exitOffsets) };

    // Exit values are same as entrance values by default
    const xExit = { ...xEntry };
    const exitOffset = { ...entryOffset }
    
    // OLD LOGIC:
    // Lines only turn after stations. So xExit only needs to be recalculated if
    // there is a station in this block. Otherwise it should carry on straight.
    // const posts = dateGroups[i].posts;
    // let hasStation = { blue: false, green: false, purple: false };
    // for(const p of posts) {
    //   for(const w of WHALES) {
    //     hasStation[w] = hasStation[w] || p.whales.includes(w);
    //   }
    // }

    // Lines turn under the conditions:
    // A: there is a station in the next block that occupies this whale's current lane, but does not include this whale
    // B: there is a station in the next block for the current whale
    const posts = dateGroups[i].posts;
    const nextPosts = dateGroups[i+1]?.posts ?? [];
    const currentLane = { ...xEntry };

    let shouldTurn = { blue: false, green: false, purple: false }

    for(const w of WHALES) {

      for(const p of posts) {
        firstStationMet[w] = firstStationMet[w] || p.whales.includes(w);
      }

      if (!xEntry[w] && firstStationMet[w]) {
        const postsWithWhale = posts.find(p => p.whales.includes(w));
        if (postsWithWhale) {
          const ws = postsWithWhale.whales;
          const j = ws.indexOf(w);

          xExit[w] = getLaneX(ws);
          exitOffset[w] = getLaneOffset(ws.length, j);
          continue;
        }
      }

      // Determine if the whale needs to turn for the next block
      for(const p of nextPosts) {
        const ws = p.whales;
        const nextX = getLaneX(ws);

        if(firstStationMet[w]) {
          // CONDITION B - next block has a station for this whale
          if(ws.includes(w)) {
            shouldTurn[w] = true;
            break;
          }

          // CONDITION A - next block uses this lane for other whales
          if(nextX === currentLane[w]) {
            shouldTurn[w] = true;
            break;
          }
        }
      }

    }
    
    // Recalculate the exit values for the relevant whales
    for(const w of WHALES) {
      if(shouldTurn[w]) {
        const { nextX, nextOffset } = getNextX(w, dateGroups, i);
        xExit[w] = nextX;
        exitOffset[w] = nextOffset;
      }
    }

    // Append this blocks details to the lists
    xEntries.push(xEntry);
    xExits.push(xExit);
    entryOffsets.push(entryOffset);
    exitOffsets.push(exitOffset);
  }

  return {xEntries, xExits, entryOffsets, exitOffsets};
}


//
// HELPERS
//


function getNextX(w, dateGroups, start) {

  let x;
  let offset;

  // Find the next post featuring this whale
  for(let i = start+1; i < dateGroups.length; i++) {
    const posts = dateGroups[i].posts;

    for(const p of posts) {
      const ws = p.whales;

      for(let j = 0; j < ws.length; j++) {
        if(ws[j] === w) {
          x = getLaneX(ws);
          offset = getLaneOffset(ws.length, j);
          return { nextX: x, nextOffset: offset };
        }
      }
    }
  }

  // If there is no next station, don't continue the lines
  return { nextX: null, nextOffset: null }

}