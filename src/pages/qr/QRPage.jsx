import QR from '../../assets/qr/QR.png';
import WhaleGroup from '../../assets/whales/group/group-happy.svg';

export function QRPage() {

  return (
    <div className='relative w-full h-dvh flex justify-center items-center overflow-hidden'>
      <img className='absolute -z-100 scale-200 h-full opacity-10' src={WhaleGroup} />
      <div className='fixed inset-0 flex flex-col items-center justify-center gap-5 overflow-hidden'>
        <h2 className='z-100 w-full text-center text-4xl'>Three Whales</h2>
        <img src={QR} className='w-[70%] max-w-50 border-4 rounded-xl' />
        <h2 className='text-xl'>Join the Scouts!</h2>
      </div>
    </div>
  )
}