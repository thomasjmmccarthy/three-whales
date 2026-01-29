import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { useTailwindScreen } from "../../components/screens/tailwind-screen/TailwindScreen";
import { getFormattedDate, getShortFormattedData } from "../../components/date-formatter/DateFormatter";
import { User, X } from "lucide-react";
import { getScoutBadge } from "./GetScoutBadge";

import GoldBanner from '../../assets/scout-banners/gold.svg';
import SilverBanner from '../../assets/scout-banners/silver.svg';
import BronzeBanner from '../../assets/scout-banners/bronze.svg';

import GoldWhale from '../../assets/whales/trophy/gold.svg';
import SilverWhale from '../../assets/whales/trophy/silver.svg';
import BronzeWhale from '../../assets/whales/trophy/bronze.svg';
import { getAllTimePoints, getAnnualPoints } from "../../components/leaderboard/GetPoints";


export function ScoutViewer({whales}) {
  
  const location = useLocation();
  const navigate = useNavigate();

  const [scout, setScout] = useState(null);
  const [posts, setPosts] = useState(null);

  const { is } = useTailwindScreen();

  // Get Scout
  useEffect(() => {
    async function getScout() {
      const path = location.pathname.split('/').filter(Boolean);
      if(path.length && path[path.length-1] !== 'scouts'){
        const scoutId = path[path.length-1];
        const scoutDoc = doc(db, 'scouts', scoutId);
        const scoutSnap = await getDoc(scoutDoc);
        if(scoutSnap.exists()) setScout(scoutSnap.data());
        else navigate('/scouts');
      }
      else {
        setScout(null);
        setPosts(null);
      }
    }
    getScout();
  }, [location])

  // Get posts
  useEffect(() => {
    async function getPosts() {
      if(scout) {
        const scoutId = scout.uid;
        const base = [
          collection(db, 'posts'),
          where('scouts', 'array-contains', scoutId),
          orderBy('datetime', 'desc'),
        ];
        const q = query(...base);
        const snap = await getDocs(q);
        const data = snap.docs.map((snap) => snap.data());
        setPosts(data);
      }
    }
    getPosts();
  }, [scout])

  const mobileVariants = {
    hidden: {
      y: '100%',
      transition: { duration: 0.15, delay: 0 }
    },
    show: {
      y: 0,
      transition: { duration: 0.2, delay: 0.1 }
    }
  }

  return (
    <AnimatePresence>
      {
        (scout && is('md')) &&
        <motion.div 
            className='fixed inset-0 flex justify-center items-center bg-black/20 z-20'
            initial={{opacity:0}}
            animate={{opacity:1}}
            exit={{opacity:0}}
            transition={{duration: 0.1}}
            onClick={() => navigate('/scouts')} 
          >
            <div onClick={(e) => e.stopPropagation()} className='w-[90%] max-w-180 max-h-[90dvh] overflow-y-auto bg-white rounded-lg'>
              <Scout scout={scout} posts={posts} whales={whales} navigate={navigate} />
            </div>
          </motion.div>
      }
      {
        (scout && !is('md')) &&
          <motion.div 
            className='fixed inset-0 h-dvh overflow-y-auto bg-white shadow-[0px_2px_12px_#00000020] z-20'
            variants={mobileVariants}
            initial='hidden'
            animate='show'
            exit='hidden'
          >
            <X className='mt-6 ml-6 text-[#777] cursor-pointer transition-all hover:opacity-60' onClick={() => navigate('/scouts')} />
            <Scout scout={scout} posts={posts} whales={whales} navigate={navigate} baseDelay={0.1} />
          </motion.div>
      }
    </AnimatePresence>
  )

}


function Scout({scout, posts, whales, navigate, baseDelay=0}) {

  const [podium, setPodium] = useState(null);

  const scoutBadge = getScoutBadge(scout);
  const whaleCount = getScoutBadge(scout, true);

  const points = useMemo(() => {
    if(!Array.isArray(posts)) return null;
    return getAllTimePoints(posts);
  }, [posts]); 

  const annualPoints = useMemo(() => {
    if(!Array.isArray(posts)) return null;
    return getAnnualPoints(posts);
  }, [posts]);

  let sortedWhales = ['blue', 'green', 'purple'];
  sortedWhales.sort((x,y) => {
    const a = scout.whales[x];
    const b = scout.whales[y];
    if(a.spotted !== b.spotted) return a.spotted ? 1 : -1;
    if(a.spotted && b.spotted) {
      return !a.date.localeCompare(b.date);
    }
    return 0;
  });

  return (
    <div className='w-full p-8 flex flex-col items-center gap-6'>
      <div className='md:w-[75%] flex flex-col items-center'>
        <div className='w-full flex flex-col md:flex-row justify-center items-center md:gap-6'>
          <div className='relative w-30 mb-5'>
            <div className='w-full aspect-square overflow-hidden flex justify-center items-center border-2 rounded-md'>
              {scout.pfp
              ? <img src={scout.pfp.url} className='object-cover' />
              : <User size={60} />
              }
            </div>
          </div>
          <div>
            <h1 className='w-full leading-7 line-clamp-2 flex items-center gap-2.5'>{scout.name} <span className='text-sm underline mt-0.5'>the</span> {scout.title}</h1>
            <p className='mt-1 ml-0.5 text-center md:text-start'>scouting since <b>{getFormattedDate(scout.created)}</b></p>
            <div className='mt-2 flex flex-col items-center md:items-start'>
              { annualPoints !== null && <p className='text-xs font-bold w-2/5 flex justify-between'><span>current points:</span> {annualPoints}</p> }
              { points !== null &&       <p className='text-xs font-bold w-2/5 flex justify-between -mt-0.5'><span>all-time points:</span> {points}</p> }
            </div>
          </div>
        </div>

        {
          scoutBadge
          ? <motion.img 
              initial={{opacity: 0, scale: 0.2}}
              animate={{opacity: 1, scale: 1}}
              transition={{duration: 0.5, type: 'spring', delay: baseDelay+0.1}}
              className='w-full max-w-60 mt-3' 
              src={whaleCount === 3 ? GoldBanner 
                  : whaleCount === 2 ? SilverBanner 
                  : BronzeBanner
                  } 
            />
          : <div className='h-10 md:h-6' />
        }

        <div className='relative flex gap-1 items-end h-25 mt-16'>
          <Podium trophy={SilverWhale} whaleColour={sortedWhales[1]} height='52%' activeColour='var(--trophy-silver)' active={whaleCount >= 2}  podium={podium} setPodium={setPodium} baseDelay={baseDelay} />
          <Podium trophy={GoldWhale}   whaleColour={sortedWhales[0]} height='90%' activeColour='var(--trophy-gold)'   active={whaleCount === 3} podium={podium} setPodium={setPodium} baseDelay={baseDelay} />
          <Podium trophy={BronzeWhale} whaleColour={sortedWhales[2]} height='22%' activeColour='var(--trophy-bronze)' active={whaleCount >= 1}  podium={podium} setPodium={setPodium} baseDelay={baseDelay} />
          <div className='absolute w-full h-2 bg-[#444] z-30' />
        </div>
        <AnimatePresence>{
          podium &&
          <motion.div
            initial={{opacity:0}}
            animate={{opacity:1}}
            exit={{opacity:0}}
            className='h-0'
          >
            <p className='h-0 text-xs mt-2'>
              <b className='uppercase'>{['gold','silver','bronze'][sortedWhales.indexOf(podium)]}:</b> first spotted <b style={{color: `var(--whale-${podium})`}}>{getWhaleName(whales, podium)}</b> on <b>{getFormattedDate(scout.whales[podium].date)}</b>
            </p>
          </motion.div>
        }</AnimatePresence>

      </div>

      {
          (posts?.length && whales)
          ? <div className='w-[95%] md:w-[60%] mt-6'>
              <hr className='border-[#aaa] border'/>
              <h2 className='mb-2 mt-1 text-[#555] text-sm'>Posts</h2>
              <div className='w-full md:max-h-30 overflow-y-auto pt-2'>
                {
                  posts.map((p) => 
                    <div key={p.uid} className='relative ml-1 pl-2 border-l-4 border-[#999] h-5 flex cursor-pointer'>
                      <div className='absolute left-0 w-3 -translate-y-1/2 -translate-x-2/3 aspect-square rounded-full bg-white border-2 border-[#555]' />
                      <motion.p 
                        whileHover={{color: 'var(--whale-blue)'}}
                        transition={{duration: 0.1}}
                        onClick={() => navigate(`/timeline/${p.uid}`)}
                        className='absolute top-0 -translate-y-1/2 text-[#555] line-clamp-1 font-bold text-xs underline tracking-wider'
                      >
                        {getShortFormattedData(p.datetime)} | {getPostTitle(p, whales)}
                      </motion.p>
                    </div>
                  )
                }
              </div>
            </div>
          : null
        }
    </div>
  )
}


function Podium({trophy, whaleColour, height, activeColour, active, podium, setPodium, baseDelay}) {

  const backgroundColour = active ? activeColour : '#ccc';
  const whaleColourVar = `var(--whale-${whaleColour})`;
  const { is } = useTailwindScreen();

  const easeOut = [0.22, 1, 0.36, 1];
  const transition={duration: 1, ease: easeOut, delay: baseDelay + 0.2}

  return (
    <motion.div 
      tabIndex={0}
      onMouseEnter={() => {
        if(is('md') && active) setPodium(whaleColour);
      }}
      onMouseLeave={() => {
        if(is('md') && active) setPodium(null);
      }}
      onClick={() => {
        if(!is('md') && active) setPodium(whaleColour);
      }}
      onBlur={() => {
        if(!is('md') && active) setPodium(null);
      }}
      className='relative w-18 rounded-t-md' style={{height: height}}
    >
      
      {
        active && 
        <motion.div 
          initial={{opacity: 0, scaleY: 0}}
          animate={{opacity: 1, scaleY: 1}}
          transition={{duration: 0.5, delay: baseDelay + 1}}
          className='absolute -top-2 left-1/2 -translate-x-1/2 h-4 w-[95%] z-0 pointer-events-none' 
          style={{
            backgroundImage: `linear-gradient(to top, rgb(from ${whaleColourVar} r g b / 0.9) 0%, rgb(from ${whaleColourVar} r g b / 0) 100%)`,
          }}
        />
      }

      <motion.div 
        initial={{scaleY: 0}}
        animate={{scaleY: 1}}
        transition={transition}
        className='relative w-full h-full rounded-t-md origin-bottom z-10' 
        style={{backgroundColor: backgroundColour}} 
      />
      <motion.img 
        initial={{top: '100%', opacity: 0}}
        animate={{top: '0%', opacity: 1}}
        transition={transition}
        src={trophy} 
        className={`absolute w-14 top-0 left-[50%] transition-transform -translate-x-1/2 ${podium === whaleColour ? '-translate-y-full' : '-translate-y-[95%]'} ${!active ? 'saturate-0' : ''} z-20`} 
      />
    </motion.div>
  )
}


function getPostTitle(post, whales) {

  if(post.whales.length === 3) return `Three Whales ${post.title}`
  else if (post.whales.length === 2) return `${getWhaleName(whales, post.whales[0])} & ${getWhaleName(whales, post.whales[1])} ${post.title}`
  return `${getWhaleName(whales, post.whales[0])} ${post.title}`

}

function getWhaleName(whales, w) {
  for(const d of whales) {
    if(d.uid === w) return d.name;
  }
  return null;
}