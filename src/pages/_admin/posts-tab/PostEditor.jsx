import MarkdownEditor from '../../../components/markdown/MarkdownEditor';

import { CSS } from "@dnd-kit/utilities";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { useEffect, useMemo, useRef, useState } from "react";
import { CirclePlus, GripHorizontal, User, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import BlueWhale from '../../../assets/whales/normal/blue.svg';
import GreenWhale from '../../../assets/whales/normal/green.svg';
import PurpleWhale from '../../../assets/whales/normal/purple.svg';
import BronzeWhale from '../../../assets/whales/trophy/bronze.svg';
import SilverWhale from '../../../assets/whales/trophy/silver.svg';
import GoldWhale from '../../../assets/whales/trophy/gold.svg';

import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db, storage } from '../../../firebase';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

export function PostEditor({post, whales, setSelected, refreshPosts}) {

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

  // Scouts
  const [scouts, setScouts] = useState([]);
  const [allScouts, setAllScouts] = useState(null);

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
    async function loadScouts() {
      const ref = collection(db, 'scouts');
      const snaps = await getDocs(ref);
      let allScouts = snaps.docs.map((snap) => snap.data());
      setAllScouts(allScouts);

      if(!post.scouts?.length){
        setScouts([]);
        return;
      }

      const byId = new Map(allScouts.map((s) => [s.uid, s]));
      const selected = post.scouts.map((uid) => byId.get(uid)).filter(Boolean);
      setScouts(selected);
    }
    loadScouts();
  }, [post])

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

        const newScouts = scouts.map((s) => s.uid);

        const newPost = {
          uid: post.uid,
          whales: whalesArray,
          title: title,
          datetime: newDatetime,
          content: content,
          gallery: uploadedOrExisting,
          scouts: newScouts,
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
      <div className='w-full h-full overflow-y-auto relative bg-white px-5 md:p-8 pb-18 md:pb-8 md:max-h-[90%] z-30 md:rounded-lg md:w-[90%] md:max-w-200 md:h-auto'>

        <X disabled={saving} className='absolute left-4 top-6 text-[#aaaaaa] cursor-pointer hover:text-black md:hidden' onClick={() => setSelected(null)} />

        <AnimatePresence>{ (edited || post.draft) &&
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className='fixed z-100 not-md:bg-white/90 not-md:p-3 not-md:pt-4 not-md:rounded-lg md:absolute right-4 top-0 md:right-8 md:top-8 flex gap-2 md:gap-4'
          >
            {
              post.draft && 
              <motion.button
                className='bg-white hover:bg-[#81ecec] rounded-md text-black font-bold border-2 px-3 py-1 shadow-md cursor-pointer transition-all'
                onClick={() => handleSave('draft')}
                disabled={saving}
              >
                {saving === 'draft' ? 'Saving...' : 'SAVE DRAFT'}
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

        <h2 className='w-full md:w-[90%] not-md:h-12 flex not-md:justify-center text-center items-center not-md:text-sm line-clamp-2 md:line-clamp-1 mt-16 mb-8 md:mt-0 md:text-start'>{post.draft ? 'New Post' : fullTitle}</h2>

        <div className='w-full flex justify-center gap-2 md:mt-10 md:gap-12'>
          <WhaleCheckBox icon={BlueWhale} name={whales['blue'].name} value={blueWhale} setValue={setBlueWhale} setEdited={setEdited} colour='#38b6ff' />
          <WhaleCheckBox icon={GreenWhale} name={whales['green'].name} value={greenWhale} setValue={setGreenWhale} setEdited={setEdited} colour='#7ed957' />
          <WhaleCheckBox icon={PurpleWhale} name={whales['purple'].name} value={purpleWhale} setValue={setPurpleWhale} setEdited={setEdited} colour='#b28cff' />
        </div>

        <h2 className='text-center text-[#222] mt-8 font-bold text-[10px] md:text-sm tracking-wider'>{getTitlePrefix()}...</h2>

        <form className='flex flex-col items-center mb-4' onChange={() => setEdited(true)}>
          <div className='w-full flex justify-center'>
            <input className='w-[50%] min-w-60 font-bold text-center text-lg' placeholder='... title' value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className='w-[25%] min-w-40 flex mb-8'>
            <input className='text-center w-1/3 text-xs md:text-sm font-bold' placeholder='DD' value={day} onChange={(e) => setDay(e.target.value)} />
            <p className='mt-2'>/</p>
            <input className='text-center w-1/3 text-xs md:text-sm font-bold' placeholder='MM' value={month} onChange={(e) => setMonth(e.target.value)} />
            <p className='mt-2'>/</p>
            <input className='text-center w-1/3 text-xs md:text-sm font-bold' placeholder='YYYY' value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <MarkdownEditor className='w-full not-md:text-sm not-md:leading-4.5' value={content} onChange={(e) => {setContent(e); setEdited(true);}} />
          <p style={{ color: content.length > CHARACTER_LIMIT ? '#f00' : '#999' }} className='w-full text-end text-sm'>{content.length}/{CHARACTER_LIMIT}</p>
        </form>

        <Gallery 
          gallery={gallery}
          onAdd={addGalleryFiles}
          onRemove={removeGalleryFile}
          onReorder={reorderGallery}
          maxImages={MAX_IMAGES}
        />

        <ScoutGallery
          scouts={scouts}
          setScouts={setScouts}
          allScouts={allScouts}
          setEdited={setEdited}
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
      <p className='not-md:text-sm'>{name}</p>
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
      <div className='w-full flex gap-6 items-center border-b-2 pb-1 text-[#555] border-[#555]'>
        <h2 className='not-md:text-sm'>Images ({gallery.length}/{maxImages})</h2>
        <div>
          <input
            ref={fileInputRef}
            className='hidden'
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => e.target.files && handlePickFiles(e)}
          />
          <CirclePlus className='transition-all hover:opacity-80 cursor-pointer' size={20} onClick={() => fileInputRef.current.click()} />
        </div>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <div className='grid grid-cols-2 md:grid-cols-5 gap-2'>
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

function ScoutGallery({ scouts, setScouts, allScouts, setEdited }) {

  const [open, setOpen] = useState(false);
  const sortedScouts = useMemo(
    () => [...scouts].sort((a,b) => a.name.localeCompare(b.name, 'en', {sensitivity:'base'})),
    [scouts]
  );

  return (
    <div className="space-y-3 mt-8">
      <div className='w-full flex gap-6 items-center border-b-2 pb-1 not-md:text-sm text-[#555] border-[#555]'>
        <h2>Scouts</h2>
        <CirclePlus className='transition-all hover:opacity-80 cursor-pointer' size={20} onClick={() => setOpen(true)} />
      </div>


      <AnimatePresence>
        {(open && allScouts) && (
          <motion.div
            className="fixed left-0 top-0 w-full h-dvh z-50 bg-black/40 flex justify-center items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="w-[90%] max-w-md bg-white rounded-lg p-4"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ScoutPicker
                allScouts={allScouts}
                selectedScouts={scouts}
                onAdd={(scout) => {
                  setScouts((prev) => [...prev, scout]);
                  setEdited(true);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className='grid grid-cols-3 md:grid-cols-6 gap-2'>
      {
        sortedScouts.map((s) =>
          <ScoutTile key={s.uid} scout={s} scouts={scouts} setScouts={setScouts} setEdited={setEdited} />
        )
      }
      </div>
    </div>
  )

}


function ScoutPicker({ allScouts, selectedScouts, onAdd }) {

  const [query, setQuery] = useState("");

  const selectedIds = useMemo(
    () => new Set(selectedScouts.map((s) => s.uid)),
    [selectedScouts]
  );

  console.log(allScouts);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allScouts
      .filter((s) => s.name.toLowerCase().includes(q) || s.title.toLowerCase().includes(q))
      .sort((a,b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))
  }, [allScouts, query]);

  return (
    <div className='space-y-3'>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search scouts..."
        className='w-full border-b-2'
      />

      <ul className='max-h-64 overflow-y-auto divide-y border-2 rounded-md'>
        {
          filtered.map((scout) => {
            const disabled = selectedIds.has(scout.uid);
            return (
              <li key={scout.uid}
                onClick={() => !disabled && onAdd(scout)}
                className={`
                  px-3 py-2 flex justify-between items-center
                  ${disabled
                    ? 'text-[#555] bg-[#ccc]'
                    : 'cursor-pointer hover:bg-[#eee]'
                  }
                `}
              >
                <span className='flex items-center gap-2'>
                  <span className='flex justify-center w-8 aspect-square overflow-hidden'>
                    {
                      scout.pfp
                      ? <img src={scout.pfp.url} className='w-8 rounded-full border' />
                      : <User width={32} height={32} className='rounded-full border border-black text-[#999]' />
                    }
                  </span>
                  <span>{scout.name} the {scout.title}</span>
                </span>
                {disabled && <span className="text-xs">Added</span>}
              </li>
            )
          })
        }

        {filtered.length === 0 && (
          <li className="px-3 py-2 text-gray-500">
            No scouts found
          </li>
        )}
      </ul>
    </div>
  )
}


function ScoutTile({scout:s, scouts, setScouts, setEdited}) {

  const handleRemoveScout = () => {
    setEdited(true);
    const newScouts = [...scouts].filter((x) => x.uid !== s.uid);
    setScouts(newScouts);
  }

  let whalesSpotted = 0;
  if(s.whales.blue?.spotted) whalesSpotted+=1
  if(s.whales.green?.spotted) whalesSpotted+=1;
  if(s.whales.purple?.spotted) whalesSpotted+=1;
  return (
    <div
      className={`relative rounded-lg overflow-hidden border bg-white select-none`}
    >
      {
        s.pfp 
        ? <img 
            src={s.pfp.url}
            alt=''
            className='w-full aspect-square object-cover'
            draggable={false}
          />
        : <div className='w-full aspect-square flex justify-center items-center'>
            <User size={60} />
          </div>
      }
      <p className='w-full text-center text-xs font-bold text-nowrap overflow-hidden text-ellipsis'>{s.name} the {s.title}</p>
      <ScoutBadge badge={
        whalesSpotted === 3 ? GoldWhale
        : whalesSpotted === 2 ? SilverWhale
        : whalesSpotted === 1 ? BronzeWhale : null
      } />
      <X size={30} className='cursor-pointer absolute top-1 right-1 bg-black/50 text-white px-2 py-1 rounded' onClick={handleRemoveScout} />
    </div>
  )
}


function ScoutBadge({badge}) {
  if(!badge) return null;
  return (
    <img src={badge} className='w-8 absolute top-0 left-0 p-1 bg-white/95 rounded-br-lg' />
  )
}