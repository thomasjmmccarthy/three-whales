import { motion } from "motion/react";
import { useMemo } from "react";

import statements from './statements.json';

export function TimelineLoader({timer}) {

  const mmdd = useMemo(
    () => {
      const now = new Date();
      return String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
    }, []
  )

  const statement = useMemo(() => {
    if(Object.keys(statements.events).includes(mmdd)) return statements.events[mmdd][Math.floor(Math.random() * statements.events[mmdd].length)];
    return statements.generic[Math.floor(Math.random() * statements.generic.length)]
  },[]);

  const animScale = 1500;

  return (
    <motion.div
      className="w-full h-dvh md:h-[calc(100dvh-150px)] flex justify-center items-center"
      initial={{scale: 0.95, opacity: 0}}
      animate={{scale: 1, opacity: 1}}
      exit={{scale: 1.2, opacity: 0}}
      transition={{duration: timer/animScale, type:'spring'}}
    >
      <motion.p
        className='-mt-3 md:mt-0 text-sm md:text-[16px]'
      >three whales {statement}...</motion.p>
    </motion.div>
  )
}