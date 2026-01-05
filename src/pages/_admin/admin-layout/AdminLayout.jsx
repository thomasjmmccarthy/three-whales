import { NavLink, Outlet } from "react-router-dom"

import WhaleGrey from        '../../../assets/whales/grey/grey.svg';
import WhaleBlue from        '../../../assets/whales/normal/blue.svg';
import WhaleGreen from       '../../../assets/whales/normal/green.svg';
import WhalePurple from      '../../../assets/whales/normal/purple.svg';
import WhaleBlueHappy from   '../../../assets/whales/happy/blue.svg';
import WhaleGreenHappy from  '../../../assets/whales/happy/green.svg';
import WhalePurpleHappy from '../../../assets/whales/happy/purple.svg';

import ScoutsGrey from '../../../assets/icons/cast/grey.svg';
import ScoutsHover from '../../../assets/icons/cast/hover.svg';
import ScoutsActive from '../../../assets/icons/cast/active.svg';

import PostsGrey from '../../../assets/icons/posts/grey.svg';
import PostsHover from '../../../assets/icons/posts/hover.svg';
import PostsActive from '../../../assets/icons/posts/active.svg';

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { getAuth } from "firebase/auth";
import { db } from "../../../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function AdminLayout() {
  
  return (
    <div className='w-full flex justify-center pt-12'>
      <main className='w-[90%] max-w-3xl mb-22'>
        <Outlet />
      </main>

      <AdminNavBar />
    </div>
  )

}


function AdminNavBar() {

  const [myWhaleID, setMyWhaleID] = useState(null);
  const uid = getAuth().currentUser?.uid;

  useEffect(() => {
    async function fetchData() {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      if(snap.exists()) setMyWhaleID(snap.data().whale_id);
    }
    if(uid) fetchData();
  }, [])

  if(myWhaleID === null) return null;

  let whaleIcon;
  let whaleHappyIcon;

  if(myWhaleID === 'blue') {
    whaleIcon = WhaleBlue;
    whaleHappyIcon = WhaleBlueHappy;
  }
  else if(myWhaleID === 'green') {
    whaleIcon = WhaleGreen;
    whaleHappyIcon = WhaleGreenHappy;
  }
  else {
    whaleIcon = WhalePurple;
    whaleHappyIcon = WhalePurpleHappy;
  }

  return (
    <nav className='fixed w-full bottom-0 h-20 flex justify-between shadow-[0px_-2px_12px_#00000020] bg-white pl-8 pr-8 md:justify-center md:gap-10'>
      <Tab to='posts' label='Posts' icon={PostsGrey} hoverIcon={PostsHover} activeIcon={PostsActive} />
      <Tab to='scouts' label='Scouts' icon={ScoutsGrey} hoverIcon={ScoutsHover} activeIcon={ScoutsActive} />
      <Tab to='my-whale' label='My Whale' icon={WhaleGrey} hoverIcon={whaleIcon} activeIcon={whaleHappyIcon} />
    </nav>
  )
}


function Tab({to, label, icon, hoverIcon, activeIcon}) {

  return (
    <NavLink
      to={`/admin/${to}`}
    >
      {({ isActive }) => (
        <div className='h-full w-20 flex flex-col items-center justify-center -mt-2'>
          <TabIcon 
            isActive={isActive}
            grey={icon}
            hover={hoverIcon}
            active={activeIcon}
          />
          <p className='-mt-4 text-xs' style={{fontWeight: isActive ? '600' : '100'}}>{label}</p>
        </div>
      )}
    </NavLink>
  )
}


function TabIcon({ isActive, grey, hover, active }) {

  const [hovered, setHovered] = useState(false);

  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='w-10 h-full relative flex justify-center items-center'
    >
      <IconLayer icon={grey} visible={!isActive && !hovered} />
      <IconLayer icon={hover} visible={!isActive && hovered} />
      <IconLayer icon={active} visible={isActive} />
    </div>
  )

}


function IconLayer({ visible, icon }) {

  const variants = {
    show: { opacity: 1 },
    hide: { opacity: 0 }
  };

  return (
    <motion.div
      className='absolute inset-0 w-full flex justify-center'
      initial={false}
      variants={variants}
      animate={visible? 'show' : 'hide'}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <img className='w-10' src={icon} />
    </motion.div>
  );
}