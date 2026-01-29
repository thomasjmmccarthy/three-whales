import Navigation from "../../components/navigation/navigation";
import { motion } from "motion/react";
import WhaleImage from '../../assets/whales/group/group-happy.svg';
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import ReactMarkdown from 'react-markdown';

import BlueWhale from '../../assets/whales/happy/blue.svg';
import GreenWhale from '../../assets/whales/happy/green.svg';
import PurpleWhale from '../../assets/whales/happy/purple.svg';


export function AboutPage() {

  const [whales, setWhales] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function getWhales() {
      const whalesRef = collection(db, 'whales');
      const whaleSnaps = await getDocs(whalesRef);
      const data = whaleSnaps.docs.map(doc => doc.data());
      setWhales(data);
    }
    getWhales();
  }, []);

  return (
    <div>
      <Navigation />
      <div className='w-full flex justify-center'>
        <motion.div
          initial={{opacity: 0, scale: 0.9}}
          animate={{opacity: 1, scale: 1}}
          transition={{duration: 0.7, type: 'spring'}}
          className='w-[90%] max-w-4xl mt-44 md:mt-4 flex flex-col items-center pb-12'
        >
          <img src={WhaleImage} className='w-[90%] max-w-70 lg:max-w-80 2xl:max-w-90  drop-shadow-[0_12px_8px_#00000022]' />
          <h1 className='mt-10'>Three Whales</h1>
          <div className='w-[95%] max-w-160 flex flex-col gap-4 mt-8 leading-6'>
            <p>
              This is a very serious website about <b>three extremely important crochet whales.</b>
            </p>
            <p>
              They travel. They meet people. They get photographed performing mildly dangerous stunts. And for 
              reasons nobody can fully explain, their journeys are documented here, with the intensity of a wildlife 
              documentary, and the production value of a school project.
            </p>
            <p>
              It’s part travel blog, part joke, but above all it's an excuse to pretend our small crochet friends are living 
              much more interesting lives than we are.
            </p>
            <p>
              And yes, out of boredom, we also made it competetive, 
              so <span className='font-bold underline cursor-pointer' onClick={() => navigate('/scouts')}>get scouting!</span>
            </p>
          </div>
          { whales &&
            <motion.div
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              transition={{duration: 0.5}}
              className='w-full flex flex-col items-center'
            >
              <hr className='w-[90%] my-12 border' />
              <h1>Your Hosts</h1>
              <div className='w-full grid grid-cols-1 md:grid-cols-3 gap-2 mt-6'>
                {
                  whales.map((w) => <Host w={w} />)
                }
              </div>
              <hr className='w-[90%] mt-12 my-6 border opacity-20' />
              <p className='text-xs opacity-50'>Website Designed & Developed by Thomas McCarthy</p>
            </motion.div>
          }
        </motion.div>
      </div>
    </div>
  )

}


function Host({w}) {

  const whaleIcon = {blue: BlueWhale, green: GreenWhale, purple: PurpleWhale};
  const rotateMax = 15;

  const rotation = Math.random() * (2 * rotateMax) - rotateMax;

  return (
    <div className='relative w-full flex flex-col items-center'>
      <img src={whaleIcon[w.uid]} className='w-[80%] max-w-50' style={{ transform: `rotate(${rotation}deg)` }} />
      <h2>{w.name}</h2>
      <p>the {w.uid} whale</p>
      <div className='w-[90%] md:w-full max-w-120 leading-5 mt-5 mb-8 md:mb-0 text-center md:text-start text-[#333]'>
        <ReactMarkdown>
          {w.bio}
        </ReactMarkdown>
      </div>
    </div>
  )

}