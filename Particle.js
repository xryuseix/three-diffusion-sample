import * as THREE from "three";
import ImagePixel from "./ImagePixel";

export default class Particle {
  constructor(stage) {
    this.stage = stage;
    this.promiseList = [];
    this.pathList = {
      ryuseiChan1: "/girl.webp",
    };
    this.imageList = {};

    this.diffuseScale = 40.0;
    this.sigmoid = (x) =>
      this.diffuseScale / (1 + Math.exp(-x) * this.diffuseScale);
    this.diffusePeriod = 30;
    this.diffuseDistance = new Array(this.diffusePeriod + 1)
      .fill(0)
      .map((_, i) => this.sigmoid(i));

    this.gatherScale = 0.5;
    this.gatherRatio = new Array(this.diffusePeriod + 1)
      .fill(0)
      .map((_, i) => ((i + 1) * this.gatherScale) / (this.diffusePeriod + 1));

    this.diffuseSleep = 10;
    this.diffuseInterval = 100;
    this.noiseRatio = 0.7;
  }

  init() {
    Object.entries(this.pathList).forEach(([key, imagePath]) => {
      this.promiseList.push(
        new Promise((resolve) => {
          const img = new Image();
          img.src = imagePath;
          img.crossOrigin = "anonymous";

          img.addEventListener("load", () => {
            this.imageList[key] = ImagePixel(img, img.width, img.height, 5.0);
            resolve();
          });
        })
      );
    });
    Promise.all(this.promiseList).then(() => {
      this.createParticles();
      this._setAutoPlay();
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

  _setDiffusion(diffuseCount) {
    for (let child of this.stage.scene.children) {
      const position = child.geometry.attributes.position;

      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);

        const r = this.diffuseDistance[diffuseCount];
        const theta = Math.random() * Math.PI * 2;

        const newX = x + r * Math.cos(theta);
        const newY = y + r * Math.sin(theta);
        const newZ = z + r * Math.sin(theta);

        position.setXYZ(i, newX, newY, newZ);
      }
      position.needsUpdate = true;
    }
  }

  _setGather(diffuseCount) {
    for (let c = 0; c < this.stage.scene.children.length; c++) {
      const child = this.stage.scene.children[c];
      const position = child.geometry.attributes.position;

      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);

        const initX = this.initPositions[c].getX(i);
        const initY = this.initPositions[c].getY(i);
        const initZ = this.initPositions[c].getZ(i);

        const nextP = (p, initP) => {
          if (diffuseCount === this.diffusePeriod) {
            return initP;
          }
          const distance = Math.abs(p - initP);
          const diff = distance * this.gatherRatio[diffuseCount];
          if (p - initP > 0) {
            return p - diff
          } else {
            return p + diff
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

  _setAutoPlay() {
    this.initPositions = this.stage.scene.children.map((child) => {
      return child.geometry.attributes.position.clone();
    });
    let diffuseCount = 0;
    let isDiffuse = true;
    let isDiffuseChanged = false;

    setInterval(() => {
      if (diffuseCount > this.diffusePeriod && !isDiffuseChanged) {
        isDiffuse = !isDiffuse;
        isDiffuseChanged = true;
      }
      if (diffuseCount > this.diffusePeriod && !isDiffuse) {
        diffuseCount = 0;
        isDiffuseChanged = false;
      }
      if (diffuseCount > this.diffusePeriod + this.diffuseSleep) {
        diffuseCount = 0;
        isDiffuseChanged = false;
      }
      if (diffuseCount <= this.diffusePeriod) {
        if (isDiffuse) {
          this._setDiffusion(diffuseCount);
        } else {
          this._setGather(diffuseCount);
        }
      }
      diffuseCount++;
    }, this.diffuseInterval);
  }

  _render() {
    for (let child of this.stage.scene.children) {
      child.material.time += 0.01;
    }
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.stage.onResize();
  }

  onRaf() {
    this._render();
  }
}

