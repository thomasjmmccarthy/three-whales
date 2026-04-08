import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react"
import { db } from "../../firebase";
import { AnimatePresence, motion } from "motion/react";
import WhaleLoader from "../../components/loader/WhaleLoader";
import { useNavigate } from "react-router-dom";
import { ArrowBigLeftDash, Heart } from "lucide-react";
import { MemoryDisplay } from "./MemoryDisplay";
import { getFormattedDate } from "../../components/date-formatter/DateFormatter";
import { useTailwindScreen } from "../../components/screens/tailwind-screen/TailwindScreen";


export function MemoryWall({year}) {

  const [seed, setSeed] = useState(null);
  const [posts, setPosts] = useState(null);
  const [gallery, setGallery] = useState(null);

  const [highlighted, setHighlighted] = useState(null);
  const [selected, setSelected] = useState(null);

  const { is } = useTailwindScreen();

  // Get posts from this year
  useEffect(() => {
    async function getPosts() {
      const startOfYear = `${year}-01-01-00:00`;
      const endOfYear = `${year}-12-31-23:59`

      const q = query(
        collection(db, 'posts'),
        where("datetime", ">=", startOfYear),
        where("datetime", "<=", endOfYear)
      );

      const snaps = await getDocs(q);
      const data = snaps.docs.map(doc => doc.data()).filter((d) => !d.draft);
      setPosts(data);
      setSeed(Math.floor(Math.random() * 1e9));
    }
    getPosts();
  }, [year]);

  const handleHighlight = (v) => {
    if(is('md')) {
      setHighlighted(v);
    }
  }

  // Get gallery
  useEffect(() => {
    if(!posts) return;
    const images = [];
    posts.forEach((p) => {
      if(p.gallery) {
        p.gallery.forEach((g) => {
          images.push({
            post: p.uid,
            date: getFormattedDate(p.datetime),
            lowResUrl: g.lowResUrl,
            url: g.url,
          })
        })
      }
    })
    // shuffle the images
    const gallery = shuffleWithSeed(images, seed);
    setGallery(gallery);
  }, [posts])

  return (
    <>
      <MemoryDisplay selected={selected} setSelected={setSelected} />
      <AnimatePresence mode='wait'>
      {

        !gallery

        ? <motion.div 
            key='loader'
            initial={{opacity:0, scale:0.6}}
            animate={{opacity:1, scale:1}}
            exit={{opacity:0, scale:1.4}}
            transition={{duration: 0.5, type: 'spring'}}
            className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
          >
            <WhaleLoader />
          </motion.div>


        : <Gallery 
            gallery={gallery} 
            postCount={posts.length} 
            year={year}
            highlighted={highlighted} 
            setHighlighted={handleHighlight}
            setSelected={setSelected}
          />
      }
      </AnimatePresence>
    </>
  )

}



function Gallery({gallery, year, postCount, highlighted, setHighlighted, setSelected}) {

  const navigate = useNavigate();
  const imageClass = 'object-cover w-full h-full rounded-lg transition-all duration-200 contrast-200'

  const handleMouseExit = () => { setHighlighted(null) }
  
  return (
    <div className='w-full flex flex-col items-center pb-8 not-md:mt-35'>
      <div className='w-[90%] max-w-240'>
        <button onClick={() => navigate('/')} className='not-md:text-[#777] md:mb-2 md:px-3 py-1 flex items-center gap-2 transition-all cursor-pointer hover:text-[#0984e3] hover:gap-3'>
          <ArrowBigLeftDash /><h2 className='not-md:hidden'>Timeline</h2>
        </button>
      </div>
      <div className='flex gap-4 items-center md:mt-5'>
        <Heart size={35} />
        <h2 className='text-4xl'>{year}</h2>
        <Heart size={35} />
      </div>
      <p className='mb-12'>{postCount} posts, {gallery.length} photos</p>
      <div 
        className='w-[95%] max-w-350 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 opacity-80'
        onMouseLeave={handleMouseExit}
      >
        {
          gallery.map((g) => {
            const isColoured = (highlighted?.post === g.post);
            const isActive = (highlighted?.lowResUrl === g.lowResUrl);
            const isFaded = (!isColoured && highlighted !== null);

            const positionClasses = getImageTransformClasses(g, isActive);
            const activeClass = isActive ? 'scale-130 drop-shadow-[0_0_4px_white]' : 'scale-105 drop-shadow-md';

            return (
              <div 
                style={positionClasses} 
                className={`w-full aspect-square overflow-hidden transition-all cursor-pointer ${activeClass}`} 
                onMouseEnter={() => setHighlighted(g)}
                onClick={() => setSelected(g)}
              >
                <img className={`${imageClass} ${isColoured ? 'saturate-100' : 'saturate-0'} transition-all`} src={g.lowResUrl} />
                <div className={`absolute inset-0 pointer-events-none transition-all ${isFaded ? 'bg-white/60' : 'bg-white/0'}`} />
              </div>
            )
          })
        }
      </div>
    </div>
  )
}


function getImageTransformClasses(g, isActive) {
  const seed = pseudoRandom(g.url);

  const rotation = ((seed % 10) - 6);
  const z = isActive ? 100 : seed % 99;

  return {
    transform: `rotate(${rotation}deg)`,
    zIndex: z
  };
}


function shuffleWithSeed(array, seed) {
  const rand = seededRandom(seed);
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}


function seededRandom(seed) {
  let t = seed;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}


function pseudoRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}