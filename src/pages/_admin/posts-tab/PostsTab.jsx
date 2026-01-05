import { collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter, setDoc, where, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db, getAllWhales, storage } from "../../../firebase";
import { X, PlusSquare, GripHorizontal, ArrowRight, ArrowLeft, SquareCheck, Ellipsis, Square, Trash } from "lucide-react";
import WhaleLoader from "../../../components/loader/WhaleLoader";
import MarkdownEditor from '../../../components/markdown/MarkdownEditor';

import BlueWhale from '../../../assets/whales/normal/blue.svg';
import GreenWhale from '../../../assets/whales/normal/green.svg';
import PurpleWhale from '../../../assets/whales/normal/purple.svg';
import { getAuth } from "firebase/auth";

import { CSS } from "@dnd-kit/utilities";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";

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

      <h1 className='w-full text-center md:text-start'>{draft ? 'Drafts' : 'Posts'}</h1>

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
      {posts.map((p) => {
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
            key={p.datetime}
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


function PostEditor({post, whales, setSelected, refreshPosts}) {

  const CHARACTER_LIMIT = 1000;
  const MAX_IMAGES = 10;

  // Details
  const [blueWhale, setBlueWhale] = useState(post.whales.includes('blue'));
  const [greenWhale, setGreenWhale] = useState(post.whales.includes('green'));
  const [purpleWhale, setPurpleWhale] = useState(post.whales.includes('purple'));
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);

  // Datetime
  const [day, setDay] = useState(post.datetime.split('-')[2]);
  const [month, setMonth] = useState(post.datetime.split('-')[1]);
  const [year, setYear] = useState(post.datetime.split('-')[0]);

  // Editing
  const [fullTitle, setFullTitle] = useState('');
  const [edited, setEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  // Gallery
  const initialGallery = useMemo(() => {
    const existing = (post?.gallery ?? []).map((img) => ({
      // Existing images also need stable IDs for drag-and-drop
      // Prefix: 's:' and use storagePath
      id: `s:${img.storagePath}`,
      kind: 'existing',
      url: img.url,
      storagePath: img.storagePath
    }));
    return existing;
  }, [post]);
  const [gallery, setGallery] = useState(initialGallery);
  const [removedStoragePaths, setRemovedStoragePaths] = useState([]);

  const getTitlePrefix = () => {
    let titlePrefix;
    if(blueWhale && greenWhale && purpleWhale) titlePrefix = 'Three Whales';
    else if (blueWhale) {
      titlePrefix = whales.blue.name;
      if (greenWhale) titlePrefix += ` & ${whales.green.name}`;
      else if (purpleWhale) titlePrefix += ` & ${whales.purple.name}`;
    }
    else if (greenWhale) {
      titlePrefix = whales.green.name;
      if (purpleWhale) titlePrefix += ` & ${whales.purple.name}`;
    }
    else if (purpleWhale) titlePrefix = whales.purple.name;
    else titlePrefix = 'No Whales'
    return titlePrefix;
  }

  useEffect(() => {
    setFullTitle(`${getTitlePrefix()} ${title}`);
  }, [blueWhale, greenWhale, purpleWhale, title])

  useEffect(() => setGallery(initialGallery), [initialGallery])

  useEffect(() => {
    return () => {
      gallery.forEach((img) => {
        if (img.kind === 'new') URL.revokeObjectURL(img.previewUrl);
      })
    }
  }, [])

  const makeNewGalleryID = () => `n:${(crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random()}`}`;

  function addGalleryFiles(fileList) {
    const files = Array.from(fileList);
    setGallery((prev) => {
      const remaining = MAX_IMAGES - prev.length;
      if(remaining <= 0) return prev;

      const accepted = files.slice(0, remaining).map((file) => ({
        id: makeNewGalleryID(),
        kind: 'new',
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      return [...prev, ...accepted];
    })
    setEdited(true);
  }

  function removeGalleryFile(id) {
    setGallery((prev) => {
      const item = prev.find((x) => x.id === id);
      if(item?.kind === 'new') URL.revokeObjectURL(item.previewUrl);
      else setRemovedStoragePaths((d) => [...d, item.storagePath])
      return prev.filter((x) => x.id !== id);
    })
    setEdited(true);
  }

  function reorderGallery(nextOrder) {
    setGallery(nextOrder);
    setEdited(true);
  }

  async function handleSave(saveType) {
    setSaving(saveType);

    console.log("saveType:", saveType);

    // Validate post
    if(!blueWhale && !greenWhale && !purpleWhale) alert('A post with no whales? Who are you?');
    else if(title.trim() === '') alert('All good posts have a title');
    else if(day.length != 2 || month.length != 2 || year.length != 4) alert('The date is formatted wrong. Must be DD/MM/YYYY');
    else if(content.trim() === '') alert('Every post must have text!');

    else {
      try {
        if(!post?.uid) throw new Error("Missing post id");

        // Upload all images in parallel, then rebuild ordered list
        const uploadedOrExisting = await Promise.all(
          gallery.map(async (img) => {
            // Keep existing as-is
            if(img.kind === 'existing') {
              return {
                url: img.url,
                storagePath: img.storagePath,
              };
            }

            // Upload new images
            const file = img.file;
            const ext = file.name.split(".").pop()?.toLowerCase() || '.jpg';
            const storagePath = `posts/${post.uid}/${img.id}.${ext}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);

            const url = await getDownloadURL(storageRef);

            return {
              url,
              storagePath
            }
          })
        );

        // Update post data
        const whalesArray = [];
        if (blueWhale) whalesArray.push('blue');
        if (greenWhale) whalesArray.push('green');
        if (purpleWhale) whalesArray.push('purple');
        const newDatetime = `${year}-${month}-${day}-${post.datetime.split('-')[3]}`

        const newPost = {
          uid: post.uid,
          whales: whalesArray,
          title: title,
          datetime: newDatetime,
          content: content,
          gallery: uploadedOrExisting,
          draft: (saveType === 'draft' ? post.draft : false)
        }

        const postRef = doc(db, 'posts', post.uid);
        await setDoc(postRef, newPost, {merge: true});

        // Finally, remove any images that have been deleted
        await Promise.allSettled(
          removedStoragePaths.map((path) =>
            deleteObject(ref(storage, path))
          )
        );

        // Force the PostsList to refresh
        refreshPosts();

        if(post.draft !== false && saveType === 'full') setSelected(null);
        else {
          setSelected({...post, ...newPost});
          setEdited(false);
        }
      }
      catch(err) {
        console.error(err);
      }
    }
    setSaving(false);
  }

  return (
    <div className='fixed inset-0 flex justify-center items-center z-20'>
      <div className="absolute inset-0 bg-black/20" onClick={() => setSelected(null)} />
      <div className='w-full h-full overflow-y-auto relative bg-white p-8 pb-18 md:pb-8 md:max-h-[90%] z-30 md:rounded-lg md:w-[90%] md:max-w-200 md:h-auto'>

        <X disabled={saving} className='absolute left-8 top-8 text-[#aaaaaa] cursor-pointer hover:text-black md:hidden' onClick={() => setSelected(null)} />

        <AnimatePresence>{ (edited || post.draft) &&
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className='absolute right-8 top-8 flex gap-4'
          >
            {
              post.draft && 
              <motion.button
                className='bg-white hover:bg-[#81ecec] rounded-md text-black font-bold border-2 px-3 py-1 shadow-md cursor-pointer transition-all'
                onClick={() => handleSave('draft')}
                disabled={saving}
              >
                {saving === 'draft' ? 'Saving...' : 'SAVE AS DRAFT'}
              </motion.button>
            }
            <motion.button
              className='bg-white hover:bg-[#fdcb6e] rounded-md text-black font-bold border-2 px-3 py-1 shadow-md cursor-pointer transition-all'
              onClick={() => handleSave('full')}
              disabled={saving}
            >
              {post.draft ? (saving === 'full' ? 'Posting...' : 'POST') : (saving ? 'Saving...' : 'SAVE')}
            </motion.button>
          </motion.div>
          
        }</AnimatePresence>

        <h2 className='w-full text-center mt-20 mb-8 md:mt-0 md:text-start md:overflow-hidden md:text-nowrap md:text-ellipsis md:w-[90%]'>{post.draft ? 'New Post' : fullTitle}</h2>

        <div className='w-full flex justify-center gap-2 md:mt-10 md:gap-12'>
          <WhaleCheckBox icon={BlueWhale} name={whales['blue'].name} value={blueWhale} setValue={setBlueWhale} setEdited={setEdited} colour='#38b6ff' />
          <WhaleCheckBox icon={GreenWhale} name={whales['green'].name} value={greenWhale} setValue={setGreenWhale} setEdited={setEdited} colour='#7ed957' />
          <WhaleCheckBox icon={PurpleWhale} name={whales['purple'].name} value={purpleWhale} setValue={setPurpleWhale} setEdited={setEdited} colour='#b28cff' />
        </div>

        <p className='text-center mt-6 font-bold text-xs'>{getTitlePrefix()}...</p>

        <form className='flex flex-col items-center' onChange={() => setEdited(true)}>
          <div className='w-full flex justify-center mb-2'>
            <input className='w-[50%] min-w-60 font-bold text-center' placeholder='... title' value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className='w-[25%] min-w-40 flex mb-6'>
            <input className='text-center w-1/3 text-sm font-bold' placeholder='DD' value={day} onChange={(e) => setDay(e.target.value)} />
            <p className='mt-2'>/</p>
            <input className='text-center w-1/3 text-sm font-bold' placeholder='MM' value={month} onChange={(e) => setMonth(e.target.value)} />
            <p className='mt-2'>/</p>
            <input className='text-center w-1/3 text-sm font-bold' placeholder='YYYY' value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <MarkdownEditor className='w-full' value={content} onChange={(e) => {setContent(e); setEdited(true);}} />
          <p style={{ color: content.length > CHARACTER_LIMIT ? '#f00' : '#999' }} className='w-full text-end text-sm'>{content.length}/{CHARACTER_LIMIT}</p>
        </form>

        <Gallery 
          gallery={gallery}
          onAdd={addGalleryFiles}
          onRemove={removeGalleryFile}
          onReorder={reorderGallery}
          maxImages={MAX_IMAGES}
        />
      </div>
    </div>
  )

}

function WhaleCheckBox({icon, name, value, setValue, setEdited, colour}) {

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
      className='select-none cursor-pointer w-30 p-4 flex flex-col items-center rounded-md border-2 transition-all duration-100'
      style={{
        ...{backgroundColor: value===true ? hexToRgba(colour, 0.2) : '#ffffff'},
        ...{borderColor: value===true ? colour : '#eeeeee'}
      }}
      onClick={() => {setValue(!value); setEdited(true);}}
    >
      <img className='w-10' src={icon} />
      <p>{name}</p>
    </div>
  )
}

function Gallery({ gallery, onAdd, onRemove, onReorder, maxImages }) {

  const fileInputRef = useRef(null);
  const ids = useMemo(() => gallery.map((img) => img.id), [gallery]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handlePickFiles(e) {
    if (e.target.files) {
      onAdd(e.target.files);
      e.target.value = "";
    }
  }

  function onDragEnd(event) {
    const { active, over } = event;
    if(!over || active.id === over.id) return;

    const oldIndex = gallery.findIndex((x) => x.id === active.id);
    const newIndex = gallery.findIndex((x) => x.id === over.id);

    const next = arrayMove(gallery, oldIndex, newIndex);
    onReorder(next);
  }

  return (
    <div className="space-y-3">
      <div className='w-full flex justify-center'>
        <input
          ref={fileInputRef}
          className='hidden'
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => e.target.files && handlePickFiles(e)}
        />
        <button
          onClick={() => fileInputRef.current.click()}
          className='px-4 py-2 rounded-md bg-black text-white cursor-pointer transition-all duration-100 hover:brightness-90'
        >Add Images</button>
      </div>

      <p className='text-center text-sm'>{gallery.length}/{maxImages}</p>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <div className='grid grid-cols-3 md:grid-cols-5 gap-2'>
            {
              gallery.map((img) => (
                <SortableTile key={img.id} img={img} onRemove={onRemove} />
              ))
            }
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableTile({ img, onRemove }) {

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.id });

  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition
  };

  const src = img.kind === 'existing' ? img.url : img.previewUrl;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`relative rounded-lg overflow-hidden border bg-white select-none ${
        isDragging ? 'opacity-70' : ''
      }`}
    >
      <img 
        src={src}
        alt=''
        className='w-full aspect-square object-cover'
        draggable={false}
      />
      <GripHorizontal className='w-full text-center cursor-grab focus:outline-none' {...attributes} {...listeners} />
      <X size={30} onClick={() => onRemove(img.id)} className='cursor-pointer absolute top-1 right-1 bg-black/50 text-white px-2 py-1 rounded' />
    </div>
  )

}