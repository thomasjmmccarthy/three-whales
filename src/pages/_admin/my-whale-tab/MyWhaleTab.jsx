import { getAuth } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react"
import { db, logout } from "../../../firebase";
import { AnimatePresence, motion } from "motion/react";

import WhaleBlue from '../../../assets/whales/normal/blue.svg';
import WhaleGreen from '../../../assets/whales/normal/green.svg';
import WhalePurple from '../../../assets/whales/normal/purple.svg';

import { LogOutIcon } from "lucide-react";

import MarkDownEditor from "../../../components/markdown/MarkdownEditor";

export default function MyWhaleTab() {

  const [whale, setWhale] = useState(null);
  const [name, setName] = useState(null);
  const [bio, setBio] = useState(null);
  const [hasChanged, setHasChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const uid = getAuth().currentUser?.uid;

  useEffect(() => {
    async function fetchWhale() {
      const userDoc = doc(db, "users", uid);
      const userSnap = await getDoc(userDoc);
      if(userSnap.exists()) {
        const whaleID = userSnap.data().whale_id;
        const whaleDoc = doc(db, "whales", whaleID);
        const whaleSnap = await getDoc(whaleDoc);
        if(whaleSnap.exists()) {
          const data = whaleSnap.data();
          setName(data.name);
          setBio(data.bio);
          setWhale(data);
        };
      }
    }
    if(uid) fetchWhale();
  }, [])

  const slugify = (s) => s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const handleSave = async() => {
    setIsSaving(true);
    const newPublicID = slugify(name);

    // Check if the public ID is being updated, and if so, that it is unique
    if(whale.public_id !== newPublicID) {
      const q = query(
        collection(db, "whales"),
        where("public_id", "==", newPublicID),
        limit(1)
      );
      const snap = await getDocs(q);
      
      if (snap.docs.length > 0) alert('This whale name is already in use!');
      return;
    }

    // Update the whale
    try {
      const docRef = doc(db, "whales", whale.uid);
      await setDoc(docRef, { name: name, public_id: newPublicID, bio: bio }, { merge: true })
      setHasChanged(false);
    }
    catch(err) {
      alert("Could not save!");
      console.error(err);
    }
    finally {
      setIsSaving(false);
    }
    
  }

  if(whale === null) return null;

  let whaleIcon;
  if (whale.uid === 'blue') whaleIcon = WhaleBlue;
  else if (whale.uid === 'green') whaleIcon = WhaleGreen;
  else whaleIcon = WhalePurple;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1 }}
      className='relative'
    >

      <div title='Log Out' className='absolute top-1 right-2'>
        <LogOutIcon className='cursor-pointer transition-all duration-100 hover:text-(--whale-blue)' onClick={logout} />
      </div>

      <h1 className='text-center md:text-start'>My Whale</h1>

      <div className='flex flex-col md:flex-row'>
        <div className='w-full flex justify-center items-start order-1 mb-4 md:mb-0 md:w-1/3 md:justify-end md:order-2'>
          <img className='w-50 drop-shadow-[0_20px_5px_rgba(0,0,0,0.1)]' src={whaleIcon} />
        </div>

        <div className='w-full flex flex-col justify-center items-center gap-4 order-2 md:items-start md:w-2/3 md:order-1'>
          <p className='w-[90%] text-start -mb-4 font-bold md:mt-6'>Name</p>
          <input className='w-[90%]' placeholder='name' value={name} onChange={(e) => {setName(e.target.value); setHasChanged(true);}} />
          <p className='w-[90%] text-start -mt-3 ml-1 text-xs italic opacity-60'>the {whale.uid.replace(/^./, whale.uid[0].toUpperCase())} Whale</p>
          <p className='w-[90%] text-start -mb-4 mt-4 font-bold'>Bio</p>
          <MarkDownEditor className='w-[90%] mb-4 not-md:text-sm' value={bio} onChange={(e) => {setBio(e); setHasChanged(true);}} placeholder='bio' />
          <AnimatePresence>{hasChanged && 
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} 
              className='not-md:mb-6 cursor-pointer rounded-md bg-black text-white p-2.5 w-30 transition-all hover:text-(--whale-blue) hover:shadow-lg'
              onClick={handleSave}
              disabled={isSaving}
            >{isSaving? 'SAVING...' : 'SAVE'}</motion.button>
          }</AnimatePresence>
        </div>
      </div>

    </motion.div>
  )
}