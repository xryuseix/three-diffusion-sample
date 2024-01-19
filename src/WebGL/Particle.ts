import * as THREE from "three";
import ImagePixel from "./ImagePixel";
import Stage from "./Stage";
import { scaledSigmoid } from "./functions";

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
  gatherConfig: {
    scale: number;
    ratio: number[];
  };
  initPositions: THREE.BufferAttribute[] = [];

  constructor(stage: Stage) {
    this.stage = stage;
    this.pathList = {
      ryuseiChan1: "/girl.webp",
    };

    const diffuseScale = 40.0;
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

    const gatherScale = 0.5;
    this.gatherConfig = {
      scale: 0.5,
      ratio: new Array(this.diffuseConfig.period + 1)
        .fill(0)
        .map(
          (_, i) => ((i + 1) * gatherScale) / (this.diffuseConfig.period + 1),
        ),
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
    this.stage.scene.children.forEach((child: THREE.Object3D<THREE.Object3DEventMap>) => {
      if(!(child instanceof THREE.Points)) return;
      const position = (child as THREE.Points).geometry.attributes.position;

      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);

        const r = this.diffuseConfig.distance[diffuseCount];
        const theta = Math.random() * Math.PI * 2;

        const newX = x + r * Math.cos(theta);
        const newY = y + r * Math.sin(theta);
        const newZ = z + r * Math.sin(theta);

        position.setXYZ(i, newX, newY, newZ);
      }
      position.needsUpdate = true;
    })
  }

  gather(diffuseCount: number) {
    for (let c = 0; c < this.stage.scene.children.length; c++) {
      const child = this.stage.scene.children[c];
      if(!(child instanceof THREE.Points)) return;

      const position = (child as THREE.Points).geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);

        const initX = this.initPositions[c].getX(i);
        const initY = this.initPositions[c].getY(i);
        const initZ = this.initPositions[c].getZ(i);

        const nextP = (p: number, initP: number) => {
          if (diffuseCount === this.diffuseConfig.period) {
            return initP;
          }
          const distance = Math.abs(p - initP);
          const diff = distance * this.gatherConfig.ratio[diffuseCount];
          if (p - initP > 0) {
            return p - diff;
          } else {
            return p + diff;
          }
        };

        const newX = nextP(x, initX);
        const newY = nextP(y, initY);
        const newZ = nextP(z, initZ);

        position.setXYZ(i, newX, newY, newZ);
      }
      position.needsUpdate = true;
    }
  }

  setAutoPlay() {
    this.initPositions = this.stage.scene.children.flatMap((child) => {
      if(!(child instanceof THREE.Points)) return []
      return [child.geometry.attributes.position.clone()];
    }).filter((v) => v !== undefined) as THREE.BufferAttribute[];
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
      if(!(child instanceof THREE.Points)) continue;
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
