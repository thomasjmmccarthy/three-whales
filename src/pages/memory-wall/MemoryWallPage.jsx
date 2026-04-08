import { useNavigate } from "react-router-dom";
import Navigation from "../../components/navigation/navigation";
import { MemoryWall } from "./MemoryWall";
import { useState } from "react";

export function MemoryWallPage() {

  const currentYear = new Date().getFullYear().toString();
  const [year, setYear] = useState(currentYear);
  const navigate = useNavigate();

  return (
    <div className='overflow-hidden'>
      <Navigation />
      <MemoryWall year={year} />
    </div>
  )

}