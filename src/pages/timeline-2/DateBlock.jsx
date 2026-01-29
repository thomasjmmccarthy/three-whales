import { useMemo } from "react";
import { LANE_WIDTH, LANES, WHALES } from "./TimelineConstants";
import { getInitialX, getLaneOffset, getLaneX, pointsToQuadraticPath } from "./Helpers";
import { useNavigate } from "react-router-dom";

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function DateBlock({
  i, dateKey, posts, 
  xEntry, xExit, entryOffset, exitOffset, 
  highlighted, handleHighlightEnter, handleHighlightExit, 
  getNextPosts, is,
  newYear, newMonth
}) {

  const blockHeight = 80;
  const stationY = 15;
  const turnY = stationY + 35;
  const viewWidth = 180;
  const cornerRounding = 15.5;

  const navigate = useNavigate();

  // Turn the provided parameters into graphic data
  let { stations, lineCoords } = useMemo(() => { return getGraphData(i, posts, xEntry, xExit, entryOffset, exitOffset, blockHeight, stationY, turnY, getNextPosts); });

  function useDashedLine(w) {
    let hasStation = false;
    for(const s of stations) {
      if(s.post.whales.includes(w)) hasStation = true;
    }
    let outOfLane = LANES[w] !== xEntry[w];
    return (outOfLane && !hasStation);
  }

  return (
    <div className='relative w-full flex justify-center' key={dateKey}>
      <div className='relative flex h-full'>
        <div className='relative w-2 shrink-0 h-full'>
          {(newYear || newMonth) && (
            <div>
              <h2 className={`select-none text-[#e5e5e5] -rotate-90 ${newYear ? 'mt-9' : 'mt-6'}`} style={{fontSize: newYear ? '40px' : '20px'}}>
                {newYear
                  ? dateKey.slice(0, 4)
                  : MONTHS[parseInt(dateKey.slice(5, 7), 10) - 1]}
              </h2>
            </div>
          )}
        </div>
        <svg 
          className='w-auto h-35 block -mb-0.5'
          viewBox={`-12 0 ${viewWidth + 24} ${blockHeight}`}
          preserveAspectRatio='xMidYMid meet'
          onClick={() => {
            if(!is('md')) handleHighlightExit();
          }}
        >
          {/* Guide line for date level */}
          <line 
            x1='0'
            y1={stationY}
            x2={viewWidth}
            y2={stationY}
            stroke='rgba(0,0,0,0.05)'
            strokeWidth='1'
          />

          {/* Whale Lines */}
          {WHALES.map((w) => (
            <path 
              key={w}
              d={pointsToQuadraticPath(lineCoords[w], cornerRounding, w, getCurrentPost(w, stations), getNextPosts(i)[w])}
              fill='none'
              stroke={window.getComputedStyle(document.documentElement).getPropertyValue(`--whale-${w}`)}
              strokeWidth={LANE_WIDTH}
              strokeOpacity={
                useDashedLine(w)
                ? 0.5
                : 1
              }
              strokeDasharray={useDashedLine(w) ? '1 8 0' : 'none'}
              strokeLinecap='round'
            />
          ))}

          {/* Stations */}
          {stations.map((s) => {
            const isHighlighted = highlighted && s.post.uid === highlighted.post.uid;
            return(
              <circle
                key={s.post.uid}
                cx={s.x}
                cy={s.y}
                r={isHighlighted ? '11' : '9'}
                fill={isHighlighted ? '#fdcb6e' : 'white'}
                stroke='rgba(0,0,0.35)'
                strokeWidth='2'
                className='cursor-pointer transition-all drop-shadow-black/20 drop-shadow-[0px_0px_2px] duration-150 hover:drop-shadow-white/90'
                onMouseEnter={() => {if(is('md')) handleHighlightEnter(s)}}
                onMouseLeave={() => {if(is('md')) handleHighlightExit()}}
                onClick={(e) => {
                  e.stopPropagation();
                  if(is('md')) navigate(`/timeline/${s.post.uid}`);
                  else handleHighlightEnter(s);
                }}
              />
            )
          }
        )}
        </svg>
        <div className='relative w-2' />
      </div>
    </div>
  )
}



//
// HELPERS
//

function getGraphData(i, posts, xEntry, xExit, entryOffset, exitOffset, blockHeight, stationY, turnY, getNextPosts) {

  // Get station X positions
  let stations = posts.map((p) => {
    return { 
      post: p, 
      x: getLaneX(p.whales), 
      y: stationY, 
    }
  });

  // calculate the points for each whale's line
  let lineCoords = {};

  for(const w of WHALES) {
    lineCoords[w] = [];
    let startX;

    if(xEntry[w]) {
      // Has an entry line - add coordinates going from
      // top of block down to station height
      startX = xEntry[w] + entryOffset[w];
      lineCoords[w].push([startX, 0]);
    } else {
      // Has no entry line.
      // If the line's first station is in this block,
      // getInitialX will return a start X (with offset)
      // Otherwise null.
      startX = getInitialX(stations, w);
    }

    // if startX !== null and there is an exit line,
    // then we can add points to represent it
    if(startX) {
      lineCoords[w].push([startX, stationY]);
    }

    // TO DELETE const leavesAlone = (w !== 'green' && entryOffset[w] !== null && entryOffset[w] === 0)

    if(xExit[w]) {
      let endX = xExit[w] + exitOffset[w];
      // Determine whether or not the lane is turning left or right
      const turnOffset = getTurnOffset(w, startX, xExit[w], entryOffset[w], exitOffset[w], getCurrentPost(w, stations), getNextPosts(i)[w]);
      lineCoords[w].push([startX, turnY + turnOffset]);
      lineCoords[w].push([endX,   turnY + turnOffset]);
      lineCoords[w].push([endX, blockHeight]);
    }
  }

  return { stations, lineCoords }
}

function getCurrentPost(whale, stations) {
  for(const s of stations) {
    if(s.post.whales.includes(whale)) return s.post;
  }
  return null;
}

function getTurnOffset(w, entryX, exitX, entryOffset, exitOffset, currentPost, nextPost) {
  
  if(!currentPost) return 0;

  const leftTurn = exitX < entryX;
  let turnOffset;

  if((nextPost && nextPost.whales.length < currentPost.whales.length)) {
    turnOffset = leftTurn ? exitOffset : -exitOffset;
  }
  else {
    if(entryOffset) {
      turnOffset = leftTurn ? entryOffset : (0-entryOffset);
    }
    else {
      const filteredWhales = WHALES.filter((j) => {currentPost.whales.includes(j)})
      let index = 0;
      for(let i=0; i<filteredWhales.length; i++) {
        if(filteredWhales[i] === w) index = i;
      }
      turnOffset = getLaneOffset(currentPost.whales.length, index);
    }
  }
  
  return turnOffset;
}