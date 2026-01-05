import { useEffect, useState } from "react";
import Navigation from "../../components/navigation/navigation";
import Timeline from "./Timeline";
import { getAllWhales } from "../../firebase";
import { useLocation, useNavigate } from "react-router-dom";
import { PostViewer } from "./PostViewer";
import { useTailwindScreen } from "../../components/screens/tailwind-screen/TailwindScreen";

function TimelinePage() {

  const PAGE_SIZE = 20;

  const [whales, setWhales] = useState(null);
  const navigate = useNavigate();
  const {is} = useTailwindScreen();

  const location = useLocation();
  const path = location.pathname.split('/').filter(Boolean);
  let postId;
  if(path.length > 0 && path[path.length-1] !== 'timeline') postId = path[path.length-1];

  useEffect(() => {
    async function getWhales() {
      const whales = await getAllWhales();
      setWhales(whales);
    }
    getWhales();
  }, [whales]);

  return (
    <div className='overflow-hidden'>
      <PostViewer postId={postId} navigate={navigate} is={is} />
      <Navigation />
      {
        whales && <Timeline selected={postId} pageSize={PAGE_SIZE} whaleData={whales} />
      }
    </div>
  )

}

export default TimelinePage;