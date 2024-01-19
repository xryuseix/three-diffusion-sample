import { useEffect } from "react";
import { WebGL } from "./WebGL";
import "./App.css";

function App() {
  useEffect(() => {
    new WebGL();
  }, []);

  return (
    <>
      <div id="webgl"></div>
    </>
  );
}

export default App;
