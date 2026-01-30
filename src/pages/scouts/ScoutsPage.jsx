import { useEffect, useState } from "react";
import Navigation from "../../components/navigation/navigation";
import { db, getAllWhales } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { collection,  getDocs } from "firebase/firestore";
import { AnimatePresence, motion } from "motion/react";
import WhaleLoader from "../../components/loader/WhaleLoader";
import { getScoutBadge } from "./getScoutBadge";
import { ScoutViewer } from "./ScoutViewer";
import { Binoculars, Crown, User } from "lucide-react";
import { useTailwindScreen } from "../../components/screens/tailwind-screen/TailwindScreen";

function ScoutsPage() {

  const [whales, setWhales] = useState(null);
  const [goldScouts, setGoldScouts] = useState(null);
  const [silverScouts, setSilverScouts] = useState(null);
  const [bronzeScouts, setBronzeScouts] = useState(null);
  const [awardlessScouts, setAwardlessScouts] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    async function getAllScouts() {
      const docs = collection(db, 'scouts');
      const snaps = await getDocs(docs);
      const data = snaps.docs.map((snap) => snap.data());
      
      const gold = data.filter((s) => getScoutBadge(s, true) === 3);
      const silver = data.filter((s) => getScoutBadge(s, true) === 2);
      const bronze = data.filter((s) => getScoutBadge(s, true) === 1);
      const awardless = data.filter((s) => getScoutBadge(s, true) === 0);

      setGoldScouts(gold);
      setSilverScouts(silver);
      setBronzeScouts(bronze);
      setAwardlessScouts(awardless);
    }
    getAllScouts();
  }, [])

  useEffect(() => {
    async function getWhales() {
      const whales = await getAllWhales();
      setWhales(whales);
    }
    getWhales();
  }, []);

  return (
    <div>
      <Navigation />
      <ScoutViewer whales={whales} />
      <div className='w-full flex justify-center'>
        <AnimatePresence mode='wait'>{

          !(whales && goldScouts && silverScouts && bronzeScouts && awardlessScouts)

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


          : <motion.div
              key='content'
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              transition={{duration: 0.5}}
              className='w-[90%] max-w-7xl mt-35 md:mt-4 flex flex-col gap-8 md:gap-14 pb-12'
            >
              <div className='w-full flex justify-center'>
                <div className='w-[95%] md:w-[90%] flex flex-col md:flex-row justify-center items-center gap-2 md:p-4'>
                  <button onClick={() => navigate('/leaderboard')} className='border-2 p-3 md:px-4 md:py-3 flex items-center justify-center gap-4 transition-all cursor-pointer hover:bg-[#fdcb6e]'>
                    <Crown /><h2>2026 Leaderboard</h2>
                  </button>
                  <button onClick={() => navigate('/join')} className='border-2 p-3 md:px-4 md:py-3 flex items-center justify-center gap-4 transition-all cursor-pointer hover:bg-[#fd79a8]'>
                    <Binoculars /><h2>Become a Scout</h2>
                  </button>
                </div>
              </div>
              <div className='w-full flex justify-center'>
                <p className='text-center md:-mt-10 w-[90%] md:w-[60%] max-w-140 not-md:mb-4'>
                  Become a scout today, and <b>get photographed with the whales to earn points.</b><br/>
                  Use those points to climb the leaderboard, then <b>brag to literally everyone</b> about how many crochet whales you've seen.
                </p>
              </div>
              { !(goldScouts.length || silverScouts.length || bronzeScouts.length || awardlessScouts.length) ? <h1 className='text-center mt-30 text-[#999]'>And there are no scouts under the sun...</h1> : null }
              { goldScouts.length ? <ScoutSection scouts={goldScouts} heading='Gold Scouts' tagline='... and Ahab wept, for there were no more worlds to conquer' /> : null }
              { silverScouts.length ? <ScoutSection scouts={silverScouts} heading='Silver Scouts' tagline='... not all those who wander are lost' /> : null }
              { bronzeScouts.length ? <ScoutSection scouts={bronzeScouts} heading='Bronze Scouts' tagline='... the journey of a thousand miles begins with a single step' /> : null }
              { awardlessScouts.length ? <ScoutSection scouts={awardlessScouts} heading='Other Scouts' tagline="... their adventure is only just begun" /> : null }
            </motion.div>

        }</AnimatePresence>
      </div>
    </div>
  )

}

export default ScoutsPage;


function ScoutSection({scouts, heading, tagline}) {
  return (
    <div key={heading}>
      <h2 className='text-xl md:text-2xl'>{heading}</h2>
      <p className='border-b-2 border-[#aaa] text-xs md:text-sm italic text-[#555] pb-2'>{tagline}</p>
      <div className='w-full mt-4 grid gap-2 md:gap-4 grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-9'>
        {
          scouts.map((s, i) => <ScoutTile key={s.uid} s={s} i={i} />)
        }
      </div>
    </div>
  )
}


function ScoutTile({s, i}) {
  const delayMultiplier = 0.1;
  const scoutBadge = getScoutBadge(s);
  const navigate = useNavigate();

  const { is } = useTailwindScreen();

  return (
    <motion.div
      initial={{opacity:0, scale:0.8}}
      animate={{opacity:1, scale:1}}
      transition={{duration:1, type:'spring', delay: i * delayMultiplier}}
      className='cursor-pointer'
      onClick={() => navigate(`/scouts/${s.uid}`)}
    >
      <motion.div 
        whileHover={{scale: 1.05}} 
        whileTap={{scale: 0.95}}
        transition={{duration: 0.5, type:'spring'}}
        className='relative rounded-lg bg-white border-2' 
      >
        <div className='w-full aspect-square overflow-hidden flex justify-center items-center'>
          {
            s.pfp 
            ? <img className='object-cover' src={s.pfp?.url} />
            : <User size={is('md') ? 60 : 50} />
          }
        </div>
        <div className='min-h-8 py-0.5 flex justify-center items-center'>
          <p className='font-bold text-center text-[12px] md:text-xs line-clamp-2 px-2 leading-3 md:leading-3.5'>{s.name} the {s.title}</p>
        </div>
        {
          scoutBadge && 
          <div className='absolute right-0 top-0 w-8 translate-x-1/4 -translate-y-1/4 md:w-10 bg-white rounded-full p-0.5 md:p-1'>
            <img src={scoutBadge} />
          </div>
        }
      </motion.div>
    </motion.div>
  )
}