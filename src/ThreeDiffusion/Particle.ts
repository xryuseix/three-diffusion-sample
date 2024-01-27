import * as THREE from "three";
import ImagePixel from "./ImagePixel";
import Stage from "./Stage";
import { scaledSigmoid, pseudoRandom, periodNormalize } from "./functions";

export type Point = {
  x: number;
  y: number;
  z: number;
};

type ParticleProps = {
  stage: Stage;
  step: number;
  period: number;
};

export default class Particle {
  stage: Stage | undefined;
  step: number = 0;
  promiseList: Promise<void>[] = [];
  pathList: { [key: string]: string };
  imageList: {
    [key: string]: {
      position: number[];
      color: number[];
      alpha: number[];
    };
  } = {};
  diffuseConfig: {
    scale: number;
    period: number;
    distance: number[];
  };
  initPositions: THREE.BufferAttribute[] = [];

  constructor(params: ParticleProps) {
    this.stage = params.stage;
    this.pathList = {
      ryuseiChan1: "/girl.webp",
    };

    const diffuseScale = 30.0;
    const diffusePeriod = params.period;
    this.diffuseConfig = {
      scale: diffuseScale,
      period: diffusePeriod,
      distance: new Array(diffusePeriod)
        .fill(0)
        .map((_, i) => scaledSigmoid(i, diffuseScale)),
    };

    this.initialize().then(() => {
      this.makeInitPositions();
    });
  }

  componentDidUpdate(prevProps: ParticleProps) {
    if (prevProps.stage !== this.stage && this.stage !== null) {
      this.createParticles();
    }
  }

  private async initialize() {
    Object.entries(this.pathList).forEach(([key, imagePath]) => {
      this.promiseList.push(
        new Promise((resolve) => {
          const img = new Image();
          img.src = imagePath;
          img.crossOrigin = "anonymous";

          img.addEventListener("load", () => {
            const imagePixel = ImagePixel(img, img.width, img.height, 5.0);
            if (imagePixel) {
              this.imageList[key] = imagePixel;
            }
            resolve();
          });
        }),
      );
    });
    return Promise.all(this.promiseList).then(() => {
      this.createParticles();
    });
  }

  private makeInitPositions() {
    if (typeof this.stage === "undefined") return;
    this.initPositions = this.stage.scene.children
      .map((child) => {
        if (!(child instanceof THREE.Points)) return undefined;
        return child.geometry.attributes.position.clone();
      })
      .filter((v) => v !== undefined) as THREE.BufferAttribute[];
  }

  private createParticles() {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
      size: 5,
      vertexColors: true,
      color: 0xffffff,
    });

    Object.entries(this.imageList).forEach(([_, image]) => {
      const position = new Float32Array(image.position);
      const color = new Float32Array(image.color);
      const alpha = new Float32Array(image.alpha);

      geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(color, 3));
      geometry.setAttribute("alpha", new THREE.BufferAttribute(alpha, 1));

      const mesh = new THREE.Points(geometry, material);
      this.stage?.scene.add(mesh);
    });
  }

  private diffusion(diffusionCount: number) {
    this.stage.scene.children.forEach(
      (child: THREE.Object3D<THREE.Object3DEventMap>) => {
        if (!(child instanceof THREE.Points)) return;
        const position = (child as THREE.Points).geometry.attributes.position;
        const r = this.diffuseConfig.distance[diffusionCount];
        for (let idx = 0; idx < position.count; idx++) {
          const point: Point = {
            x: position.getX(idx),
            y: position.getY(idx),
            z: position.getZ(idx),
          };

          const theta = pseudoRandom(idx, diffusionCount) * Math.PI * 2;

          const newX = point.x + r * Math.cos(theta);
          const newY = point.y + r * Math.sin(theta);
          const newZ = point.z + r * Math.sin(theta);

          position.setXYZ(idx, newX, newY, newZ);
        }
        position.needsUpdate = true;
      },
    );
  }

  private gather(diffusionCount: number) {
    for (let c = 0; c < this.stage.scene.children.length; c++) {
      const child = this.stage.scene.children[c];
      if (!(child instanceof THREE.Points)) return;

      const position = (child as THREE.Points).geometry.attributes.position;
      const prevdiffusionCount = this.diffuseConfig.period - diffusionCount - 1;
      const r = this.diffuseConfig.distance[prevdiffusionCount];
      for (let idx = 0; idx < position.count; idx++) {
        const point: Point = {
          x: position.getX(idx),
          y: position.getY(idx),
          z: position.getZ(idx),
        };
        const theta = pseudoRandom(idx, prevdiffusionCount) * Math.PI * 2;

        const nextP = (p: Point): Point => {
          if (diffusionCount === this.diffuseConfig.period - 1) {
            return {
              x: this.initPositions[c].getX(idx),
              y: this.initPositions[c].getY(idx),
              z: this.initPositions[c].getZ(idx),
            };
          }

          return {
            x: p.x - r * Math.cos(theta),
            y: p.y - r * Math.sin(theta),
            z: p.z - r * Math.sin(theta),
          };
        };

        const { x: newX, y: newY, z: newZ } = nextP(point);
        position.setXYZ(idx, newX, newY, newZ);
      }
      position.needsUpdate = true;
    }
  }

  private onStepChange() {
    if (this.step < this.diffuseConfig.period) {
      this.diffusion(this.step);
    } else {
      // this.gather(this.diffuseConfig.period - this.step % this.diffuseConfig.period);
      this.gather(this.step - this.diffuseConfig.period);
    }
  }

  private render() {
    if (typeof this.stage === "undefined") return;
    for (let child of this.stage.scene.children) {
      if (!(child instanceof THREE.Points)) continue;
      child.material.time += 0.01;
    }
  }

  onResize() {
    this.stage?.onResize();
  }

  onRaf() {
    this.render();
  }

  progress() {
    this.step = periodNormalize(this.step, this.diffuseConfig.period * 2);
    this.onStepChange();
    this.step++;
    if (this.step === this.diffuseConfig.period * 2) {
      this.step = 0;
    }
    return this.step;
  }

  regress() {
    this.step = periodNormalize(this.step, this.diffuseConfig.period * 2);
    this.onStepChange();
    this.step--;
    if (this.step > 0) {
    } else {
      this.onStepChange();
      this.step = this.diffuseConfig.period * 2 - 1;
    }
    return this.step;
  }

  reset() {
    this.onStepChange();
    this.step = 0;
    for (let c = 0; c < this.stage.scene.children.length; c++) {
      const child = this.stage.scene.children[c];
      if (!(child instanceof THREE.Points)) continue;

      const position = (child as THREE.Points).geometry.attributes.position;
      for (let idx = 0; idx < position.count; idx++) {
        child.geometry.attributes.position.setXYZ(
          idx,
          this.initPositions[c].getX(idx),
          this.initPositions[c].getY(idx),
          this.initPositions[c].getZ(idx),
        );
      }
    }
    return this.step;
  }
}
