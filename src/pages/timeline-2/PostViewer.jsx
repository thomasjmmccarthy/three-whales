import { AnimatePresence, motion } from "motion/react";
import WhaleLoader from "../../components/loader/WhaleLoader";
import { Circle, User, X } from "lucide-react";
import { getWhaleColour } from "./Helpers";
import { useEffect, useState } from "react";
import ReactMarkdown from 'react-markdown';
import { getFormattedDateDifference } from "../../components/date-formatter/FormattedDateDifference";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

import BronzeWhale from '../../assets/whales/trophy/bronze.svg';
import SilverWhale from '../../assets/whales/trophy/silver.svg';
import GoldWhale from '../../assets/whales/trophy/gold.svg';


export function PostViewer({postId, post, navigate, is, whales}) {

  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [direction, setDirection] = useState(1);
  const [scouts, setScouts] = useState(null);

  useEffect(() => {
    if(post?.gallery.length > 0) setCurrentPhoto(0);
    else setCurrentPhoto(null);
  }, [postId, post])

  useEffect(() => {
    async function getScouts() {
      if(post?.scouts) {
        let s = [];
        for(const uid of post.scouts) {
          const snap = await getDoc(doc(db, 'scouts', uid));
          if(snap.exists()) {
            s = [...s, snap.data()];
          }
        }
        setScouts(s);
      }
      else setScouts(null);
    }
    getScouts();
  }, [postId, post])

  const handlePhotoChange = (i) => {
    if(!post || post.gallery.length === 0 || i < 0 || i >= post.gallery.length) return;
    if(i > currentPhoto) setDirection(1);
    else setDirection(-1);
    setCurrentPhoto(i);
  }

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
        (postId && is('md')) &&
          <motion.div 
            className='fixed inset-0 flex justify-center items-center bg-black/20 z-20'
            initial={{opacity:0}}
            animate={{opacity:1}}
            exit={{opacity:0}}
            transition={{duration: 0.1}}
            onClick={() => navigate('/timeline/')} 
          >
            <div onClick={(e) => e.stopPropagation()} className='w-[90%] max-w-180 max-h-[90dvh] overflow-y-auto bg-white rounded-lg'>
              <Post post={post} whales={whales} scouts={scouts} currentPhoto={currentPhoto} direction={direction} handlePhotoChange={handlePhotoChange} navigate={navigate} />
            </div>
          </motion.div>
      }
      {
        (postId && !is('md')) &&
          <motion.div 
            className='fixed inset-0 h-dvh overflow-y-auto bg-white shadow-[0px_2px_12px_#00000020] z-20'
            variants={mobileVariants}
            initial='hidden'
            animate='show'
            exit='hidden'
          >
            <X className='mt-6 ml-6 text-[#777] cursor-pointer transition-all hover:opacity-60' onClick={() => navigate('/timeline/')} />
            <Post post={post} whales={whales} scouts={scouts} currentPhoto={currentPhoto} direction={direction} handlePhotoChange={handlePhotoChange} navigate={navigate} />
          </motion.div>
      }
    </AnimatePresence>
  );
}


function Post({post, whales, scouts, currentPhoto, direction, handlePhotoChange, navigate}) {

  if(!post || !whales) return <div className='w-full h-full flex justify-center items-center'><WhaleLoader /></div>

  const postTitle = getPostTitle(post, whales);

  const slideVariants = {
    enter: (dir) => ({x: dir > 0 ? '100%' : '-100%', opacity: 0}),
    center:          {x: 0, opacity: 1},
    exit:  (dir) => ({x: dir > 0 ? '-100%' : '100%', opacity: 0})
  }

  const swipeConfidenceThreshold = 2000;
  const swipePower = (offset, velocity) => Math.abs(offset) * velocity;

  return (
    <div className='w-full pt-3 pb-8 md:p-8 flex flex-col items-center gap-6'>
      <div className='w-[75%]'>
        {postTitle}
      </div>
      <div className='w-full flex flex-col items-center'>
      {
        currentPhoto !== null && post.gallery.length > 0 && (
        <div className='w-full flex flex-col items-center'>
          <div className='relative w-[95%] aspect-square overflow-hidden sm:w-[80%] md:w-[60%]'>
            <AnimatePresence initial={false} custom={direction}>{
              <motion.img
                key={currentPhoto}
                src={post.gallery[currentPhoto].url}
                className='absolute inset-0 w-full h-full object-cover select-none'
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{duration: 0.5, ease:'easeInOut'}}

                drag='x'
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.5}
                onDragEnd={(e, {offset, velocity}) => {
                  const swipe = swipePower(offset.x, velocity.x);
                  // Swipe left = next image
                  if (swipe < -swipeConfidenceThreshold) {
                    handlePhotoChange(currentPhoto+1);
                  }
                  // Swipe right = previous image
                  else if(swipe > swipeConfidenceThreshold) {
                    handlePhotoChange(currentPhoto-1);
                  }
                }}
              />
            }</AnimatePresence>
          </div>
          {
            post.gallery.length > 1 &&
            <div className='flex mt-3 items-center'>
              {
                post.gallery.map((_, i) => 
                  <div key={i} className='w-4 flex justify-center'>
                    <Circle
                      className='transition-all cursor-pointer hover:opacity-70'
                      style={ i===currentPhoto
                        ? {color: 'black'}
                        : {color: '#555'}
                      } 
                      size={i===currentPhoto ? 14 : 12}
                      onClick={() => handlePhotoChange(i)}
                    />
                  </div>
                )
              }
            </div>
          }
        </div>)}
        <div className='w-[90%] md:w-[60%] leading-4.5 mt-4 text-sm md:text-md'>
          <ReactMarkdown>
            {post.content}
          </ReactMarkdown>
          <p className='mt-3 md:mt-2 text-xs md:text-sm text-[#999]'>{getFormattedDateDifference(post.datetime)}</p>
        </div>
        {
          (scouts && scouts.length > 0)
          ?
            <div className='w-[90%] md:w-[60%] mt-6'>
              <hr className='border-[#aaa] border'/>
              <h2 className='mb-3 mt-2 md:mb-2 md:mt-1 text-[#555] text-xs md:text-sm'>Scouts</h2>
              <div className='w-full grid grid-cols-6 md:grid-cols-8 gap-1'>
                {
                  scouts.map((s) => <ScoutTile scout={s} navigate={navigate} />)
                }
              </div>
            </div>
          : null
        }
      </div>
    </div>
  )

}


function ScoutTile({scout:s, navigate}) {

  let whalesSpotted = 0;
  if(s.whales.blue?.spotted) whalesSpotted+=1
  if(s.whales.green?.spotted) whalesSpotted+=1;
  if(s.whales.purple?.spotted) whalesSpotted+=1;

  return (
    <div className='relative bg-white select-none cursor-pointer' 
      onClick={() => navigate(`/scouts/${s.uid}`)}
    >
      {
        s.pfp 
        ? <img 
            src={s.pfp.url}
            alt=''
            className='w-full aspect-square object-cover rounded-full'
            draggable={false}
          />
        : <div className='w-full aspect-square flex justify-center items-center rounded-full border'>
            <User size={35} />
          </div>
      }
      <ScoutBadge badge={
        whalesSpotted === 3 ? GoldWhale
        : whalesSpotted === 2 ? SilverWhale
        : whalesSpotted === 1 ? BronzeWhale : null
      } />
    </div>
  )
  
}


function ScoutBadge({badge}) {
  if(!badge) return null;
  return (
    <img src={badge} className='w-6 h-6 absolute -top-1/12 -left-1/12 sm:top-0 sm:left-0 md:-top-1/8 md:-left-1/8 p-1 bg-white rounded-full' />
  )
}


function getWhaleName(whales, w) {
  for(const d of whales) {
    if(d.uid === w) return d.name;
  }
  return null;
}


function getPostTitle(post, whales) {
  return (
    <h2 className='w-full text-center line-clamp-3 text-lg md:py-3 leading-6 md:leading-7 md:text-2xl'>
      {
        post.whales.length === 3
        ? <b className='underline'>Three Whales</b>
        : post.whales.length === 2
        ? <>
            <b className='text-shadow-[px_0px_2px_#00000022]' style={{color: getWhaleColour(post.whales[0])}}>{getWhaleName(whales, post.whales[0])}</b> & <b className='text-shadow-[px_0px_2px_#00000022]' style={{color: getWhaleColour(post.whales[1])}}>{getWhaleName(whales, post.whales[1])}</b>
          </>
        : <b className='text-shadow-[px_0px_2px_#00000022]' style={{color: getWhaleColour(post.whales[0])}}>{getWhaleName(whales, post.whales[0])}</b>
      } {post.title}
    </h2>
  )
}