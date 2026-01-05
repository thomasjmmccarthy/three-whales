import Blue from '../../assets/whales/happy/blue.svg';
import Green from '../../assets/whales/happy/green.svg';
import Purple from '../../assets/whales/happy/purple.svg';

import { motion } from 'motion/react';

export default function WhaleLoader({ size=96 }) {

  const whales = [Blue, Green, Purple];
  const randomWhale = whales[Math.floor(Math.random() * whales.length)];

  return (
    <div className='flex items-center justify-center w-full h-full drop-shadow-lg'>
      <motion.img
        src={randomWhale}
        alt="Loading…"
        style={{ width: size, height: size }}
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          duration: 1,
          ease: "linear",
        }}
        draggable={false}
      />
    </div>
  )

}