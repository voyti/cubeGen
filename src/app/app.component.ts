import { Component } from '@angular/core';
import * as THREE from 'three';
import { FormsModule } from '@angular/forms';
import { CodeNode } from 'source-list-map';
import _ from 'lodash';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const CUBE_SIZE = 12;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  scene;
  cameras;
  cameraRig;
  usedCamera;
  usedCameraModel: string = 'perspective';
  cameraRotationInProgress = false;
  title = 'cubeGen';
  pickedColor = null;
  palette = [ { color: '#9fdc9b', name: 'tbd' }, { color: '#63df92', name: 'tbd' }, { color: '#454f1d', name: 'tbd' }, { color: '#6B9700', name: 'tbd' }, { color: '#7CAA09', name: 'tbd' }, { color: '#72A100', name: 'tbd' }, { color: '#638B00', name: 'tbd' }, { color: '#5A7F00', name: 'tbd' }, { color: '#559200', name: 'tbd' }, { color: '#64A509', name: 'tbd' }, { color: '#5A9C00', name: 'tbd' }, { color: '#4E8700', name: 'tbd' }, { color: '#477B00', name: 'tbd' }, { color: '#809A00', name: 'tbd' }, { color: '#92AE0A', name: 'tbd' }, { color: '#88A500', name: 'tbd' }, { color: '#768F00', name: 'tbd' }, { color: '#6C8200', name: 'tbd' }, { color: '#FDADB6', name: 'tbd' }, { color: '#FEA9B3', name: 'tbd' }, { color: '#FEA9B3', name: 'tbd' }, { color: '#FCB5BE', name: 'tbd' }, { color: '#FCC5CB', name: 'tbd' }, { color: '#A6DAEE', name: 'tbd' }, { color: '#A9E3F9', name: 'tbd' }, { color: '#A6DFF4', name: 'tbd' }, { color: '#A9D6E7', name: 'tbd' }, { color: '#B1D3E0', name: 'tbd' }, { color: '#F3FEAD', name: 'tbd' }, { color: '#F3FFA9', name: 'tbd' }, { color: '#F2FEA9', name: 'tbd' }, { color: '#F3FDB6', name: 'tbd' }, { color: '#F5FDC6', name: 'tbd' }, { color: '#BAF8A9', name: 'tbd' }, { color: '#B9FDA8', name: 'tbd' }, { color: '#B8FAA7', name: 'tbd' }, { color: '#BEF5B0', name: 'tbd' }, { color: '#C8F2BD', name: 'tbd' }, { color: '#FFD8AE', name: 'tbd' }, { color: '#FFD6A9', name: 'tbd' }, { color: '#FFD6AA', name: 'tbd' }, { color: '#FFDDB7', name: 'tbd' }, { color: '#FFE5C8', name: 'tbd' }, { color: '#FFC8AB', name: 'tbd' }, { color: '#FFAF85', name: 'tbd' }, { color: '#FFB993', name: 'tbd' }, { color: '#D9A88E', name: 'tbd' }, { color: '#BE947E', name: 'tbd' }, { color: '#FFD9AB', name: 'tbd' }, { color: '#FFC785', name: 'tbd' }, { color: '#FFCE93', name: 'tbd' }, { color: '#D9B68E', name: 'tbd' }, { color: '#BEA17E', name: 'tbd' }, { color: '#6F90A2', name: 'tbd' }, { color: '#659CBA', name: 'tbd' }, { color: '#6895AD', name: 'tbd' }, { color: '#5D7A8A', name: 'tbd' }, { color: '#526B79', name: 'tbd' }, { color: '#71A898', name: 'tbd' }, { color: '#63BFA3', name: 'tbd' }, { color: '#67B29C', name: 'tbd' }, { color: '#5E8F80', name: 'tbd' }, { color: '#537E71', name: 'tbd' }];

  constructor() {
  }

  ngOnInit() {
    this.init();

    document.body.addEventListener('keydown', (e) => {
      const codesToActions = {
        'KeyW': () => this.cameraRig.position.z += 1,
        'KeyS': () => this.cameraRig.position.z -= 1,
        'KeyA': () => this.cameraRig.position.x += 1,
        'KeyD': () => this.cameraRig.position.x -= 1,
        'KeyI': () => this.stepRotateCameraRig('z'),
        'KeyK': () => this.stepRotateCameraRig('-z'),
        'KeyJ': () => this.stepRotateCameraRig('y'),
        'KeyL': () => this.stepRotateCameraRig('-y'),
      };
      (codesToActions[e.code] || _.noop)();
    });
  }

  init() {
    var container, stats;
    var perspectiveCamera, ortoCamera, cameraRig, controls, scene, renderer;
    var textureLoader;
    var clock = new THREE.Clock();

    container = document.getElementById('main-3d-container');
    perspectiveCamera = new THREE.PerspectiveCamera( 60, CANVAS_WIDTH / CANVAS_HEIGHT, 0.2, 2000 );
    ortoCamera = new THREE.OrthographicCamera(- 200, 200, 200, 0, 100, 1000 );
    console.warn(ortoCamera);

    this.cameras = [{ name: 'Perspective', id: 'perspective', camera: perspectiveCamera }, { name: 'Ortographic', id: 'ortographic', camera: ortoCamera }];
    this.usedCamera = perspectiveCamera;

    scene = new THREE.Scene();
    // @ts-ignore-begin
    window.scene = scene; // for three js inspector extension
    // @ts-ignore-end

    this.scene = scene;
    scene.background = new THREE.Color( 0xbfd1e5 );

    this.cameraRig = new THREE.Group();
    this.cameraRig.add( perspectiveCamera );
    this.cameraRig.add( ortoCamera );
    scene.add( this.cameraRig );
    this.cameraRig.position.set( 0, 0, 60 );

    this.addSnappingMeshHelper(scene);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( CANVAS_WIDTH / CANVAS_HEIGHT );
    renderer.setSize( CANVAS_WIDTH, CANVAS_HEIGHT );
    renderer.shadowMap.enabled = true;

    container.appendChild( renderer.domElement );
    textureLoader = new THREE.TextureLoader();

    var ambientLight = new THREE.AmbientLight( 0x404040 );
    scene.add( ambientLight );
    var light = new THREE.DirectionalLight( 0xffffff, 1 );
    light.position.set( - 7, 10, 15 );
    light.castShadow = true;
    var d = 10;
    light.shadow.camera.left = - d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = - d;
    light.shadow.camera.near = 2;
    light.shadow.camera.far = 50;
    light.shadow.mapSize.x = 1024;
    light.shadow.mapSize.y = 1024;
    light.shadow.bias = - 0.003;
    scene.add( light );

    var groundGeo = new THREE.PlaneBufferGeometry( 10000, 10000 );
    var groundMat = new THREE.MeshLambertMaterial( { color: 0xffffff } );
    groundMat.color.setHSL( 0.095, 1, 0.75 );
    var ground = new THREE.Mesh( groundGeo, groundMat );
    ground.position.y = - 33;
    ground.rotation.x = - Math.PI / 2;
    ground.receiveShadow = true;
    scene.add( ground );

    this.addBox(scene, '#6B9700');

    this.startAnimation(renderer, scene);

  }

  stepRotateCameraRig(axisStep) {
    if (this.cameraRotationInProgress) return;
    this.cameraRotationInProgress = true;

    const axisStepToRotation = {
      // new THREE.Matrix4().
      'z': () => ['makeRotationZ', 0.5 ],
      '-z': () => ['makeRotationZ', -0.5],
      'y': () => ['makeRotationY', 0.5],
      '-y': () => ['makeRotationY', -0.5],
    };

    let stepCount = 0;
    const baseRotation = axisStepToRotation[axisStep]()[0];
    const endVal = axisStepToRotation[axisStep]()[1];

    const step = (i, baseRotation, endVal, allSteps, intervalRef) => {
      if (i >= allSteps) {
        window.clearInterval(intervalRef);
        this.cameraRotationInProgress = false;
        return;
      }

      const stepVal = endVal / allSteps;
      const value = stepVal;
      const rotation = new THREE.Matrix4()[baseRotation](value * Math.PI);
      console.warn(rotation);
      this.cameraRig.applyMatrix( rotation );
      this.cameraRig.updateMatrixWorld();


    };

    const intervalRef = window.setInterval(() => {
      step(stepCount, baseRotation, endVal, 50, intervalRef)
      stepCount++;
    }, 10);


    var rotation = axisStepToRotation[axisStep]();
    this.cameraRig.applyMatrix( rotation );
    this.cameraRig.updateMatrixWorld();

  }

  addSnappingMeshHelper(scene) {
    var gridHelper = new THREE.GridHelper( 256, Math.floor(256 / 12), 0x9fdc9b, 0x9fdc9b );
    gridHelper.position.y = 0;
    gridHelper.position.x = 0;
    scene.add( gridHelper );
  }

  startAnimation(renderer, scene) {
    const animate = () => {
      requestAnimationFrame( animate );
      renderer.render( scene, this.usedCamera );


      // var intersections = raycaster.intersectObjects( pointclouds );
      // intersection = ( intersections.length ) > 0 ? intersections[ 0 ] : null;

    }
    animate();
  }

  addBox(scene, color) {
    var material = new THREE.MeshLambertMaterial( { color } );
    var geometry = new THREE.BoxBufferGeometry( CUBE_SIZE, CUBE_SIZE, CUBE_SIZE );
    scene.add( new THREE.Mesh( geometry, material ) );
  }

  pickColor(color) {
    this.pickedColor = color;
    this.addBox(this.scene, color.color);
  }

  onCameraChange(camera) {
    this.usedCamera = camera.camera;
  }
}
