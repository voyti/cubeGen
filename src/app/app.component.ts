import { Component } from '@angular/core';
import * as THREE from 'three';
import './threeExtras';
import _ from 'lodash';
import { ExportService } from './services/export.service';
import { flattenStyles } from '@angular/platform-browser/src/dom/dom_renderer';
import { TextureService } from './services/texture.service';
import { Object3D, Vector2 } from 'three';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const CUBE_SIZE = 12;
const TERRAIN_SIZE = 10000;

// TODO: ctrl+z, help guide, direct insertion mode, selection mode, copying/pasting selections, color numbering & last used + switching
// TODO: saving/loading projects (.cbg files)
// TODO: skid marks (F)
// TODO: adding and moving ghost models
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  scene;
  renderer;
  cameras;
  cameraRig;
  orbitControls;
  raycaster;
  usedCamera;
  usedCameraModel: string = 'ortographic';
  usedLevel = 0;
  projectModel = [];
  brushZones = {};
  projectGroup: THREE.Group;
  cameraRotationInProgress = false;
  usedBrushZones = { 1: false, 2: false, 3: false, 4: false, 5: true, 6: false, 7: false, 8: false, 9: false };
  skidMarks = [];
  ghostModels = [];
  sharedBoxGeometry = null;

  shouldOnlyAllowInsertionNextToExisting =  false;
  orbitMode = false;
  orbitControlImg;
  distanceUiTop;
  groundUiTop;

  title = 'cubeGen';
  ground;
  snappingPlane;
  snappingHelperBase;
  snappingFocus;
  snappingFocusChevron;
  lastFocusPos;
  pickedColor = null;
  mouse;
  canvasContainer;
  palette = [ { color: '#9fdc9b', name: 'tbd' }, { color: '#63df92', name: 'tbd' }, { color: '#454f1d', name: 'tbd' }, { color: '#6B9700', name: 'tbd' }, { color: '#7CAA09', name: 'tbd' }, { color: '#72A100', name: 'tbd' }, { color: '#638B00', name: 'tbd' }, { color: '#5A7F00', name: 'tbd' }, { color: '#559200', name: 'tbd' }, { color: '#64A509', name: 'tbd' }, { color: '#5A9C00', name: 'tbd' }, { color: '#4E8700', name: 'tbd' }, { color: '#477B00', name: 'tbd' }, { color: '#809A00', name: 'tbd' }, { color: '#92AE0A', name: 'tbd' }, { color: '#88A500', name: 'tbd' }, { color: '#768F00', name: 'tbd' }, { color: '#6C8200', name: 'tbd' }, { color: '#FDADB6', name: 'tbd' }, { color: '#FEA9B3', name: 'tbd' }, { color: '#FEA9B3', name: 'tbd' }, { color: '#FCB5BE', name: 'tbd' }, { color: '#FCC5CB', name: 'tbd' }, { color: '#A6DAEE', name: 'tbd' }, { color: '#A9E3F9', name: 'tbd' }, { color: '#A6DFF4', name: 'tbd' }, { color: '#A9D6E7', name: 'tbd' }, { color: '#B1D3E0', name: 'tbd' }, { color: '#F3FEAD', name: 'tbd' }, { color: '#F3FFA9', name: 'tbd' }, { color: '#F2FEA9', name: 'tbd' }, { color: '#F3FDB6', name: 'tbd' }, { color: '#F5FDC6', name: 'tbd' }, { color: '#BAF8A9', name: 'tbd' }, { color: '#B9FDA8', name: 'tbd' }, { color: '#B8FAA7', name: 'tbd' }, { color: '#BEF5B0', name: 'tbd' }, { color: '#C8F2BD', name: 'tbd' }, { color: '#FFD8AE', name: 'tbd' }, { color: '#FFD6A9', name: 'tbd' }, { color: '#FFD6AA', name: 'tbd' }, { color: '#FFDDB7', name: 'tbd' }, { color: '#FFE5C8', name: 'tbd' }, { color: '#FFC8AB', name: 'tbd' }, { color: '#FFAF85', name: 'tbd' }, { color: '#FFB993', name: 'tbd' }, { color: '#D9A88E', name: 'tbd' }, { color: '#BE947E', name: 'tbd' }, { color: '#FFD9AB', name: 'tbd' }, { color: '#FFC785', name: 'tbd' }, { color: '#FFCE93', name: 'tbd' }, { color: '#D9B68E', name: 'tbd' }, { color: '#BEA17E', name: 'tbd' }, { color: '#6F90A2', name: 'tbd' }, { color: '#659CBA', name: 'tbd' }, { color: '#6895AD', name: 'tbd' }, { color: '#5D7A8A', name: 'tbd' }, { color: '#526B79', name: 'tbd' }, { color: '#71A898', name: 'tbd' }, { color: '#63BFA3', name: 'tbd' }, { color: '#67B29C', name: 'tbd' }, { color: '#5E8F80', name: 'tbd' }, { color: '#537E71', name: 'tbd' }];

  constructor(private exportService: ExportService, private textureService: TextureService) {
  }

  ngOnInit() {
    this.mouse = new THREE.Vector2();
    this.canvasContainer = window.document.getElementById('main-3d-container');
    this.pickedColor = this.palette[0];
    this.init();

    // window.onbeforeunload = (e) => e.returnValue = 'Are you sure you want to navigate away?';
    window.document.body.addEventListener('keydown', (e) => {
      const codesToActions = {
        'KeyQ': () => this.setOrbitMode(true),
        'KeyE': () => this.setOrbitMode(false),

        'KeyW': () => this.cameraRig.translateZ(- CUBE_SIZE / 2),
        'KeyS': () => this.cameraRig.translateZ(CUBE_SIZE / 2),
        'KeyA': () =>  this.cameraRig.translateX(-CUBE_SIZE / 2),
        'KeyD': () =>  this.cameraRig.translateX(CUBE_SIZE / 2),

        'KeyF': () =>  { if (e.shiftKey) { this.clearSkidMarks() } else { this.addSkidMark() } },

        'KeyZ': () => this.cameraRig.translateY(- CUBE_SIZE / 2),
        'KeyX': () => this.cameraRig.translateY(CUBE_SIZE / 2),

        'KeyI': () => this.stepRotateCameraRig('x'),
        'KeyK': () => this.stepRotateCameraRig('-x'),
        'KeyJ': () => this.stepRotateCameraRig('y'),
        'KeyL': () => this.stepRotateCameraRig('-y'),

        'KeyO': () => this.onCameraChange(this.cameras[0]),
        'KeyP': () => this.onCameraChange(this.cameras[1]),

        'ShiftLeft': () => this.changeSnappingPlaneLevel(1),
        'ControlLeft': () => this.changeSnappingPlaneLevel(-1),
        'Delete': (e) => this.onDeletePressed(e),
        'Enter': (e) => { this.applySubProjectsFromGhosts(); e.preventDefault(); },
        'Numpad1': () => this.toggleBrushZone(1),
        'Numpad2': () => this.toggleBrushZone(2),
        'Numpad3': () => this.toggleBrushZone(3),
        'Numpad4': () => this.toggleBrushZone(4),
        'Numpad6': () => this.toggleBrushZone(6),
        'Numpad7': () => this.toggleBrushZone(7),
        'Numpad8': () => this.toggleBrushZone(8),
        'Numpad9': () => this.toggleBrushZone(9),

        'Slash': () => this.handleProjectFileOutput(),
      };
      (codesToActions[e.code] || _.noop)(e);
    });

    this.canvasContainer.addEventListener('mousemove', (e) => this.onDocumentMouseMove(e), false);
    this.canvasContainer.addEventListener('click', (e) => { this.onDocumentClick(); e.preventDefault(); }, false);
    this.canvasContainer.addEventListener('mousedown', (e) => { if (e.which === 2) this.deleteBoxAtCursor() }, false); // middle mouse
    this.canvasContainer.addEventListener('wheel', (e) => {
      if (e.deltaY > 0) this.changeSnappingPlaneLevel(-1);
      if (e.deltaY < 0) this.changeSnappingPlaneLevel(1);
      e.preventDefault();
    }, false);
  }

  onDeletePressed(e) {
    if (this.ghostModels.length) {
      this.clearGhosts();
    } else if (e.shiftKey) {
      this.clearGhosts();
      this.clearProject();
    } else {
      this.deleteBoxAtCursor();
    }
  }

  onDocumentMouseMove (event) {
    event.preventDefault();
    this.mouse.x = ((event.pageX - this.canvasContainer.offsetLeft) / (this.canvasContainer.offsetWidth)) * 2 - 1;
    this.mouse.y = - ((event.pageY - this.canvasContainer.offsetTop) / (this.canvasContainer.offsetHeight)) * 2 + 1;
    this.orbitControlImg.style.left = `${event.pageX}px`;
    this.orbitControlImg.style.top = `${event.pageY + 24}px`;
  }

  onDocumentClick() {
    event.preventDefault();
    this.addBoxesAtFocus(this.pickedColor.color);
  }

  init() {
    var container;
    var perspectiveCamera, ortoCamera, scene, renderer;
    this.orbitControlImg = document.querySelector('.orbit-controls');

    container = this.canvasContainer;
    perspectiveCamera = new THREE.PerspectiveCamera(60, CANVAS_WIDTH / CANVAS_HEIGHT, 0.2, 2000);
    ortoCamera = new THREE.OrthographicCamera(- 100, 100, 200 * CANVAS_HEIGHT / CANVAS_WIDTH, 0 * CANVAS_HEIGHT / CANVAS_WIDTH, 0, 1000);
    ortoCamera.position.z = 400;
    ortoCamera.position.y = -50

    this.cameras = [{ name: 'Ortographic', id: 'ortographic', camera: ortoCamera }, { name: 'Perspective', id: 'perspective', camera: perspectiveCamera }];
    this.usedCamera = ortoCamera;

    scene = new THREE.Scene();
    // @ts-ignore-begin
    window.scene = scene; // for three js inspector extension
    // @ts-ignore-end

    this.scene = scene;
    scene.background = new THREE.Color(0xbfd1e5);
    this.projectGroup = new THREE.Group();
    this.projectGroup.name = "projectGroup";
    scene.add(this.projectGroup);

    this.addCameraRig(perspectiveCamera, ortoCamera, scene);
    this.addSnappingMeshHelperBase(scene);
    this.addSnappingMeshFocus(scene);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(CANVAS_WIDTH / CANVAS_HEIGHT);
    this.renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.renderer.shadowMap.enabled = true;

    container.appendChild(this.renderer.domElement);
    this.addLights(scene);
    this.addGround(scene);
    this.addSnappingPlane(scene);

    // @ts-ignore-begin
    this.orbitControls = new THREE.OrbitControls(ortoCamera, this.renderer.domElement);
    // this.orbitControls.target = this.snappingFocus.children[0];
    // this.orbitControls.target = this.ground;
    this.orbitControls.minPolarAngle = 0.15 * Math.PI;
    this.orbitControls.maxPolarAngle = 0.5 * Math.PI;
    this.orbitControls.setStartingPolarAngle(0.4 * Math.PI);

    this.orbitControls.update();

    this.startAnimation(renderer, scene);
    this.setOrbitMode(false);
    this.sharedBoxGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
  }

  addCameraRig(perspectiveCamera, ortoCamera, scene) {
    this.cameraRig = new THREE.Group();
    this.cameraRig.add(perspectiveCamera);
    this.cameraRig.add(ortoCamera);
    scene.add(this.cameraRig);
    this.cameraRig.position.set(0, CUBE_SIZE * 4, 60);
    perspectiveCamera.rotation.x = Math.PI * -0.1;
    ortoCamera.rotation.x = Math.PI * -0.1;
  }

  addGround(scene) {
    var groundGeo = new THREE.PlaneBufferGeometry(TERRAIN_SIZE, TERRAIN_SIZE);
    var groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    groundMat.color.setHSL( 0.095, 1, 0.75);
    this.ground = new THREE.Mesh( groundGeo, groundMat);
    this.ground.position.y = 0;
    this.ground.rotation.x = - Math.PI / 2;
    this.ground.receiveShadow = true;
    scene.add(this.ground);
  }

  addSnappingPlane(scene) {
    var planeGeo = new THREE.PlaneBufferGeometry(TERRAIN_SIZE, TERRAIN_SIZE);
    var planedMat = new THREE.MeshLambertMaterial({ color: 0xffffff, alphaTest: 0.1, opacity: 0 });
    planedMat.blending = THREE.SubtractiveBlending;
    this.snappingPlane = new THREE.Mesh( planeGeo, planedMat);
    this.snappingPlane.position.y = 0;
    this.snappingPlane.rotation.x = - Math.PI / 2;
    scene.add(this.snappingPlane);
  }

  setOrbitMode(orbitModeSetting) {
    this.orbitMode = orbitModeSetting;
    this.orbitControls.enabled = orbitModeSetting;
    this.snappingFocus.visible  = !orbitModeSetting;
  }

  changeSnappingPlaneLevel(level) {
    this.usedLevel = (this.usedLevel + level) < 0 ? 0 : this.usedLevel + level;
    const calculatedHeight = Math.min((this.usedLevel + 1) * CUBE_SIZE * 2, CANVAS_HEIGHT - 100);

    this.distanceUiTop = `${calculatedHeight}px`;
    this.groundUiTop = `${calculatedHeight}px`;

    const levelPos = level < 0 && (this.snappingPlane.position.y < CUBE_SIZE) ? 0 : (level * CUBE_SIZE);
    this.snappingHelperBase.position.y += levelPos;
    this.snappingPlane.position.y += levelPos;
    this.cameraRig.position.y += levelPos;
  }

  addLights(scene) {
    var ambientLight = new THREE.AmbientLight( 0x404040);
    scene.add( ambientLight);
    var light = new THREE.DirectionalLight( 0xffffff, 1);
    light.position.set( - 7, 10, 15);
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

    scene.add( light);
  }

  stepRotateCameraRig(axisStep) {
    if (this.cameraRotationInProgress) return;
    this.cameraRotationInProgress = true;

    const axisStepToRotation = {
      // new THREE.Matrix4().
      'x': () => [new THREE.Vector3(1, 0, 0), 0.5 ],
      '-x': () => [new THREE.Vector3(1, 0, 0), -0.5],
      'y': () => [new THREE.Vector3(0, 1, 0), 0.5],
      '-y': () => [new THREE.Vector3(0, 1, 0), -0.5],
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
      // const rotation = new THREE.Matrix4()[baseRotation](value * Math.PI);
      this.cameraRig.rotateOnWorldAxis(baseRotation, value * Math.PI);
      // this.cameraRig.applyMatrix( rotation);
      this.cameraRig.updateMatrixWorld();
    };

    const intervalRef = window.setInterval(() => {
      step(stepCount, baseRotation, endVal, 50, intervalRef)
      stepCount++;
    }, 10);
  }

  addSnappingMeshHelperBase(scene) {
    const DIVISIONS = 200;
    this.snappingHelperBase = new THREE.GridHelper(CUBE_SIZE * DIVISIONS, DIVISIONS, 0xf3fead, 0x659cba);
    this.snappingHelperBase.position.y = 0.1;
    this.snappingHelperBase.position.x = CUBE_SIZE / 2;
    this.snappingHelperBase.position.z = CUBE_SIZE / 2;
    scene.add( this.snappingHelperBase);
  }

  getBrushZoneShift(zoneIdx) {
    // x is normal, y is reversed and depth
    const zoneToCoords = {
      1: { x: -CUBE_SIZE, y: CUBE_SIZE, z: 0},
      2: { x: 0, y: CUBE_SIZE, z: 0},
      3: { x: CUBE_SIZE, y: CUBE_SIZE, z: 0},
      4: { x: -CUBE_SIZE, y: 0, z: 0},
      5: { x: 0, y: 0, z: 0},
      6: { x: CUBE_SIZE, y: 0, z: 0},
      7: { x: -CUBE_SIZE, y: -CUBE_SIZE, z: 0},
      8: { x: 0, y: -CUBE_SIZE, z: 0},
      9: { x: CUBE_SIZE, y: -CUBE_SIZE, z: 0},
    }

    return zoneToCoords[zoneIdx];
  }

  addSnappingMeshFocus(scene) {
    this.snappingFocus = new THREE.Group();
    const chevronGeometry = new THREE.Geometry();
    chevronGeometry.vertices.push(
      new THREE.Vector3( -5, 0, 0 ),
      new THREE.Vector3( 0, 10, 0 ),
      new THREE.Vector3( 5, 0, 0 )
    );

    const guideLineGeometry = new THREE.Geometry();
    guideLineGeometry.vertices.push( new THREE.Vector3(-9999, 0.3, 0), new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(9999, 0.3, 0));
    const guideLineMaterial = new THREE.LineBasicMaterial({ color: 0xffaf85 });

    const guideLine2Geometry = new THREE.Geometry();
    guideLine2Geometry.vertices.push( new THREE.Vector3(0, -9999, 0.3), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 9999, 0.3));

    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    this.snappingFocusChevron = new THREE.Line(chevronGeometry, material);

    const createFrame = () => {
      const frameGeo = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

      const geometry = new THREE.BoxGeometry(CUBE_SIZE, 1, 1);
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const frameGroup = new THREE.Group();
      frameGroup.add(new THREE.Mesh(geometry, material));
      frameGroup.add(new THREE.Mesh(geometry, material));
      frameGroup.add(new THREE.Mesh(geometry, material));
      frameGroup.add(new THREE.Mesh(geometry, material));
      frameGroup.children[0].position.y = -CUBE_SIZE / 2;
      frameGroup.children[1].position.y = CUBE_SIZE / 2;
      frameGroup.children[3].rotation.z = 0.5 * Math.PI;
      frameGroup.children[2].rotation.z = 0.5 * Math.PI;
      frameGroup.children[2].position.x = CUBE_SIZE / 2;
      frameGroup.children[3].position.x = -CUBE_SIZE / 2;
      return frameGroup;
    }

    this.snappingFocus.add(this.snappingFocusChevron);
    this.snappingFocus.add(new THREE.Line( guideLineGeometry, guideLineMaterial ));
    this.snappingFocus.add(new THREE.Line( guideLine2Geometry, guideLineMaterial ));

    this.snappingFocus.children[0].position.set(0, 0, -CUBE_SIZE);
    this.snappingFocus.children[0].rotation.x = Math.PI / 2;

    this.snappingFocus.children[1].position.z = -1;
    this.snappingFocus.children[2].position.z = -1;
    this.brushZones = {};

    _.times(9, (i) => {
      const zone = createFrame();
      zone.position.set(this.getBrushZoneShift(i + 1).x, this.getBrushZoneShift(i + 1).y, this.getBrushZoneShift(i + 1).z);
      this.brushZones[i + 1] = zone;
      this.snappingFocus.add(zone);
    });

    this.snappingFocus.position.set(0, 0.5, 0);
    this.snappingFocus.rotation.x = 0.5 * Math.PI;

    scene.add( this.snappingFocus);
    this.reapplyBrushZones();
  }

  startAnimation(renderer, scene) {
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 0.1;

    const animate = () => {
      requestAnimationFrame(animate);
      // this.orbitControls.update();
      this.renderer.render( scene, this.usedCamera);
      this.raycaster.setFromCamera(this.mouse, this.usedCamera);
      const intersections = this.raycaster.intersectObjects([this.snappingPlane]);
      const intersection = (intersections.length) > 0 ? intersections[ 0 ] : null;
      if (intersection) {
        const snappedPoint = new THREE.Vector3();
        snappedPoint.x = Math.ceil((intersection.point.x - CUBE_SIZE / 2)  / CUBE_SIZE) * CUBE_SIZE;
        snappedPoint.z = Math.ceil((intersection.point.z - CUBE_SIZE / 2) / CUBE_SIZE) * CUBE_SIZE;
        snappedPoint.y = Math.ceil((intersection.point.y - CUBE_SIZE / 2) / CUBE_SIZE) * CUBE_SIZE;

        if (this.lastFocusPos && snappedPoint && !this.lastFocusPos.equals(snappedPoint)) {
          this.reapplySnappingAlignmentHint(snappedPoint);
        }
        this.lastFocusPos = snappedPoint.clone();
        this.snappingFocus.position.copy(snappedPoint);
      }
    }
    animate();
  }

  reapplyBrushZones() {
    _.forEach(this.usedBrushZones, (value, key) => { this.brushZones[key].visible = value; })
  }

  reapplySnappingAlignmentHint(snappedPoint) {
    if (this.checkIfPointAllowsInsertion(snappedPoint, this.usedLevel, true)) {
      this.snappingFocusChevron.visible = true;
    } else {
      this.snappingFocusChevron.visible = false;
    }
  }

  checkIfPointAllowsInsertion(point, level, isOnBoxBottom?) {
    if (!point) return false;

    const testPoint = point.clone();
    if (isOnBoxBottom) testPoint.y = testPoint.y + CUBE_SIZE / 2;

    const checkIfPlaceTaken = (point, level) => {
      return _.find(this.projectModel[level], ['point', point]);
    };

    const checkIfExistsAdjacent = (point, level, coordConfig) => {
      const sameOrAdjacentLayerObjs = [...this.projectModel[level] || [], ...this.projectModel[level - 1] || [], ...this.projectModel[level + 1] || []];

      return _.find(sameOrAdjacentLayerObjs, (obj) =>
        (obj.point[coordConfig[0]] === point[coordConfig[0]] && obj.point[coordConfig[1]] === point[coordConfig[1]]) &&
        ((obj.point[coordConfig[2]] === point[coordConfig[2]] - CUBE_SIZE || obj.point[coordConfig[2]] === point[coordConfig[2]] + CUBE_SIZE)));
    };

    const coordConfigs = [['x', 'y', 'z'], ['y', 'z', 'x'], ['z', 'x', 'y']];
    const placeTaken = checkIfPlaceTaken(testPoint, level);

    if (placeTaken) {
      return false;
    } else if (level > 0) {
      return _.some(_.map(coordConfigs, (coordConf) => checkIfExistsAdjacent(testPoint, level, coordConf)))
    } else {
      return true;
    }
  }

  addBoxesAtFocus(color) {
    if (this.orbitMode) return;

    const addBoxAtPoint = (position) => {
      const snappedBoxPoint = new THREE.Vector3();
      snappedBoxPoint.copy(position);
      snappedBoxPoint.y = position.y + CUBE_SIZE / 2;

      if (!this.shouldOnlyAllowInsertionNextToExisting ||
          (this.shouldOnlyAllowInsertionNextToExisting && this.checkIfPointAllowsInsertion(snappedBoxPoint, this.usedLevel))) {
        const box = this.getStandardBox(color);

        box.position.copy(snappedBoxPoint);
        box.userData.level = this.usedLevel;
        this.projectGroup.add(box);

        this.projectModel[this.usedLevel] =  this.projectModel[this.usedLevel] || [];
        this.projectModel[this.usedLevel].push({
          point: snappedBoxPoint,
          color,
          box,
        });
      }
    }

    _.forEach(this.usedBrushZones, (value, key) => {
      const shift = this.getBrushZoneShift(key);
      const basePoint = this.snappingFocus.position;
      if (value) addBoxAtPoint(new THREE.Vector3(basePoint.x + shift.x, basePoint.y + shift.z, basePoint.z + shift.y));
    });
  }

  getStandardBox(color, opacity?) {
    let addOptions = {};
    if (!_.isNaN(opacity) && opacity < 1) {
      addOptions = { transparent: true, opacity, };
    }
    // const material = new THREE.MeshLambertMaterial(_.assign({ map: this.textureService.getTexture(color) }, addOptions));
    const material = new THREE.MeshLambertMaterial(_.assign({ color }, addOptions));
    const box = new THREE.Mesh(this.sharedBoxGeometry, material);
    return box;
  }

  pickColor(color) {
    this.pickedColor = color;
  }

  onCameraChange(camera) {
    this.usedCamera = camera.camera;
    this.usedCameraModel = camera.id;
  }

  toggleBrushZone(zoneIdx) {
    this.usedBrushZones[zoneIdx] = !this.usedBrushZones[zoneIdx];
    this.reapplyBrushZones();
  }

  getPointAtGroundCameraIsLookingAt() {
    const cameraVector = this.usedCamera.getWorldDirection();
    this.raycaster.setFromCamera(new Vector2(cameraVector.x ,cameraVector.y), this.usedCamera);
    const intersections = this.raycaster.intersectObjects([this.snappingPlane]);
    const intersection = (intersections.length) > 0 ? intersections[ 0 ] : null;
    if (intersection) {
      return intersection.point;
    }
  }

  deleteBoxAtCursor() {
    const intersections = this.raycaster.intersectObjects(_.compact(_.map(_.flatten(this.projectModel), 'box')));
    const intersection = (intersections.length) > 0 ? intersections[ 0 ] : null;
    if (intersection) {
      this.deleteFromProject(intersection.object);
    }
  }

  clearProject() {
    this.projectModel = _.map(this.projectModel, () => []);

    const removedIds = _.map(this.projectGroup.children, 'id');
    _.forEach(removedIds, (id) => { this.projectGroup.remove(this.projectGroup.getObjectById(id)); });
    this.reapplySnappingAlignmentHint(this.snappingFocus);
  }

  deleteFromProject(boxMesh) {
    if (_.isNil(boxMesh.userData.level)) console.error('BOX WITHOUT LEVEL DATA (REQUIRED TO CORRECTLY DELETE AND EXPORT AND MORE) FOUND IN deleteFromProject', boxMesh);

    _.remove(this.projectModel[boxMesh.userData.level], ['box.uuid', boxMesh.uuid]);
    this.projectGroup.remove(boxMesh);
    this.reapplySnappingAlignmentHint(this.snappingFocus);
  }

  getModelFromProject(type = 'dae') {
    const FACES_PER_BOX = 12;
    const boxes = _.compact(_.map(_.flatten(this.projectModel), 'box'));
    const resultGeometry = new THREE.Geometry();
    const projectMaterials = _.flatMap(boxes, 'material');
    _.forEach(boxes, (box) => resultGeometry.mergeMesh(box));
    resultGeometry.mergeVertices();

    resultGeometry.faces.forEach((face, i) => {
      face.materialIndex = Math.floor(i / FACES_PER_BOX);
    });

    if (type === 'dae') this.exportService.exportToDaeAndDownload(new THREE.Mesh(resultGeometry, projectMaterials));
    if (type === 'gltf') this.exportService.exportToGltfAndDownload(new THREE.Mesh(resultGeometry, projectMaterials)); // TODO: allow all materials (bug)
    if (type === 'obj') this.exportService.exportToObjAndDownload(new THREE.Mesh(resultGeometry, projectMaterials));
  }

  handleProjectFileOutput() {
    const exportProject = _.clone(this.projectModel);
    _.forEach(exportProject, (level) => _.forEach(level, (element) => (element.box = null)));
    this.exportService.exportToProjectFile(exportProject);
  }

  handleProjectFileInput(input, inputEl) {
    if (!input.length) return;
    const reader = new FileReader();
    reader.onload = () => {
      const importedProject = JSON.parse(<string>reader.result);
      this.addGhostModelFromSubProject(importedProject);
    };

    reader.readAsText(input[0]);
    inputEl.value = null;
  }

  addSkidMark() {
    const geometry = new THREE.PlaneBufferGeometry( CUBE_SIZE, 0.1, 1);
    const material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
    const plane = new THREE.Mesh(geometry, material);
    plane.position.copy(this.snappingFocus.position);
    this.scene.add(plane);
    this.skidMarks.push(plane);
  }

  clearSkidMarks() {
    const idsToClean = _.map(this.skidMarks, 'id');
    _.forEach(idsToClean, (id) => this.scene.remove(this.scene.getElementById(id)));
  }

  addGhostModelFromSubProject(subProject) {
    const ghostGroup = new THREE.Group();
    ghostGroup.name = 'ghostGroup';
    const controlObject = new Object3D();
    _.forEach(subProject, (level) => _.forEach(level, (object) => {
      const box = this.getStandardBox(object.color, 0.5);
      box.position.copy(new THREE.Vector3(object.point.x, object.point.y, object.point.z));
      ghostGroup.add(box);
    }));

    this.setOrbitMode(true);

    // @ts-ignore
    const control = new THREE.TransformControls(this.cameras[0].camera, this.renderer.domElement);
    control.setTranslationSnap(CUBE_SIZE);
    control.attach(ghostGroup);
    controlObject.add(control);
    controlObject.add(ghostGroup);
    controlObject.name = 'ghostGroupControl';

    const insertionPosition = this.getPointAtGroundCameraIsLookingAt();
    ghostGroup.position.copy(insertionPosition);

    const dragListener = (event) => (this.orbitControls.enabled = !event.value);
    control.addEventListener('dragging-changed', dragListener);

    this.scene.add(controlObject);
    this.ghostModels.push({
      group: ghostGroup,
      subProject,
      control,
      controlObject,
      dragListener,
    });
  }

  applySubProjectsFromGhosts() {
    const subProjectsData = this.clearGhosts();
    _.forEach(subProjectsData, (subProjectData) => this.applySubProject(subProjectData.subProject, subProjectData.shiftedPosition));
  }

  clearGhosts() {
    const subProjects = [];

    _.forEach(this.ghostModels, (model) => {
      const shiftedPosition = model.group.position;
      model.control.detach(model.group);
      model.control.removeEventListener(model.dragListener);
      this.scene.remove(model.controlObject);
      const idsToRemove = _.map(model.group.children, 'id');
      _.forEach(idsToRemove, (id) => model.group.remove(model.group.getObjectById(id)));
      subProjects.push({ subProject: model.subProject, shiftedPosition });
    });
    this.ghostModels = [];
    return subProjects;
  }

  applySubProject(subProject, shiftedPosition) {
    _.forEach(subProject, (levelContent, level) => {
      _.forEach(levelContent, (object) => {
        const box = this.getStandardBox(object.color);
        const boxPosition = new THREE.Vector3(object.point.x + shiftedPosition.x, object.point.y + shiftedPosition.y, object.point.z + shiftedPosition.z);
        box.position.copy(boxPosition);

        this.projectGroup.add(box);
        this.projectModel[level] = this.projectModel[level] ? this.projectModel[level] : [];
        box.userData.level = level;
        this.projectModel[level].push({
          point: boxPosition,
          color: object.color,
          box,
        });
      });
    });
  }
}
