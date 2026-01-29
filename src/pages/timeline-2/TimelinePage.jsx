import { useEffect, useState } from "react";
import Navigation from "../../components/navigation/navigation";
import Timeline from "./Timeline";
import { db, getAllWhales } from "../../firebase";
import { useLocation, useNavigate } from "react-router-dom";
import { PostViewer } from "./PostViewer";
import { useTailwindScreen } from "../../components/screens/tailwind-screen/TailwindScreen";
import { doc, getDoc } from "firebase/firestore";

function TimelinePage() {

  const PAGE_SIZE = 20;

  const [whales, setWhales] = useState(null);
  const [post, setPost] = useState(null);
  const navigate = useNavigate();
  const {is} = useTailwindScreen();

  const location = useLocation();
  const path = location.pathname.split('/').filter(Boolean);
  let postId;
  if(path.length > 0 && path[path.length-1] !== 'timeline') postId = path[path.length-1];

  useEffect(() => {
    async function getPost() {
      if(!postId) setPost(null);
      else {
        const postDoc = doc(db, 'posts', postId);
        const postSnap = await getDoc(postDoc);
        setPost(postSnap.data());
      }
    }
    getPost();
  }, [postId, navigate])

  useEffect(() => {
    async function getWhales() {
      const whales = await getAllWhales();
      setWhales(whales);
    }
    getWhales();
  }, []);

  return (
    <div className='overflow-hidden'>
      <PostViewer postId={postId} post={post} navigate={navigate} is={is} whales={whales} />
      <Navigation />
      {
        whales && <Timeline selected={postId} pageSize={PAGE_SIZE} whaleData={whales} />
      }
    </div>
  )

}

export default TimelinePage;