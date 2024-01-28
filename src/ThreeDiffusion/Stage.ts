import * as THREE from "three";
import { RefObject } from "react";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default class Stage {
  renderParam: {
    clearColor: number;
    width: number;
    height: number;
  };
  cameraParam: {
    fov: number;
    near: number;
    far: number;
    lookAt: THREE.Vector3;
    x: number;
    y: number;
    z: number;
  };
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  orbitControls: OrbitControls;
  isDev: boolean = false;
  wrapper: RefObject<HTMLDivElement>;

  constructor(params: { wrapper: RefObject<HTMLDivElement> }) {
    this.wrapper = params.wrapper;
    this.renderParam = {
      clearColor: 0x000000,
      width: window.innerWidth,
      height: window.innerHeight,
    };
    this.cameraParam = {
      fov: 45,
      near: 0.1,
      far: 2000,
      lookAt: new THREE.Vector3(0, 0, 0),
      x: 0,
      y: 0,
      z: 1000,
    };

    this.scene = new THREE.Scene();
    this.renderer = this.setupRender();
    this.camera = this.setupCamera();
    this.orbitControls = this.setupControls();
  }

  componentDidUpdate(prevProps: { wrapper: RefObject<HTMLDivElement> }) {
    if (prevProps.wrapper !== this.wrapper && this.wrapper.current) {
      this.setupRender();
    }
  }

  setupRender() {
    const renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(new THREE.Color(this.renderParam.clearColor));
    renderer.setSize(this.renderParam.width, this.renderParam.height);

    if (!this.wrapper.current) {
      throw new Error(
        "WebGL wrapper is not found. Is you used React? Then, you should use 'useEffect' hook.",
      );
    }
    this.wrapper.current.appendChild(renderer.domElement);

    return renderer;
  }

  setupCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      0,
      0,
      this.cameraParam.near,
      this.cameraParam.far,
    );

    camera.position.set(
      this.cameraParam.x,
      this.cameraParam.y,
      this.cameraParam.z,
    );
    camera.lookAt(this.cameraParam.lookAt);

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    camera.aspect = windowWidth / windowHeight;
    camera.fov = this.cameraParam.fov;
    camera.updateProjectionMatrix();

    this.renderer.setSize(windowWidth, windowHeight);

    return camera;
  }

  setupControls() {
    const orbitControls = new OrbitControls(
      this.camera,
      this.renderer.domElement,
    );
    orbitControls.enableDamping = true;
    return orbitControls;
  }

  _render() {
    this.renderer.render(this.scene, this.camera);
    this.orbitControls.update();
  }

  onResize() {
    this.setupCamera();
  }

  onRaf() {
    this._render();
  }
}
