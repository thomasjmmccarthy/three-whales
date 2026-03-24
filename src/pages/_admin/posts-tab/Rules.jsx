import { Binoculars, Camera, MapPinCheckIcon, UsersRound, UserX, X } from "lucide-react";

export function Rules({setRulesOpen}) {

  const iconClass = 'shrink-0';

  return (
    <div className='fixed inset-0 flex justify-center items-center z-20'>
      <div className="absolute inset-0 bg-black/20" onClick={() => setRulesOpen(false)} />
        <div className='w-full h-full overflow-y-auto relative bg-white px-5 md:p-8 py-18 md:pb-8 md:max-h-[90%] z-30 md:rounded-lg md:w-[90%] md:max-w-200 md:h-auto'>
          <X className='absolute left-4 top-6 text-[#aaaaaa] cursor-pointer hover:text-black md:hidden' onClick={() => setRulesOpen(false)} />
          <h1>Post Rules</h1>
          <ol class='pl-5 mt-10 flex flex-col gap-8 leading-5 md:gap-6'>
            <Item icon={<Camera className={iconClass} />}>Every image must feature a whale</Item>
            <Item icon={<UserX className={iconClass} />}>You cannot be alone in any photos with your own whale</Item>
            <Item icon={<UsersRound className={iconClass} />}>You can be in group photos with your whale, provided you are not the one holding them</Item>
            <Item icon={<Binoculars className={iconClass} />}>You cannot tag yourself in posts featuring only your whale</Item>
            <Item icon={<MapPinCheckIcon className={iconClass} />}>You can be tagged in any post featuring other whales - even if your whale also features</Item>
          </ol>
        </div>
    </div>
  )
}


function Item({icon, children}) {

  const itemClass = 'flex items-center gap-6';

  return (
    <li className={itemClass}>{icon} {children}</li>
  )
}