import { useEffect, useRef } from "react";
import Stage from "./Stage";
import Particle from "./Particle";

export const ThreeDiffusion = () => {
  const webGLWRapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const stage = new Stage({wrapper: webGLWRapper});
    const particle = new Particle(stage);

    window.addEventListener("resize", () => {
      particle.onResize();
    });

    const _raf = () => {
      window.requestAnimationFrame(() => {
        _raf();

        stage.onRaf();
        particle.onRaf();
      });
    };
    _raf();
  }, []);

  return <div id="WebGL" ref={webGLWRapper}></div>;
};
