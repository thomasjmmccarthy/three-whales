import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, login } from "../../../firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function LoginPage() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) navigate('/admin', {replace:true});
    });
    return unsubscribe;
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
    } catch(error) {
      alert("Incorrect email or password!")
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className='w-full h-dvh flex justify-center items-center'>
      <div className='w-full rounded-lg flex flex-col items-center pt-8 pb-8 md:shadow-md md:bg-white md:w-[95%] md:max-w-100'>
        <h1 className='text-2xl mb-6'>Three Whales</h1>
        <form onSubmit={handleSubmit} className='flex flex-col w-[70%] gap-2 md:w-60'>
          <input placeholder='email' value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder='password' value={password} onChange={(e) => setPassword(e.target.value)} type='password' />
        </form>
        <button
          className='transition-all mt-6 bg-black w-30 rounded-sm text-white p-1 cursor-pointer hover:text-(--whale-blue)'
          onClick={handleSubmit}
          disabled={submitting}
        >{submitting? "SIGNING IN..." : "LOGIN"}</button>
      </div>
    </div>
  )

}