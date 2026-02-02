import { collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter, setDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject, getBytes } from "firebase/storage";
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db, getAllWhales, storage } from "../../../firebase";
import { X, PlusSquare, SquareCheck, Ellipsis, Square, Trash, User, ArrowLeft, ArrowRight } from "lucide-react";
import WhaleLoader from "../../../components/loader/WhaleLoader";

import BlueWhale from '../../../assets/whales/normal/blue.svg';
import GreenWhale from '../../../assets/whales/normal/green.svg';
import PurpleWhale from '../../../assets/whales/normal/purple.svg';
import BronzeWhale from '../../../assets/whales/trophy/bronze.svg';
import SilverWhale from '../../../assets/whales/trophy/silver.svg';
import GoldWhale from '../../../assets/whales/trophy/gold.svg';

export default function ScoutsTab() {

  const [whales, setWhales] = useState(null);
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editSelected, setEditSelected] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [viewUnapproved, setViewUnapproved] = useState(false);
  const PAGE_SIZE = 20;

  const handleCreateScout = () => {
    // Get the datetime in format YYYY-MM-DD
    const dt = new Date();
    const formattedDt = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
    
    // Create blank scout
    const scout = {
      uid: Math.random().toString(36).substring(2, 12),
      created: formattedDt,
      whales: {
        blue: {spotted: false, date: ''},
        green: {spotted: false, date: ''},
        purple: {spotted: false, date: ''},
      },
      name: '',
      title: '',
      pfp: null,
      new: true   // Important
    }

    setSelected(scout);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await Promise.all(
        editSelected.map(async(uid) => {
          const scoutRef = doc(db, viewUnapproved ? 'unapproved-scouts' : 'scouts', uid);
          const snap = await getDoc(scoutRef);
          if(!snap.exists()) return;

          const scout = snap.data();

          const pfp = scout.pfp?.storagePath;
          if(pfp) deleteObject(ref(storage, pfp));
          await deleteDoc(scoutRef);
        })
      );
      setEditSelected([]);
      refreshScouts();
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    async function getWhales() {
      const whalesArray = await getAllWhales();
      const whalesDict = {}
      whalesArray.forEach((whale) => {
        whalesDict[whale.uid] = whale;
        whalesDict[whale.uid].icon = 
          whale.uid === 'blue' ? BlueWhale
          : whale.uid === 'green' ? GreenWhale
          : PurpleWhale
      })
      setWhales(whalesDict);
    }
    getWhales();
  }, []);

  function refreshScouts() {
    setRefreshKey((k) => k + 1);
  }

  if(whales === null) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1 }}
      className='relative'
    >

      <AnimatePresence> { selected !== null &&
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          <ScoutEditor scout={selected} whales={whales} setSelected={setSelected} refreshScouts={refreshScouts} isUnapproved={viewUnapproved} />
        </motion.div>
      }</AnimatePresence>

      <h1 className='w-full text-center md:text-start'>{viewUnapproved ? 'Approve' : 'Scouts'}</h1>

      <div className='w-full flex justify-center mt-6 mb-6'>
        <button
          className='w-[95%] max-w-100 border-2 rounded-md font-bold flex gap-2 justify-center items-center cursor-pointer transition-all hover:bg-[#eee] hover:gap-4 disabled:opacity-20'
          disabled={editMode}
          onClick={() => {
            setViewUnapproved(!viewUnapproved);
            refreshScouts();
          }}
        >
          { viewUnapproved &&
            <ArrowLeft size={18} />
          }
          {
            !viewUnapproved ? 'Approve submissions' : 'Back to scouts'
          }
          { !viewUnapproved &&
            <ArrowRight size={18} />
          }
        </button>
      </div>

      {
        editMode
        ? (
          <div className='absolute w-full top-0'>
            {
              editSelected.length > 0 &&
              <Trash
                className='text-[#d63031] absolute top-2 right-2 cursor-pointer transition-all hover:opacity-75 md:top-18 md:right-auto md:left-3'
                disabled={deleting}
                size={25}
                onClick={handleDelete}
              />
            }
            <button
              onClick={() => {setEditMode(false)}}
              className='absolute top-2 left-2 cursor-pointer transition-all underline font-bold hover:opacity-75 md:left-auto md:right-2'
              size={25}
              disabled={deleting}
            >Done</button>
          </div>
        )
        : (
          <div className='absolute w-full top-0 flex pr-2 pl-2 justify-between items-center gap-8 md:justify-end'>
            <Ellipsis
              onClick={() => {setEditSelected([]); setEditMode(true)}}
              className='cursor-pointer transition-all hover:opacity-75'
              size={25}
            />
            <PlusSquare 
              onClick={handleCreateScout} 
              className='cursor-pointer transition-all hover:opacity-75' 
              size={35} 
            />
          </div>
        )
      }

      <ScoutList 
        pageSize={PAGE_SIZE} 
        setSelected={setSelected} 
        refreshKey={refreshKey} 
        editMode={editMode} 
        editSelected={editSelected} 
        setEditSelected={setEditSelected} 
        deleting={deleting}
        viewUnapproved={viewUnapproved}
      />

    </motion.div>
  )
}


function ScoutList({pageSize, setSelected, refreshKey, editMode, editSelected, setEditSelected, deleting, viewUnapproved}) {
  
  const scoutCollection = viewUnapproved ? 'unapproved-scouts' : 'scouts';

  const [scouts, setScouts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef(null);

  const qBase = useMemo(() => ([
    orderBy("name", "asc"),
    limit(pageSize)
  ]), [pageSize]);

  const loadMore = useCallback(async () => {
    if(loading || !hasMore) return;

    setLoading(true);
    try {
      const q = lastDoc
      ? query(collection(db, scoutCollection), ...qBase, startAfter(lastDoc))
      : query(collection(db, scoutCollection), ...qBase);

      const snap = await getDocs(q);
      const newScouts = snap.docs.map((s) => s.data());

      setScouts((prev) => [...prev, ...newScouts]);

      const newLast = snap.docs[snap.docs.length - 1] ?? null;
      setLastDoc(newLast);

      if(snap.size < pageSize) setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, lastDoc, qBase, pageSize, scoutCollection]);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, scoutCollection),
        ...qBase,
      )

      const snap = await getDocs(q);
      const newScouts = snap.docs.map((d) => d.data());

      setScouts(newScouts);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.size === pageSize);
    } finally {
      setLoading(false);
    }
  }, [qBase, pageSize, scoutCollection]);

  // initial load + refresh
  useEffect(() => {
    setScouts([]);
    setLastDoc(null);
    setHasMore(true);
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadFirstPage, refreshKey, viewUnapproved]);

  // Infinite scroll trigger
  useEffect(() => {
    const el = sentinelRef.current;
    if(!el) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    },
    { root: null, rootMargin: '300px', threshold: 0 }); // prefetch a bit early
    
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (scouts.length === 0 && loading) return (
    <div className='fixed inset-0'>
      <WhaleLoader />
    </div>
  );

  return (
    <div>
      {scouts.map((s) => {
        let fullTitle = `${s.name} the ${s.title}`

        const datetimeArray = s.created.split('-');
        const day = datetimeArray[2];
        const month = datetimeArray[1];
        const year = datetimeArray[0];

        let whalesSpotted = 0;
        if(s.whales.blue.spotted) whalesSpotted+=1
        if(s.whales.green.spotted) whalesSpotted+=1;
        if(s.whales.purple.spotted) whalesSpotted+=1;

        return (
          <div
            className='border-t-2 border-[#aaaaaa] p-3 flex gap-3 md:gap-6 transition-all duration-100 cursor-pointer hover:bg-[#f5f5f5]'
            key={s.uid}
            onClick={() => {
              if(editMode && !deleting) {
                if(editSelected.includes(s.uid)) {
                  setEditSelected((prev) => {return prev.filter((u) => u !== s.uid)});
                } else {
                  setEditSelected((prev) => [...prev, s.uid]);
                }
              }
              else {
                setSelected(s);
              }
            }}
          >
            {
              editMode
              ? (
                <div className='w-10 min-w-4 mt-1.5'>
                  {
                    editSelected.includes(s.uid)
                    ? <SquareCheck className='text-[#00b894]' />
                    : <Square className='text-[#999]' />
                  }
                </div>
              )
              : (
                <div className='w-8 md:w-10 min-w-4 md:-mt-1 flex items-center'>
                  {
                    whalesSpotted === 3
                    ? <WhaleIndicator icon={GoldWhale} />
                    : whalesSpotted === 2
                    ? <WhaleIndicator icon={SilverWhale} />
                    : whalesSpotted === 1
                    ? <WhaleIndicator icon={BronzeWhale} />
                    : null
                  }
                </div>
              )
            }
          
            <div className='w-full flex justify-between items-center'>
              <div className='w-full'>
                <p className='md:text-xl font-bold truncate'>{fullTitle}</p>
                <p className='text-xs md:text-sm leading-4 md:leading-5'>Joined: {day}/{month}/{year}</p>
              </div>
              {
                s.pfp && 
                <div className='w-12 shrink-0 rounded-md aspect-square overflow-hidden flex items-center justify-center'>
                  <img src={s.pfp.url} className='object-cover w-full h-full' />
                </div>
              }
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WhaleIndicator({icon}) {
  return (
    <div className='w-full min-w-4 flex items-start'>
      <img className='w-full -mt-1 md:mt-0' src={icon} />
    </div>
  )
}


function ScoutEditor({scout, whales, setSelected, refreshScouts, isUnapproved}) {

  const today = new Date().toISOString().split('T')[0];

  const getDateSection = (i, str) => {
    if(str !== '') return str.split('-')[i];
    return today.split('-')[i];
  }

  // Whales
  const [blueWhaleSpotted, setBlueWhaleSpotted] = useState(scout.whales.blue.spotted);
  const [blueWhaleDay, setBlueWhaleDay] = useState(getDateSection(2, scout.whales.blue.date));
  const [blueWhaleMonth, setBlueWhaleMonth] = useState(getDateSection(1, scout.whales.blue.date));
  const [blueWhaleYear, setBlueWhaleYear] = useState(getDateSection(0, scout.whales.blue.date));

  const [greenWhaleSpotted, setGreenWhaleSpotted] = useState(scout.whales.green.spotted);
  const [greenWhaleDay, setGreenWhaleDay] = useState(getDateSection(2, scout.whales.green.date));
  const [greenWhaleMonth, setGreenWhaleMonth] = useState(getDateSection(1, scout.whales.green.date));
  const [greenWhaleYear, setGreenWhaleYear] = useState(getDateSection(0, scout.whales.green.date));

  const [purpleWhaleSpotted, setPurpleWhaleSpotted] = useState(scout.whales.purple.spotted);
  const [purpleWhaleDay, setPurpleWhaleDay] = useState(getDateSection(2, scout.whales.purple.date));
  const [purpleWhaleMonth, setPurpleWhaleMonth] = useState(getDateSection(1, scout.whales.purple.date));
  const [purpleWhaleYear, setPurpleWhaleYear] = useState(getDateSection(0, scout.whales.purple.date));

  // Details
  const [scoutName, setScoutName] = useState(scout.name);
  const [title, setTitle] = useState(scout.title);

  // Datetime
  const [day, setDay] = useState(scout.created.split('-')[2]);
  const [month, setMonth] = useState(scout.created.split('-')[1]);
  const [year, setYear] = useState(scout.created.split('-')[0]);

  // PFP
  const inputRef = useRef(null);
  const [pfp, setPfp] = useState(scout.pfp);
  const initialPfp = scout.pfp;

  // Editing
  const [fullTitle, setFullTitle] = useState('');
  const [edited, setEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullTitle(`${scoutName} the ${title}`);
  }, [blueWhaleSpotted, greenWhaleSpotted, purpleWhaleSpotted, title])

  const handlePfpChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPfp({
      url: url,
      file: file,
    });

    setEdited(true);
  }

  useEffect(() => {
    return () => {
      if (pfp && initialPfp && pfp.url !== initialPfp.url) URL.revokeObjectURL(pfp.url);
    }
  }, [pfp, initialPfp]);

  async function handleSave() {
    setSaving(true);

    // Validate post
    if(scoutName.trim() === '') alert('Every scout needs a name');
    else if(title.trim() === '') alert('Every scout needs a title');
    else if(day.length != 2 || month.length != 2 || year.length != 4) alert('The "joined" date is formatted wrong. Must be DD/MM/YYYY');
    // Validate whale spotting
    else if(blueWhaleSpotted && (blueWhaleDay.length != 2 || blueWhaleMonth.length != 2 || blueWhaleYear.length != 4)) alert(`The spotting date for ${whales['blue'].name} is formatted wrong. Must be DD/MM/YYYY`);
    else if(greenWhaleSpotted && (greenWhaleDay.length != 2 || greenWhaleMonth.length != 2 || greenWhaleYear.length != 4)) alert(`The spotting date for ${whales['green'].name} is formatted wrong. Must be DD/MM/YYYY`);
    else if(purpleWhaleSpotted && (purpleWhaleDay.length != 2 || purpleWhaleMonth.length != 2 || purpleWhaleYear.length != 4)) alert(`The spotting date for ${whales['purple'].name} is formatted wrong. Must be DD/MM/YYYY`);

    else {
      try {
        if(!scout?.uid) throw new Error("Missing scout id");

        let newPfp = initialPfp;

        // Handle Pfp change
        if(pfp && (!initialPfp || pfp.url !== initialPfp.url)) {
                    
          if(initialPfp) await deleteObject(ref(storage, initialPfp.storagePath));

          // Upload new Pfp
          const ext = pfp.file.name.split(".").pop();
          const storagePath = `scouts/${scout.uid}.${ext}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, pfp.file);

          const url = await getDownloadURL(storageRef);

          newPfp = {
            url,
            storagePath
          }
        }

        // Update post data
        const newWhales = {
          blue: {
            spotted: blueWhaleSpotted,
            date: (blueWhaleSpotted ? `${blueWhaleYear}-${blueWhaleMonth}-${blueWhaleDay}` : '')
          },
          green: {
            spotted: greenWhaleSpotted,
            date: (greenWhaleSpotted ? `${greenWhaleYear}-${greenWhaleMonth}-${greenWhaleDay}` : '')
          },
          purple: {
            spotted: purpleWhaleSpotted,
            date: (purpleWhaleSpotted ? `${purpleWhaleYear}-${purpleWhaleMonth}-${purpleWhaleDay}` : '')
          }
        }

        const newCreated = `${year}-${month}-${day}`

        const newScout = {
          uid: scout.uid,
          name: scoutName,
          title: title,
          whales: newWhales,
          created: newCreated,
          pfp: newPfp
        }

        const scoutRef = doc(db, 'scouts', scout.uid);
        await setDoc(scoutRef, newScout, {merge: true});

        // Force the PostsList to refresh
        refreshScouts();

        if(scout.new) setSelected(null);
        else {
          setSelected({...scout, ...newScout});
          setEdited(false);
        }
      }
      catch(err) {
        console.error(err);
      }
    }
    setSaving(false);
  }

  async function handleApprove() {
    setSaving(true);

    try {
      let newPfp = null;
      let fromRef;

      // Copy pfp to main scouts bucket
      if(scout.pfp) {
        fromRef = ref(storage, scout.pfp.storagePath);
        const newStoragePath = `scouts/${scout.pfp.storagePath.split('/').pop()}`;
        const toRef = ref(storage, newStoragePath);
        const bytes = await getBytes(fromRef);
        await uploadBytes(toRef, bytes);
        const url = await getDownloadURL(toRef);
        newPfp = {storagePath: newStoragePath, url: url};
      }

      const newScout = {
        uid: scout.uid,
        name: scoutName,
        title: title,
        whales: {
          blue: { spotted: blueWhaleSpotted, date: (blueWhaleSpotted ? `${blueWhaleYear}-${blueWhaleMonth}-${blueWhaleDay}` : '') },
          green: { spotted: greenWhaleSpotted, date: (greenWhaleSpotted ? `${greenWhaleYear}-${greenWhaleMonth}-${greenWhaleDay}` : '') },
          purple: { spotted: purpleWhaleSpotted, date: (purpleWhaleSpotted ? `${purpleWhaleYear}-${purpleWhaleMonth}-${purpleWhaleDay}` : '') }
        },
        created: `${year}-${month}-${day}`,
        pfp: newPfp
      };

      const scoutDoc = doc(db, 'scouts', scout.uid);
      await setDoc(scoutDoc, newScout);

      // Delete unapproved pfp
      if(scout.pfp) await deleteObject(fromRef);
      
      // Delet unapproved scout object
      const oldScoutDoc = doc(db, 'unapproved-scouts', scout.uid);
      await deleteDoc(oldScoutDoc);

      refreshScouts();
      setSelected(null);
    }
    catch(err) {
      alert('Could not approve scout');
      console.error(err);
      setSaving(false);
    }
  }

  return (
    <div className='fixed inset-0 flex justify-center items-center z-20'>
      <div className="absolute inset-0 bg-black/20" onClick={() => setSelected(null)} />
      <div className='w-full h-full overflow-y-auto relative bg-white p-8 pb-18 md:pb-8 md:max-h-[90%] z-30 md:rounded-lg md:w-[90%] md:max-w-200 md:h-auto'>

        <X disabled={saving} className='absolute left-4 top-6 text-[#aaaaaa] cursor-pointer hover:text-black md:hidden' onClick={() => setSelected(null)} />

        <AnimatePresence>{ ((edited && !isUnapproved) || scout.new) &&
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className='fixed z-100 not-md:bg-white/90 not-md:p-3 not-md:pt-4 not-md:rounded-lg md:absolute right-4 top-0 md:right-8 md:top-8 flex gap-2 md:gap-4'
          >
            <motion.button
              className='bg-white hover:bg-[#fdcb6e] rounded-md text-black font-bold border-2 px-3 py-1 shadow-md cursor-pointer transition-all'
              onClick={handleSave}
              disabled={saving}
            >
              {scout.new ? (saving ? 'Creating...' : 'CREATE') : (saving ? 'Saving...' : 'SAVE')}
            </motion.button>
          </motion.div>
          
        }</AnimatePresence>

        <AnimatePresence>{ (!scout.new && isUnapproved) &&
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className='fixed z-100 not-md:bg-white/90 not-md:p-3 not-md:pt-4 not-md:rounded-lg md:absolute right-4 top-0 md:right-8 md:top-8 flex'
          >
            <motion.button
              className='bg-white hover:bg-[#fdcb6e] rounded-md text-black font-bold border-2 px-3 py-1 shadow-md cursor-pointer transition-all'
              onClick={handleApprove}
              disabled={saving}
            >
              {saving ? 'Approving...' : 'APPROVE'}
            </motion.button>
          </motion.div>
          
        }</AnimatePresence>

        <h2 className='w-full md:w-[90%] flex not-md:justify-center text-center items-center not-md:text-sm line-clamp-2 md:line-clamp-1 mt-8 mb-4 md:mb-8 md:mt-0 md:text-start'>{scout.new ? 'New Scout' : fullTitle}</h2>

        <input ref={inputRef} type='file' accept='image/*' className='hidden' onChange={handlePfpChange} />
        <div className='w-full flex justify-center mb-3 md:mb-4'>
          <div onClick={() => inputRef.current?.click()}  className='w-32.5 aspect-square overflow-hidden rounded-md flex justify-center items-center border-2 cursor-pointer transition-all hover:opacity-70'>
            {
              pfp
              ? <img src={pfp.url} className='object-cover w-full h-full' />
              : <User size={60} />
            }
          </div>
        </div>

        <form className='flex flex-col items-center mb-8 md:mb-10' onChange={() => setEdited(true)}>
          <div className='w-full max-w-60 flex flex-col justify-center items-center mb-2'>
            <input className='w-full min-w-40 font-bold text-center' placeholder='first name' value={scoutName} onChange={(e) => setScoutName(e.target.value)} />
            <div className='w-full flex items-center gap-6'>
              <p>the</p>
              <input className='w-full font-bold text-center' placeholder='title' value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>
        </form>

        <p className='text-center mb-2 not-md:text-sm'>Has Spotted:</p>
        <div className='w-full flex flex-col items-center gap-1'>
          <WhaleCheckBox
            icon={BlueWhale}
            name={whales['blue'].name}
            spotted={blueWhaleSpotted} setSpotted={setBlueWhaleSpotted}
            day={blueWhaleDay} month={blueWhaleMonth} year={blueWhaleYear}
            setDay={setBlueWhaleDay} setMonth={setBlueWhaleMonth} setYear={setBlueWhaleYear}
            setEdited={setEdited} colour='#38b6ff' />
          <WhaleCheckBox 
            icon={GreenWhale}
            name={whales['green'].name}
            spotted={greenWhaleSpotted}
            setSpotted={setGreenWhaleSpotted}
            day={greenWhaleDay} month={greenWhaleMonth} year={greenWhaleYear}
            setDay={setGreenWhaleDay} setMonth={setGreenWhaleMonth} setYear={setGreenWhaleYear}
            setEdited={setEdited} colour='#7ed957' />
          <WhaleCheckBox
            icon={PurpleWhale}
            name={whales['purple'].name}
            spotted={purpleWhaleSpotted} setSpotted={setPurpleWhaleSpotted}
            day={purpleWhaleDay} month={purpleWhaleMonth} year={purpleWhaleYear}
            setDay={setPurpleWhaleDay} setMonth={setPurpleWhaleMonth} setYear={setPurpleWhaleYear}
            setEdited={setEdited} colour='#b28cff' />
        </div>

        <form className='flex flex-col items-center mt-10' onChange={() => setEdited(true)}>
          <p className='not-md:text-sm'>Joined:</p>
          <div className='w-[25%] min-w-40 flex mb-6'>
            <input className='text-center w-1/3 text-sm font-bold' placeholder='DD' value={day} onChange={(e) => setDay(e.target.value)} />
            <p className='mt-2'>/</p>
            <input className='text-center w-1/3 text-sm font-bold' placeholder='MM' value={month} onChange={(e) => setMonth(e.target.value)} />
            <p className='mt-2'>/</p>
            <input className='text-center w-1/3 text-sm font-bold' placeholder='YYYY' value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
        </form>
      </div>
    </div>
  )

}

function WhaleCheckBox({icon, name, spotted, setSpotted, day, month, year, setDay, setMonth, setYear, setEdited, colour}) {

  function hexToRgba(hex, alpha) {
    let c = hex.replace("#", "");
    if (c.length === 3) {
      c = c.split("").map(x => x + x).join("");
    }
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return (
    <div
      className='select-none cursor-pointer w-full md:w-[90%] py-2 md:p-1 flex gap-2 items-center justify-center rounded-md border-2 transition-all duration-100'
      style={{
        ...{backgroundColor: spotted===true ? hexToRgba(colour, 0.2) : '#ffffff'},
        ...{borderColor: spotted===true ? colour : '#eeeeee'}
      }}
      onClick={() => {
        setSpotted(!spotted);
        setEdited(true);
      }}
    >
      <div className='w-1/4 flex flex-col justify-center items-center md:gap-2'>
        <img className='w-10' src={icon} />
        <p className='font-bold not-md:text-sm'>{name}</p>
      </div>
      <AnimatePresence>{
        spotted &&
        <motion.div
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
          transition={{duration: 0.1}}
          className='w-2/3 flex items-center gap-2 md:w-2/3'
        >
          <input placeholder='DD' className='w-1/3 text-center text-sm font-bold' onClick={(e) => e.stopPropagation()} value={day} onChange={(e) => {
            setDay(e.target.value);
            setEdited(true);
          }}/>
          <p>/</p>
          <input placeholder='MM' className='w-1/3 text-center text-sm font-bold' onClick={(e) => e.stopPropagation()} value={month} onChange={(e) => {
            setMonth(e.target.value);
            setEdited(true);
          }}/>
          <p>/</p>
          <input placeholder='YYYY' className='w-1/3 text-center text-sm font-bold' onClick={(e) => e.stopPropagation()} value={year} onChange={(e) => {
            setYear(e.target.value);
            setEdited(true);
          }}/>
        </motion.div>
      }</AnimatePresence>
    </div>
  )
}