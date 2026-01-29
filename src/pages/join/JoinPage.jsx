import { AnimatePresence, motion } from "motion/react";
import Navigation from "../../components/navigation/navigation";
import { useNavigate } from "react-router-dom";
import { ArrowBigLeftDash, Binoculars, CircleCheckBig, Square, SquareCheck, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTailwindScreen } from "../../components/screens/tailwind-screen/TailwindScreen";
import WhaleLoader from "../../components/loader/WhaleLoader";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";

export function JoinPage() {

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  
  const [pfp, setPfp] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [consent, setConsent] = useState(false);
  const [terms, setTerms] = useState(false);

  const [valid, setValid] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const inputRef = useRef(null);
  const { is } = useTailwindScreen();

  useEffect(() => {
    if(name.trim().length && title.trim().length && consent && terms) setValid(true);
    else if(valid) setValid(false);
  }, [name, title, consent, terms])

  const handlePfpChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeBytes = file.size;
    const sizeKB = sizeBytes / 1024;
    const sizeMB = sizeKB / 1024;

    if(sizeMB > 5) alert('Image cannot be more than 5MB in size');
    else {
      const url = URL.createObjectURL(file);
      setPfp(file);
      setPreviewUrl(url);
    }
  }

  return (
    <div>
      <Navigation />

      <AnimatePresence>{ submitting &&
        <Submitter name={name} title={title} pfpFile={pfp} setSubmitting={setSubmitting} />
      }</AnimatePresence>

      <div className='w-full flex justify-center'>
        <motion.div
          key='content'
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          transition={{duration: 0.5}}
          className='w-full flex justify-center not-md:mt-32 pb-12'
        >
          <div className='w-[90%] max-w-240 flex flex-col items-center'>

            <div className='w-full'>
              <button onClick={() => navigate('/scouts')} className='not-md:text-[#777] md:mb-2 md:px-3 py-1 flex items-center gap-2 transition-all cursor-pointer hover:text-[#0984e3] hover:gap-3'>
                <ArrowBigLeftDash /><h2 className='not-md:hidden'>Scouts</h2>
              </button>
            </div>

            <div className='flex gap-4 items-center mb-8 md:mb-10'>
              <Binoculars size={is('md') ? 35 : 30} />
              <h2 className='text-[18px] md:text-2xl'>Become a Scout</h2>
            </div>

            <input ref={inputRef} type='file' accept='image/*' className='hidden' onChange={handlePfpChange} />
            <div onClick={() => inputRef.current?.click()}  className='w-32.5 aspect-square overflow-hidden rounded-md flex justify-center items-center border-2 cursor-pointer transition-all hover:opacity-70'>
              {
                pfp
                ? <img src={previewUrl} className='object-cover' />
                : <User size={60} />
              }
            </div>
            <p className='text-xs mt-1'>{is('sm') ? 'Click' : 'Tap'} to {pfp ? 'change' : 'add'}</p>

            <input className='mt-8 md:mt-12 w-[95%] max-w-85 text-center' placeholder='first name' value={name} onChange={(e) => setName(e.target.value)} />
            <div className='w-[95%] max-w-80 flex items-center mt-2 md:mt-3 gap-6'>
              <h2>the</h2>
              <input className='w-full max-w-100 text-center' placeholder='title' value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className='w-full max-w-140 flex gap-4 items-center mt-14 md:mt-20'>
              <div className='w-10 shrink-0 p-2 aspect-square rounded-full transition-all cursor-pointer hover:opacity-80 flex justify-center items-center' style={{backgroundColor: consent ? '#16a085' : 'white'}} >
                { consent
                  ? <SquareCheck onClick={() => setConsent(false)} className='text-white' size={25}  />
                  : <Square onClick={() => setConsent(true)} size={25} />
                }
              </div>
              <p className='text-xs md:text-sm leading-3 md:leading-4 text-[#555]'>I consent to the provided information being stored on the Three Whales server, and understand it will not be used for any purpose beyond Three Whales.</p>
            </div>

            <div className='w-full max-w-140 flex gap-4 items-center mt-3 mb-8'>
              <div className='w-10 shrink-0 p-2 aspect-square rounded-full transition-all cursor-pointer hover:opacity-80 flex justify-center items-center' style={{backgroundColor: terms ? '#16a085' : 'white'}} >
                { terms
                  ? <SquareCheck onClick={() => setTerms(false)} className='text-white' size={25}  />
                  : <Square onClick={() => setTerms(true)} size={25} />
                }
              </div>
              <p className='text-xs md:text-sm leading-3 md:leading-4 text-[#555]'>I confirm I am submitting on behalf of myself, and understand that my submission may not be approved if any of the provided information is inappropriate.</p>
            </div>

            <AnimatePresence>{ valid &&
              <motion.button
                initial={{opacity: 0, translateY: '20px'}}
                animate={{opacity: 1, translateY: 0}}
                exit={{opacity: 0, translateY: '20px'}}
                transition={{duration: 0.5, type:'spring'}}
                className='px-4 py-3 bg-black text-white rounded-md tracking-wider cursor-pointer transition-colour hover:text-(--whale-blue)'
                onClick={() => setSubmitting(true)}
                disabled={submitting}
              >
                SUBMIT
              </motion.button>
            }</AnimatePresence>

          </div>
        </motion.div>
      </div>

    </div>
  )
}


function Submitter({name, title, pfpFile, setSubmitting}) {

  const [submitted, setSubmitted] = useState(false);
  const [failed, setFailed] = useState(false);
  const navigate = useNavigate();

  const uid = Math.random().toString(36).substring(2, 12);

  useEffect(() => {
    async function submitScout() {
      try {

        if(submitted || failed) return;

        // Upload Pfp
        let pfp = null;

        if(pfpFile) {
          const ext = pfpFile.name.split(".").pop();
          const storagePath = `unapproved-scouts/${uid}.${ext}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, pfpFile);
          const url = await getDownloadURL(storageRef);

          pfp = {
            url,
            storagePath
          }
        }

        const newScout = {
          uid: uid,
          name: name.trim(),
          title: title.trim(),
          whales: {
            blue: { spotted: false, date: '' },
            green: { spotted: false, date: '' },
            purple: { spotted: false, date: '' },
          },
          created: new Date().toISOString().slice(0, 10),
          pfp: pfp
        }

        const scoutRef = doc(db, 'unapproved-scouts', uid);
        await setDoc(scoutRef, newScout, {merge: true});
        setSubmitted(true);
      }
      catch(err) {
        console.error(err);
        setFailed(true);
      }
    }
    submitScout();
  }, [])

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.1}}
      className='fixed inset-0 bg-black/20 z-100 flex justify-center items-center'
    >
      <div className='w-[95%] p-8 max-w-120 bg-white rounded-lg transition-all'>
        <AnimatePresence mode='wait'>
          {
            submitted 
            ? <motion.div key='submitted' initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.1}} className='flex flex-col gap-6'>
                <h1 className='text-center'>Submitted Successfully</h1>
                <div className='w-full flex justify-center'><CircleCheckBig className='text-[#1abc9c]' size={80} /></div>
                <p className='text-center'>You will appear on the <b>Scouts</b> page once your submission has been approved!</p>
                <button className='bg-black text-white py-2 rounded-sm hover:text-(--whale-blue) transition-all cursor-pointer' onClick={() => navigate('/scouts')}>OK</button>
              </motion.div>
            : failed 
            ? <motion.div key='failed' initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.1}} className='flex flex-col gap-6'>
                <h2>An Error Occurred</h2>
                <p>Your submission could not be uploaded. Please try again.</p>
                <button className='bg-black text-white py-2 rounded-sm hover:text-(--whale-blue) transition-all cursor-pointer' onClick={() => setSubmitting(false)}>OK</button>
              </motion.div>
            : 
              <motion.div key='submitting' initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.1}} className='flex flex-col gap-6'>
                <h1 className='text-center'>Submitting...</h1>
                <WhaleLoader />
              </motion.div>
          }
        </AnimatePresence>
      </div>
    </motion.div>
  )
  
}