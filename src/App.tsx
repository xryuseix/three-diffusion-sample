import { useRef } from "react";
import { ThreeDiffusion } from "./ThreeDiffusion";
import "./App.css";

function App() {
  const ref = useRef<ThreeDiffusion>(null);
  const diffusePeriod = 30;
  const waitCount = 30;
  let count = 0;

  setInterval(async () => {
    if (count < diffusePeriod * 2) {
      const _step = ref.current?.progress();
    }
    count++;
    if (count === diffusePeriod * 2 + waitCount) {
      count = 0;
    }
  }, 100);

  return <ThreeDiffusion period={diffusePeriod} ref={ref} />;
}

export default App;
