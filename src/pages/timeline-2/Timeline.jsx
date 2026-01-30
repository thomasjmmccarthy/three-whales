import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getWhaleColour, groupPostsByDate } from "./Helpers";
import { collection, getDocs, limit, orderBy, query, startAfter, where } from "firebase/firestore";
import { db } from "../../firebase";
import { LanePlan } from "./LanePlan";
import { DateBlock } from "./DateBlock";
import { AnimatePresence, motion } from "motion/react";
import { WHALES } from "./TimelineConstants";
import { useTailwindScreen } from "../../components/screens/tailwind-screen/TailwindScreen";
import { getFormattedDate } from "../../components/date-formatter/DateFormatter";
import { TimelineLoader } from "../../components/loader/TimelineLoader";

import BlueWhale from '../../assets/whales/normal/blue.svg';
import GreenWhale from '../../assets/whales/normal/green.svg';
import PurpleWhale from '../../assets/whales/normal/purple.svg';
import { useNavigate } from "react-router-dom";


export default function Timeline({ selected, pageSize=20, whaleData }) {

  const [mousePos, setMousePos] = useState({x:0, y:0});

  const [highlighted, setHighlighted] = useState(null);
  const [posts, setPosts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [canOpen, setCanOpen] = useState(false);
  const OPEN_TIMER = 1500;

  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);
  const didInitRef = useRef(false);

  const { is } = useTailwindScreen();

  const dateGroups = useMemo(() => groupPostsByDate(posts), [posts]);

  const loadMore = useCallback(async () => {
    if(loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const base = [
        collection(db, 'posts'),
        where('draft', '==', false),
        orderBy('datetime', 'desc'),
        limit(pageSize)
      ];

      const q = lastDoc
      ? query(...base, startAfter(lastDoc))
      : query(...base);

      const snap = await getDocs(q);
      const newPosts = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      setPosts((prev) => [...prev, ...newPosts]);

      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      if(snap.size < pageSize) setHasMore(false);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [hasMore, lastDoc, pageSize]);

  function getNextPosts(start) {
    let nextStations = {blue: null, green: null, purple: null};

    for(let i=start+1; i<dateGroups.length; i++) {
      const dg = dateGroups[i];
      for(const p of dg.posts) {
        for(const w of WHALES) {
          if(nextStations[w] === null && p.whales.includes(w)) {
            nextStations[w] = p;
            // If all whales are found, return early
            if(!Object.values(nextStations).includes(null)) return nextStations;
          }
        }
      }
    }

    return nextStations;
  }

  const handleHighlightEnter = (s) => {
    setHighlighted(s);
  }

  const handleHighlightExit = () => {
    setHighlighted(null);
  }

  const handleMouseMove = (e) => {
    setMousePos({x: e.clientX, y: e.clientY});
  }

  const { 
    xEntries,
    xExits,
    entryOffsets,
    exitOffsets
  } = LanePlan(dateGroups);

  // Initial load
  useEffect(() => {
    if(didInitRef.current) return;
    didInitRef.current = true;
    loadMore();
  }, [loadMore]);

  // Infinite scroll trigger
  useEffect(() => {
    const el = sentinelRef.current;
    if(!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if(entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '800px' } // Start fetching before user hits bottom
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  // Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanOpen(true);
    }, OPEN_TIMER);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <AnimatePresence mode='wait'>
      { ((canOpen === false && !selected) || (xEntries.length === 0 && loading))
        ? <TimelineLoader key='loader' timer={OPEN_TIMER} />
        : (
          <motion.div
            key='timeline'
            initial={{opacity:0}}
            animate={{opacity:1}}
            transition={{duration: 0.25, ease: 'easeOut'}}
          >
            <motion.div
              className='w-full mb-10 min-h-50 md:h-25 md:min-h-0 md:mb-40 flex justify-center items-end'
              initial={{scale: 0.8, opacity: 0}}
              animate={{scale: 1, opacity: 1}}
              transition={{duration: 0.5, delay: 0.2, type:'spring'}}
            >
              <p className='text-[#aaa] select-none text-sm md:text-[16px]'>{is('md') ? 'Click on' : 'Tap'} a stop to see more</p>
            </motion.div>
            <div className={`relative w-full scale-85 md:scale-115 md:mb-10 ${(!is('md') && highlighted ? '-mb-10' : '-mb-30')}`} onMouseMove={handleMouseMove}> 
              {dateGroups.map((d, i) => {
                let newYear;
                let newMonth;
                if(i !== dateGroups.length - 1) {
                  const year = d.date.split('-')[0];
                  const month = d.date.split('-')[1];
                  newYear = year !== dateGroups[i+1].date.split('-')[0];
                  newMonth = newYear || month !== dateGroups[i+1].date.split('-')[1];
                };
                return (
                  <DateBlock
                    i={i}
                    key={d.date}
                    dateKey={d.date}
                    posts={d.posts}

                    xEntry={xEntries[i]}
                    xExit={xExits[i]}
                    entryOffset={entryOffsets[i]}
                    exitOffset={exitOffsets[i]}

                    highlighted={highlighted}
                    handleHighlightEnter={handleHighlightEnter}
                    handleHighlightExit={handleHighlightExit}

                    getNextPosts={getNextPosts}
                    is={is}

                    newYear={newYear}
                    newMonth={newMonth}
                  />
              )})}
            </div>

            <AnimatePresence>{(highlighted && is('md')) &&
              <HighlightCard highlighted={highlighted} mousePos={mousePos} whaleData={whaleData} />
            }</AnimatePresence>

            <AnimatePresence>{(highlighted && !selected && !is('md')) &&
              <HighlightCardMobile highlighted={highlighted} whaleData={whaleData} />
            }</AnimatePresence>
            <div ref={sentinelRef} className='h-10' />
          </motion.div>
        )
      }
    </AnimatePresence>
  )
}


function getWhaleName(whaleData, w) {
  for(const d of whaleData) {
    if(d.uid === w) return d.name;
  }
  return null;
}


function HighlightCard({highlighted, mousePos, whaleData}) {
  return (
    <motion.div 
      className='fixed z-20'
      style={{
        left: mousePos.x + 30,
        top: mousePos.y - 90
      }}
      initial={{opacity:0}}
      animate={{opacity:1}}
      exit={{opacity:0}}
      transition={{duration:0.15}}
    >
      <div
        className='absolute -left-2 top-22.5 -translate-y-1/2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-black drop-shadow-[0px_-2px_12px_#00000020]'
      />

      <div className='fixed w-60 h-45 flex justify-center bg-white rounded-lg overflow-hidden shadow-[0px_-2px_12px_#00000020]'>
        <HighlightContents highlighted={highlighted} whaleData={whaleData} />
      </div>
    </motion.div>
  )
}

function HighlightCardMobile({highlighted, whaleData}) {

  const navigate = useNavigate();

  return (
    <motion.div 
      className='fixed bottom-0 w-full flex justify-center bg-white hover:bg-[#f5f5f5] transition-colors rounded-t-2xl overflow-hidden shadow-[0px_-2px_12px_#00000020] select-none cursor-pointer'
      initial={{bottom:-80, opacity:0}}
      animate={{bottom:0, opacity:1}}
      exit={{bottom:-80, opacity:0}}
      transition={{duration:0.2, ease:'easeOut'}}
      onClick={() => navigate(`/timeline/${highlighted.post.uid}`)}
    >
      <AnimatePresence mode='wait'>
        <motion.div 
          key={highlighted.post.uid}
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
          transition={{duration: 0.2}}
          className='w-[80%] text-sm'
        >
          <HighlightContents highlighted={highlighted} whaleData={whaleData} mobile />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

function HighlightContents({highlighted, whaleData, mobile=false}) {
  const p = highlighted.post;
  return (
    <div className='overflow-hidden p-4 min-w-40 w-full h-full flex flex-col justify-center items-center gap-2'>
      <div className='w-full flex justify-center items-center'>
        { p.whales.includes('blue') && <img src={BlueWhale} className='w-10' /> }
        { p.whales.includes('green') && <img src={GreenWhale} className='w-10' /> }
        { p.whales.includes('purple') && <img src={PurpleWhale} className='w-10' /> }
      </div>
      <h2 className='text-md'>{getFormattedDate(p.datetime)}</h2>
      <p className='text-center text-md leading-4 line-clamp-2 overflow-hidden text-ellipsis'>
        {
          p.whales.length === 3
          ? <b className='underline'>Three Whales</b>
          : p.whales.length === 2
          ? <>
              <b className='text-shadow-[px_0px_2px_#00000022]' style={{color: getWhaleColour(highlighted.post.whales[0])}}>{getWhaleName(whaleData, highlighted.post.whales[0])}</b> & <b className='text-shadow-[px_0px_2px_#00000022]' style={{color: getWhaleColour(highlighted.post.whales[1])}}>{getWhaleName(whaleData, highlighted.post.whales[1])}</b>
            </>
          : <b className='text-shadow-[px_0px_2px_#00000022]' style={{color: getWhaleColour(highlighted.post.whales[0])}}>{getWhaleName(whaleData, highlighted.post.whales[0])}</b>
        } {p.title}
      </p>
      <p className='text-xs mt-2 text-black/50 font-bold tracking-wider'>{mobile? 'Tap' : 'Click'} for more...</p>
    </div>
  )
}