import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";


export function MemoryDisplay({selected, setSelected}) {

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if(!selected) setLoaded(false);
  }, [selected])

  return (
    <AnimatePresence>
    {
      selected && 
      <motion.div
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        exit={{opacity: 0}}
        transition={{duration: 0.1}}
        className='fixed inset-0 z-200 flex justify-center items-center bg-black/20'
        onClick={() => setSelected(null)}
      >
        <motion.div
          initial={{y: 400, opacity: 0}}
          animate={{y: 0, opacity: 1}}
          transition={{duration: 0.5, delay: 0.25, type: 'spring'}}
          className='w-[95%] max-w-100 bg-white rounded-lg p-4'
        >
          <div className='relative w-full aspect-square overflow-hidden transition-all'>
            <img onLoad={() => setLoaded(true)} className={`z-0 w-full h-full object-cover ${!loaded ? 'hidden' : ''}`} src={selected.url} />
            <img className={`z-1 w-full h-full object-cover transition-all ${loaded ? 'opacity-0' : 'opacity-100'}`} src={selected.lowResUrl} />
          </div>
          <p className='text-xs font-bold mt-3 text-end'>{selected.date}</p>
        </motion.div>
      </motion.div>
    }
    </AnimatePresence>
  )

}