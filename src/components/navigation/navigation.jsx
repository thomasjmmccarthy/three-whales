import { useNavigate } from "react-router-dom";

function Navigation () {

  const navigate = useNavigate();

  return (
    <div className='fixed bg-white z-10 w-full flex p-10 pb-2 md:pb-10 flex-col items-center gap-8 md:relative md:gap-0 md:flex-row md:justify-between md:items-end'>
      <h1 className='select-none text-3xl hover:cursor-pointer' onClick={() => navigate('/')}>Three Whales</h1>
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
    "timeline": {
      "navTarget": "timeline",
      "isHome": true
    },
    "about": {
      "navTarget": "about",
    },
    "scouts": {
      "navTarget": "scouts",
      "alts": ["leaderboard", "join"]
    }
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

  return (
    <h2
      className={'select-none border-b-2 transition-all pl-2 pr-2 bg-[#00000000] text-sm md:text-lg ' + 
                  (selected() ? 'border-b-black' : 'border-b-white hover:text-[#aaaaaa] hover:cursor-pointer hover:border-b-[#aaaaaa]') }
      onClick={() => {
        if(!selected()) {
          navigate(`/${navMap[navKey].navTarget}`);
        }
      }}
    >
      {title}
    </h2>
  )
}