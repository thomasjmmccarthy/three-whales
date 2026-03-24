import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { useTailwindScreen } from "../../components/screens/tailwind-screen/TailwindScreen";

export function BlockPreview({ block, mouseY, highlighted }) {

  const posts = block?.posts;
  const imageClass = 'absolute w-30 h-30 xl:w-40 xl:h-40 2xl:w-50 2xl:h-50 object-cover rounded-lg shadow-md transition-all duration-200 contrast-200'
  const { is } = useTailwindScreen();

  if(!block) return null;

  const { leftGallery, rightGallery } = useMemo(() => {
    const allImages = [];
    const postMax = posts.length ? Math.floor(4 / posts.length) : 0;

    // 1. FLATTEN images across posts
    posts.forEach(p => {
      p.gallery.slice(0, postMax).forEach((g) => {
        allImages.push({
          ...g,
          postUid: p.uid,
          highlighted: highlighted?.post.uid === p.uid
        });
      });
    });

    // 2. STABLE SHUFFLE (deterministic)
    const shuffled = [...allImages].sort((a, b) => {
      return pseudoRandom(a.url) - pseudoRandom(b.url);
    });

    // 3. SPLIT left/right
    const left = [];
    const right = [];

    shuffled.forEach((img, i) => {
      if (i % 2 === 0) left.push(img);
      else right.push(img);
    });

    return { leftGallery: left, rightGallery: right };

  }, [posts, highlighted]);

  return (
    <div className='fixed w-full flex justify-center -translate-y-1/2 ml-20' style={{top: mouseY}}>
      <AnimatePresence mode='wait'>
        <motion.div
          key={block.posts[0].uid}
          className='w-full flex justify-between items-center px-40 xl:px-55 2xl:px-90'
          initial={{opacity: 0, scale: 0.9}}
          animate={{opacity: 0.6, scale: 1}}
          exit={{opacity: 0}}
          transition={{duration: 0.2}}
        >
          {/* LEFT SIDE */}
          <div className='relative w-80 h-80'>
            {
              leftGallery.map((g, i) => (
                <img 
                  key={g.url}
                  src={g.lowResUrl}
                  className={`${imageClass} ${g.highlighted ? '' : 'saturate-0'}`}
                  style={getFanStyle(g, i, 'left', is)}
                />
              ))
            }
          </div>
          {/* RIGHT SIDE */}
          <div className='relative w-80 h-80'>
            {
              rightGallery.map((g, i) => (
                <img 
                  key={g.url}
                  src={g.lowResUrl}
                  className={`${imageClass} ${g.highlighted ? '' : 'saturate-0'}`}
                  style={getFanStyle(g, i, 'right', is)}
                />
              ))
            }
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}


function getFanStyle(g, i, side, is) {
  const seed = pseudoRandom(g.url);

  const spread = 20;
  const vertical = is('xl') ? 175 : 125;
  const jitter = (seed % 10) - 5;
  const rotation = ((seed % 20) - 6);

  const x = (i + 14) * spread * (side === 'left' ? -1 : 1);
  const y = (i * vertical) + jitter;

  return {
    transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`
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