import { useEffect, useState } from "react";
import Navigation from "../../components/navigation/navigation";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { getAnnualPoints } from "../../components/leaderboard/GetPoints";
import { AnimatePresence, motion } from "motion/react";
import { ArrowBigLeftDash, Crown, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Leaderboard() {

  const [posts, setPosts] = useState(null);
  const [scouts, setScouts] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [selected, setSelected] = useState(null);

  const year = new Date().getFullYear();
  const navigate = useNavigate();

  // Get posts from this year
  useEffect(() => {
    async function getPosts() {

      const year = new Date().getFullYear();
      const startOfYear = `${year}-01-01-00:00`;

      const q = query(
        collection(db, 'posts'),
        where("datetime", ">=", startOfYear)
      );

      const snaps = await getDocs(q);
      const data = snaps.docs.map(doc => doc.data());
      setPosts(data);
    }
    getPosts();
  }, []);

  // Get scouts from posts this year
  useEffect(() => {
    async function getScouts() {

      if(!posts) return;

      let scoutIds = [];
      posts.forEach((post) => {
        if(!post.scouts) return null;
        post.scouts.forEach((scout) => {
          if(!scoutIds.includes(scout)) {
            scoutIds.push(scout);
          }
        })
      });
      scoutIds = scoutIds.filter(Boolean);

      let data = await Promise.all(
        scoutIds.map(async(id) => {
          const docRef = doc(db, 'scouts', id);
          const snap = await getDoc(docRef);
          if(snap.exists()) return snap.data();
        })
      )

      setScouts(data.filter(Boolean));
    }
    getScouts();
  }, [posts])

  // Calculate leaderboard
  useEffect(() => {

    if(!posts || !scouts) return;

    let leaderboard = [];
    scouts.forEach((scout) => {
      const scoutPosts = posts.filter(x => x.scouts?.includes(scout.uid));
      const points = getAnnualPoints(scoutPosts);
      if(points > 0) {
        leaderboard.push({...scout, points: points, posts: scoutPosts});
      }
    })

    leaderboard.sort((a,b) => b.points - a.points);

    setLeaderboard(leaderboard);

  }, [scouts])

  return (
    <div>
      <Navigation />

      <AnimatePresence>{ selected &&
        <LeaderboardViewer selected={selected} setSelected={setSelected} />
      }</AnimatePresence>

      <div className='w-full flex justify-center'>
        <AnimatePresence>{

          leaderboard &&
          <motion.div
            key='content'
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{duration: 0.5}}
            className='w-full mt-40 md:mt-4 flex flex-col items-center pb-12'
          >
            <div className='w-[90%] max-w-240'>
              <button onClick={() => navigate('/scouts')} className='mb-8 px-3 py-1 flex items-center gap-2 transition-all cursor-pointer hover:text-[#0984e3] hover:gap-3'>
                <ArrowBigLeftDash /><h2>Scouts</h2>
              </button>
            </div>
            <div className='flex gap-4 items-center mb-10'>
              <Crown size={35} />
              <h1>{year} Leaderboard</h1>
            </div>
            <div className='w-[90%] max-w-240'>
              {
                leaderboard.map((s, i) => <LeaderboardItem s={s} i={i} setSelected={setSelected} />)
              }
            </div>
          </motion.div>

        }</AnimatePresence>
      </div>
    </div>
  )

}


function LeaderboardItem({s, i, setSelected}) {

  const [delayMultiplier, setDelayMultiplier] = useState(0.05);

  useEffect(() => {
    const t = setTimeout(() => setDelayMultiplier(0), (1000 * delayMultiplier));
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{opacity: 0, scale: 0.9, filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))', zIndex: 0}}
      animate={{opacity: 1, scale: 1}}
      whileHover={{scale: 1.03, filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.25))', zIndex: 10, borderTopColor: 'rgba(0,0,0,1)'}}
      transition={{duration: 0.3, type: 'spring', delay: i * delayMultiplier}}
      className='relative w-full px-4 py-2 border-b-2 flex justify-between border-t-2 border-t-transparent cursor-pointer'
      style={{backgroundColor: i===0 ? 'var(--trophy-gold)' : i===1 ? 'var(--trophy-silver)' : i===2 ? 'var(--trophy-bronze)' : 'white'}}
      onClick={() => setSelected({scout: s, place: i+1})}
    >
      <div className='flex gap-3 md:gap-5 items-center'>
        <h2 className='text-lg md:text-2xl'>#{i+1}</h2>
        <div className='w-14 aspect-square overflow-hidden border-2 flex jusitfy-center items-center rounded-md'>
          {
            s.pfp
            ? <img src={s.pfp.url} className='object-cover' />
            : <User size={40} className='w-full' />
          }
        </div>
        <h2 className='text-sm md:text-lg line-clamp-1'>{s.name} <span className='text-xs underline'>the</span> {s.title}</h2>
      </div>
      <div className='flex items-center gap-2'>
        <h2 className='text-lg md:text-2xl'>{s.points}</h2>
        <p>points</p>
      </div>
    </motion.div>
  )

}


function LeaderboardViewer({selected, setSelected}) {

  const s = selected.scout;
  const place = selected.place;

  let oneWhalePosts = 0;
  let twoWhalePosts = 0;
  let threeWhalePosts = 0;
  let whalesSeen = [];

  s.posts.forEach((p) => {
    const whales = p.whales.length;
    if(whales === 3)      threeWhalePosts += 1;
    else if(whales === 2) twoWhalePosts   += 1;
    else                  oneWhalePosts   += 1;
    p.whales.forEach(w => { if(!whalesSeen.includes(w)) whalesSeen.push(w) })
  })

  whalesSeen = whalesSeen.length;
  const postPoints = oneWhalePosts + (twoWhalePosts * 3) + (threeWhalePosts * 5);

  return (
    <motion.div 
      className='fixed inset-0 flex justify-center items-center bg-black/20 z-20'
      initial={{opacity:0}}
      animate={{opacity:1}}
      exit={{opacity:0}}
      transition={{duration: 0.1}}
      onClick={() => setSelected(null)} 
    >
      <div onClick={(e) => e.stopPropagation()} className='w-[90%] max-w-180 max-h-[90dvh] overflow-y-auto bg-white rounded-lg'>

        <div className='w-full p-6 flex justify-between' style={{backgroundColor: place===1 ? 'var(--trophy-gold)' : place===2 ? 'var(--trophy-silver)' : place===3 ? 'var(--trophy-bronze)' : 'white'}}>
          <div className='flex gap-3 md:gap-5 items-center'>
            <h2 className='text-lg md:text-2xl'>#{place}</h2>
            <div className='w-14 aspect-square overflow-hidden border-2 flex jusitfy-center items-center rounded-md'>
              {
                s.pfp
                ? <img src={s.pfp.url} className='object-cover' />
                : <User size={40} className='w-full' />
              }
            </div>
            <h2 className='text-sm md:text-lg line-clamp-1'>{s.name} <span className='text-xs underline'>the</span> {s.title}</h2>
          </div>
          <div className='flex items-center gap-2'>
            <h2 className='text-lg md:text-2xl'>{s.points}</h2>
            <p>points</p>
          </div>
        </div>

        <div className='w-full px-8 py-4 flex flex-col items-center'>
          <div className='w-full max-w-120 grid grid-cols-4'>
            {/* LABELS */}
            <Label bold left>Post Type</Label>
            <Label bold>Points/Post</Label>
            <Label bold># Posts</Label>
            <Label bold right># Points</Label>

            {/* ONE WHALE */}
            <Label left>One Whale</Label>
            <Label>1</Label>
            <Label>{oneWhalePosts}</Label>
            <Label right>{oneWhalePosts}</Label>

            {/* TWO WHALES */}
            <Label left>Two Whales</Label>
            <Label>3</Label>
            <Label>{twoWhalePosts}</Label>
            <Label right>{twoWhalePosts * 3}</Label>

            {/* THREE WHALES */}
            <Label left>Three Whales</Label>
            <Label>5</Label>
            <Label>{threeWhalePosts}</Label>
            <Label right>{threeWhalePosts * 5}</Label>

            <div />
            <div />
            <div />
            <Label bold right>{postPoints}</Label>
          </div>
          <hr className='w-full max-w-140 my-4 opacity-25 border'/>
          <p className='text-sm mt-4 text-center'><b>{s.name} the {s.title}</b> has seen <b>{whalesSeen}</b> whale{whalesSeen === 1 ? '' : 's'} this year!</p>
          <div className='w-full flex justify-center items-center gap-2 mt-3 pb-3'>
            <h2 className='text-2xl'>{whalesSeen}</h2>
            <p className='font-bold text-2xl'>x</p>
            <h2 className='text-2xl'>{postPoints}</h2>
            <p className='font-bold text-2xl'>=</p>
            <h2 className='text-2xl underline'>{s.points}</h2>
            <p className='font-bold text-2xl'>points</p>
          </div>
        </div>

      </div>
    </motion.div>
  )
}


function Label({bold, left, right, children}) {
  return (
    <p className={`text-sm ${bold ? 'font-bold' : left ? 'ml-1' : ''} ${left ? 'text-start' : right ? 'text-end' : 'text-center'}`}>
      {children}
    </p>
  )
}