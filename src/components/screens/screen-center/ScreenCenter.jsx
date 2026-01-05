import { useEffect, useState } from "react";

export function useScreenCenterX() {
  const [halfX, setHalfX] = useState(window.innerWidth / 2);

  useEffect(() => {
    const onResize = () => setHalfX(window.innerWidth / 2);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return halfX;
}
