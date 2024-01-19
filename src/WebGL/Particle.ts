import * as THREE from "three";
import ImagePixel from "./ImagePixel";
import Stage from "./Stage";
import { scaledSigmoid, pseudoRandom } from "./functions";

export type Point = {
  x: number;
  y: number;
  z: number;
};

export default class Particle {
  stage: Stage;
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
    sleep: number;
    interval: number;
  };
  initPositions: THREE.BufferAttribute[] = [];

  constructor(stage: Stage) {
    this.stage = stage;
    this.pathList = {
      ryuseiChan1: "/girl.webp",
    };

    const diffuseScale = 80.0;
    const diffusePeriod = 30;
    this.diffuseConfig = {
      scale: diffuseScale,
      period: diffusePeriod,
      distance: new Array(diffusePeriod + 1)
        .fill(0)
        .map((_, i) => scaledSigmoid(i, diffuseScale)),
      sleep: 10,
      interval: 100,
    };

    this.initialize();
  }

  initialize() {
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
    Promise.all(this.promiseList).then(() => {
      this.createParticles();
      this.setAutoPlay();
    });
  }

  createParticles() {
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
      this.stage.scene.add(mesh);
    });
  }

  diffusion(diffuseCount: number) {
    this.stage.scene.children.forEach(
      (child: THREE.Object3D<THREE.Object3DEventMap>) => {
        if (!(child instanceof THREE.Points)) return;
        const position = (child as THREE.Points).geometry.attributes.position;

        for (let idx = 0; idx < position.count; idx++) {
          const point: Point = {
            x: position.getX(idx),
            y: position.getY(idx),
            z: position.getZ(idx),
          };

          const r = this.diffuseConfig.distance[diffuseCount];
          const theta = pseudoRandom(idx, diffuseCount) * Math.PI * 2;

          const newX = point.x + r * Math.cos(theta);
          const newY = point.y + r * Math.sin(theta);
          const newZ = point.z + r * Math.sin(theta);

          position.setXYZ(idx, newX, newY, newZ);
        }
        position.needsUpdate = true;
      },
    );
  }

  gather(diffuseCount: number) {
    for (let c = 0; c < this.stage.scene.children.length; c++) {
      const child = this.stage.scene.children[c];
      if (!(child instanceof THREE.Points)) return;

      const position = (child as THREE.Points).geometry.attributes.position;
      for (let idx = 0; idx < position.count; idx++) {
        const point: Point = {
          x: position.getX(idx),
          y: position.getY(idx),
          z: position.getZ(idx),
        };

        const nextP = (p: Point): Point => {
          if (diffuseCount === this.diffuseConfig.period) {
            return {
              x: this.initPositions[c].getX(idx),
              y: this.initPositions[c].getY(idx),
              z: this.initPositions[c].getZ(idx),
            };
          }

          const prevDiffuseCount = this.diffuseConfig.period - diffuseCount;
          const distance = this.diffuseConfig.distance[prevDiffuseCount];
          const theta = pseudoRandom(idx, prevDiffuseCount) * Math.PI * 2;

          return {
            x: p.x - distance * Math.cos(theta),
            y: p.y - distance * Math.sin(theta),
            z: p.z - distance * Math.sin(theta),
          };
        };

        const { x: newX, y: newY, z: newZ } = nextP(point);
        position.setXYZ(idx, newX, newY, newZ);
      }
      position.needsUpdate = true;
    }
  }

  setAutoPlay() {
    this.initPositions = this.stage.scene.children
      .flatMap((child) => {
        if (!(child instanceof THREE.Points)) return [];
        return [child.geometry.attributes.position.clone()];
      })
      .filter((v) => v !== undefined) as THREE.BufferAttribute[];
    let diffuseCount = 0;
    let isDiffuse = true;
    let isDiffuseChanged = false;

    setInterval(() => {
      if (diffuseCount > this.diffuseConfig.period && !isDiffuseChanged) {
        isDiffuse = !isDiffuse;
        isDiffuseChanged = true;
      }
      if (diffuseCount > this.diffuseConfig.period && !isDiffuse) {
        diffuseCount = 0;
        isDiffuseChanged = false;
      }
      if (diffuseCount > this.diffuseConfig.period + this.diffuseConfig.sleep) {
        diffuseCount = 0;
        isDiffuseChanged = false;
      }
      if (diffuseCount <= this.diffuseConfig.period) {
        if (isDiffuse) {
          this.diffusion(diffuseCount);
        } else {
          this.gather(diffuseCount);
        }
      }
      diffuseCount++;
    }, this.diffuseConfig.interval);
  }

  _render() {
    for (let child of this.stage.scene.children) {
      if (!(child instanceof THREE.Points)) continue;
      child.material.time += 0.01;
    }
  }

  onResize() {
    this.stage.onResize();
  }

  onRaf() {
    this._render();
  }
}
