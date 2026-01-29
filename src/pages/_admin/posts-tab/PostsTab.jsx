import { collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter, setDoc, where, deleteDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db, getAllWhales, storage } from "../../../firebase";
import { PlusSquare, ArrowRight, ArrowLeft, SquareCheck, Ellipsis, Square, Trash } from "lucide-react";
import WhaleLoader from "../../../components/loader/WhaleLoader";

import BlueWhale from '../../../assets/whales/normal/blue.svg';
import GreenWhale from '../../../assets/whales/normal/green.svg';
import PurpleWhale from '../../../assets/whales/normal/purple.svg';
import { getAuth } from "firebase/auth";
import { PostEditor } from "./PostEditor";

export default function PostsTab() {

  const [userData, setUserData] = useState(null);
  const [whales, setWhales] = useState(null);
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [draft, setDraft] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editSelected, setEditSelected] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const PAGE_SIZE = 20;

  const handleCreateBlankPost = () => {
    // Get the datetime in format YYYY-MM-DD-HH:MM
    const dt = new Date();
    const formattedDt = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}-${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`;
    
    // Create blank post
    const post = {
      uid: Math.random().toString(36).substring(2, 12),
      datetime: formattedDt,
      whales: [userData.whale_id],
      title: '',
      content: '',
      gallery: [],
      draft: userData.whale_id,  // IMPORTANT
    }

    setSelected(post);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await Promise.all(
        editSelected.map(async(uid) => {
          const postRef = doc(db, 'posts', uid);
          const snap = await getDoc(postRef);
          if(!snap.exists()) return;

          const post = snap.data();

          const gallery = post.gallery ?? [];
          const paths = gallery.map((img) => img?.storagePath).filter(Boolean);

          await Promise.allSettled(
            paths.map((path) => deleteObject(ref(storage, path)))
          );

          await deleteDoc(postRef);
        })
      );
      setEditSelected([]);
      refreshPosts();
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
    async function getUserData() {
      const user = getAuth();
      const userDoc = doc(db, 'users', user.currentUser.uid);
      const userSnap = await getDoc(userDoc);
      setUserData(userSnap.data());
    }
    getWhales();
    getUserData();
  }, []);

  function refreshPosts() {
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
          <PostEditor post={selected} whales={whales} setSelected={setSelected} refreshPosts={refreshPosts} />
        </motion.div>
      }</AnimatePresence>

      <h1 className='w-full text-center md:text-start'>{draft ? 'My Drafts' : 'Posts'}</h1>

      <div className='w-full flex justify-center mt-6 mb-6'>
        <button
          className='w-[95%] max-w-100 border-2 rounded-md font-bold flex gap-2 justify-center items-center cursor-pointer transition-all hover:bg-[#eee] hover:gap-4 disabled:opacity-20'
          disabled={editMode}
          onClick={() => {
            const newValue = draft ? false : userData.whale_id;
            setDraft(newValue);
            refreshPosts();
          }}
        >
          { draft &&
            <ArrowLeft size={18} />
          }
          {
            !draft ? 'View my drafts' : 'Back to posts'
          }
          { !draft &&
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
              onClick={handleCreateBlankPost} 
              className='cursor-pointer transition-all hover:opacity-75' 
              size={35} 
            />
          </div>
        )
      }

      <PostList 
        pageSize={PAGE_SIZE} 
        whales={whales} 
        draft={draft} 
        setSelected={setSelected} 
        refreshKey={refreshKey} 
        editMode={editMode} 
        editSelected={editSelected} 
        setEditSelected={setEditSelected} 
        deleting={deleting}
      />

    </motion.div>
  )
}


function PostList({pageSize, whales, setSelected, refreshKey, draft, editMode, editSelected, setEditSelected, deleting}) {
  const [posts, setPosts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef(null);

  const qBase = useMemo(() => ([
    where("draft", "==", draft),
    orderBy("datetime", "desc"),
    limit(pageSize)
  ]), [draft, pageSize]);

  const loadMore = useCallback(async () => {
    if(loading || !hasMore) return;

    setLoading(true);
    try {
      const q = lastDoc
      ? query(collection(db, 'posts'), ...qBase, startAfter(lastDoc))
      : query(collection(db, 'posts'), ...qBase);

      const snap = await getDocs(q);
      const newPosts = snap.docs.map((p) => p.data());

      setPosts((prev) => [...prev, ...newPosts]);

      const newLast = snap.docs[snap.docs.length - 1] ?? null;
      setLastDoc(newLast);

      if(snap.size < pageSize) setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, lastDoc, qBase, pageSize]);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'posts'),
        ...qBase,
      );

      const snap = await getDocs(q);
      const newPosts = snap.docs.map((d) => d.data());

      setPosts(newPosts);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.size === pageSize);
    } finally {
      setLoading(false);
    }
  }, [qBase, pageSize]);

  // initial load + refresh
  useEffect(() => {
    setPosts([]);
    setLastDoc(null);
    setHasMore(true);
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadFirstPage, refreshKey]);

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

  if (posts.length === 0 && loading) return (
    <div className='fixed inset-0'>
      <WhaleLoader />
    </div>
  );

  return (
    <div>
      {posts.map((p, i) => {
        let fullTitle = '';
        if(p.whales.length === 3) fullTitle = 'Three Whales'
        else {
          p.whales.forEach((whaleID, index) => {
            if (index === p.whales.length - 1) fullTitle += whales[whaleID].name;
            else fullTitle += `${whales[whaleID].name} & `
          })
        }
        fullTitle += ` ${p.title}`

        const preview = p.content.length > 75 ? `${p.content.slice(0, 75)}…` : p.content;

        const datetimeArray = p.datetime.split('-');
        const day = datetimeArray[2];
        const month = datetimeArray[1];
        const year = datetimeArray[0];

        return (
          <div
            className='border-t-2 border-[#aaaaaa] p-3 flex gap-6 transition-all duration-100 cursor-pointer hover:bg-[#f5f5f5]'
            key={i}
            onClick={() => {
              if(editMode && !deleting) {
                if(editSelected.includes(p.uid)) {
                  setEditSelected((prev) => {return prev.filter((u) => u !== p.uid)});
                } else {
                  setEditSelected((prev) => [...prev, p.uid]);
                }
              }
              else {
                setSelected(p);
              }
            }}
          >
            {
              editMode
              ? (
                <div className='w-4 min-w-4 mt-1.5 sm:w-6 md:w-20'>
                  {
                    editSelected.includes(p.uid)
                    ? <SquareCheck className='text-[#00b894]' />
                    : <Square className='text-[#999]' />
                  }
                </div>
              )
              : (
                <div className='w-4 min-w-4 flex flex-col justify-start mt-1.5 sm:mt-0 sm:w-6 md:w-20 md:flex-row'>
                  {p.whales.includes('blue') && <WhaleIndicator icon={BlueWhale} />}
                  {p.whales.includes('green') && <WhaleIndicator icon={GreenWhale} />}
                  {p.whales.includes('purple') && <WhaleIndicator icon={PurpleWhale} />}
                </div>
              )
            }
          
            <div className='w-full'>
              <div className='w-full grid grid-cols-[1fr_auto] items-baseline gap-6'>
                <p className='text-lg md:text-xl font-bold truncate'>{fullTitle}</p>
                <p className='text-lg md:text-xl font-bold text-right whitespace-nowrap'>{`${day}/${month}/${year}`}</p>
              </div>
              <p className='italic text-sm leading-5'>{preview}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WhaleIndicator({icon}) {
  return (
    <div className='w-full min-w-3 mt-1 flex items-start md:w-1/3'>
      <img className='w-full -mt-1 md:mt-0' src={icon} />
    </div>
  )
}