import { useNavigate } from "react-router-dom";
import { useTailwindScreen } from "../screens/tailwind-screen/TailwindScreen";
import { useEffect, useState } from "react";

function Navigation () {

  const navigate = useNavigate();
  const [titleCollapsed, setTitleCollapsed] = useState(false);
  const { is } = useTailwindScreen();

  useEffect(() => {
    const onScroll = () => {
      setTitleCollapsed(window.scrollY > 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className='fixed bg-white z-10 w-full flex py-6 md:p-10 pb-2 md:pb-10 flex-col items-center gap-3 md:relative md:gap-0 md:flex-row md:justify-between md:items-end'>
      <h2 
        className={`overflow-hidden select-none text-2xl md:text-3xl hover:cursor-pointer transition-all duration-300
                    ${is('md') ? '' : titleCollapsed ? 'h-0 opacity-0' : 'h-8 opacity-100'}`
                  }
        onClick={() => navigate('/')}
      >Three Whales</h2>
      <div className='flex gap-16 w-full justify-center border-t-2 border-b-2 p-2 pb-1 md:p-0 md:border-0 md:w-auto'>
        <NavItem navKey='timeline' title='Timeline' />
        <NavItem navKey='scouts' title='Scouts' />
        <NavItem navKey='about' title='About' />
      </div>
    </div>
  )

}

export default Navigation;


function NavItem({navKey, title}) {

  const navigate = useNavigate();

  /*
    Used to determine which page is currently open, and where each item
    of the navigation meny should lead to.
  */
  const navMap = {
    "timeline": { "navTarget": "timeline", "isHome": true },
    "about": { "navTarget": "about", },
    "scouts": { "navTarget": "scouts", "alts": ["leaderboard", "join"] }
  }

  const selected = () => {
    // Get the current url location
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if(
      navMap[navKey].navTarget === pathParts[0]
      || navMap[navKey].alts && navMap[navKey].alts.includes(pathParts[0])
      || (pathParts.length === 0 && navMap[navKey].isHome)
    ) {
      return true;
    }
    // This nav item is not the current page's
    return false;
  }

  const to = `/${navMap[navKey].navTarget}`;

  return (
    <h2
      className={'select-none border-b-2 transition-all pl-2 pr-2 bg-[#00000000] text-sm md:text-lg ' + 
                  (selected() ? 'border-b-black' : 'border-b-white hover:text-[#aaaaaa] hover:cursor-pointer hover:border-b-[#aaaaaa]') }
      onClick={() => {
        if(!selected()) {
          navigate(to);
        }
      }}
    >
      {title}
    </h2>
  )
}