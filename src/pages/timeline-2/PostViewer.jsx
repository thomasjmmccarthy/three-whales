import { AnimatePresence, motion } from "motion/react";


export function PostViewer({postId, navigate, is}) {

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
            onClick={() => navigate('/timeline/',{replace:true})} 
          >

          </motion.div>
      }
      {
        (postId && !is('md')) &&
          <motion.div 
            className='fixed w-full h-dvh flex justify-center items-center bg-white shadow-[0px_2px_12px_#00000020] z-20'
            variants={mobileVariants}
            initial='hidden'
            animate='show'
            exit='hidden'
            onClick={() => navigate('/timeline/',{replace:true})} 
          >

          </motion.div>
      }
    </AnimatePresence>
  );
}