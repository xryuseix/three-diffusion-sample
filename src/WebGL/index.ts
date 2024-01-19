import Stage from "./Stage";
import Particle from "./Particle";

export class WebGL {
  constructor() {
    const stage = new Stage();
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
  }
}
