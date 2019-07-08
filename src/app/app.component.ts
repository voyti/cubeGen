import { Component } from '@angular/core';
import * as THREE from 'three';
import './threeExtras';
import _ from 'lodash';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const CUBE_SIZE = 12;
const TERRAIN_SIZE = 10000;

//TODO: ctrl+z, help guide, direct insertion mode, selection mode, copying/pasting selections, color numbering & last used + switching
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  scene;
  cameras;
  cameraRig;
  controls;
  raycaster;
  usedCamera;
  usedCameraModel: string = 'ortographic';
  usedLevel = 0;
  projectModel = [];
  projectGroup: THREE.Group;
  cameraRotationInProgress = false;

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
  constructor() {
  }

  ngOnInit() {
    this.mouse = new THREE.Vector2();
    this.canvasContainer = document.getElementById('main-3d-container');
    this.pickedColor = this.palette[0];
    this.init();

    document.body.addEventListener('keydown', (e) => {
      const codesToActions = {
        'KeyW': () => this.cameraRig.position.z -= CUBE_SIZE / 2,
        'KeyS': () => this.cameraRig.position.z += CUBE_SIZE / 2,
        'KeyA': () => this.cameraRig.position.x -= CUBE_SIZE / 2,
        'KeyD': () => this.cameraRig.position.x += CUBE_SIZE / 2,

        'KeyI': () => this.stepRotateCameraRig('z'),
        'KeyK': () => this.stepRotateCameraRig('-z'),
        'KeyJ': () => this.stepRotateCameraRig('y'),
        'KeyL': () => this.stepRotateCameraRig('-y'),

        'KeyO': () => this.onCameraChange(this.cameras[0]),
        'KeyP': () => this.onCameraChange(this.cameras[1]),

        'ShiftLeft': () => this.changeSnappingPlaneLevel(1),
        'ControlLeft': () => this.changeSnappingPlaneLevel(-1),
        'Delete': () => this.deleteBoxAtCursor(),
        'Enter': () => this.getModelFromProject(),
      };
      (codesToActions[e.code] || _.noop)();
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

  onDocumentMouseMove (event) {
    event.preventDefault();
    this.mouse.x = ((event.pageX - this.canvasContainer.offsetLeft) / (this.canvasContainer.offsetWidth)) * 2 - 1;
    this.mouse.y = - ((event.pageY - this.canvasContainer.offsetTop) / (this.canvasContainer.offsetHeight)) * 2 + 1;
  }

  onDocumentClick() {
    event.preventDefault();
    this.addBoxAtFocus(this.scene, this.pickedColor.color);
  }

  init() {
    var container;
    var perspectiveCamera, ortoCamera, scene, renderer;

    container = this.canvasContainer;
    perspectiveCamera = new THREE.PerspectiveCamera(60, CANVAS_WIDTH / CANVAS_HEIGHT, 0.2, 2000);
    ortoCamera = new THREE.OrthographicCamera(- 100, 100, 200 * CANVAS_HEIGHT / CANVAS_WIDTH, 0 * CANVAS_HEIGHT / CANVAS_WIDTH, 0, 1000);
    ortoCamera.position.z = 400;
    ortoCamera.position.y = -50
    console.warn(perspectiveCamera);
    console.warn(ortoCamera);

    this.cameras = [{ name: 'Ortographic', id: 'ortographic', camera: ortoCamera }, { name: 'Perspective', id: 'perspective', camera: perspectiveCamera }];
    this.usedCamera = ortoCamera;

    scene = new THREE.Scene();
    // @ts-ignore-begin
    window.scene = scene; // for three js inspector extension
    // @ts-ignore-end

    this.scene = scene;
    scene.background = new THREE.Color(0xbfd1e5);
    this.projectGroup = new THREE.Group();
    scene.add(this.projectGroup);

    this.addCameraRig(perspectiveCamera, ortoCamera, scene);
    this.addSnappingMeshHelperBase(scene);
    this.addSnappingMeshFocus(scene);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(CANVAS_WIDTH / CANVAS_HEIGHT);
    renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
    renderer.shadowMap.enabled = true;
    // @ts-ignore-begin
    // this.controls = new THREE.OrbitControls(this.cameraRig, renderer.domElement);

    container.appendChild(renderer.domElement);
    this.addLights(scene);
    this.addGround(scene);
    this.addSnappingPlane(scene);

    this.startAnimation(renderer, scene);
  }

  addCameraRig(perspectiveCamera, ortoCamera, scene) {
    this.cameraRig = new THREE.Group();
    this.cameraRig.add(perspectiveCamera);
    this.cameraRig.add(ortoCamera);
    scene.add(this.cameraRig);
    this.cameraRig.position.set(0, CUBE_SIZE * 4, 60);
    this.cameraRig.rotation.x = Math.PI * -0.1;

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
      this.cameraRig.applyMatrix( rotation);
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

  addSnappingMeshFocus(scene) {
    this.snappingFocus = new THREE.Group();
    var geometry = new THREE.PlaneBufferGeometry( CUBE_SIZE, CUBE_SIZE, 1);
    var chevronGeometry = new THREE.Geometry();
    chevronGeometry.vertices.push(
      new THREE.Vector3( -5, 0, 0 ),
      new THREE.Vector3( 0, 10, 0 ),
      new THREE.Vector3( 5, 0, 0 )
    );

    var guideLineGeometry = new THREE.Geometry();
    guideLineGeometry.vertices.push( new THREE.Vector3(-9999, 0.3, 0), new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(9999, 0.3, 0));
    const guideLineMaterial = new THREE.LineBasicMaterial({ color: 0xffaf85 });

    var guideLine2Geometry = new THREE.Geometry();
    guideLine2Geometry.vertices.push( new THREE.Vector3(0, -9999, 0.3), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 9999, 0.3));

    var edges = new THREE.EdgesGeometry( geometry);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    this.snappingFocusChevron = new THREE.Line(chevronGeometry, material)

    this.snappingFocus.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial(material)));
    this.snappingFocus.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial(material)));
    this.snappingFocus.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial(material)));
    this.snappingFocus.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial(material)));
    this.snappingFocus.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial(material)));
    this.snappingFocus.add(this.snappingFocusChevron);
    this.snappingFocus.add(new THREE.Line( guideLineGeometry, guideLineMaterial ));
    this.snappingFocus.add(new THREE.Line( guideLine2Geometry, guideLineMaterial ));

    this.snappingFocus.children[1].position.set(0.05, 0, -0.05);
    this.snappingFocus.children[2].position.set(0.1, 0, -0.1);
    this.snappingFocus.children[3].position.set(-0.05, 0, -0.05);
    this.snappingFocus.children[4].position.set(-0.1, 0, -0.1);

    this.snappingFocus.children[5].position.set(0, 0, -CUBE_SIZE);
    this.snappingFocus.children[5].rotation.x = Math.PI / 2;

    this.snappingFocus.children[6].position.z = -1;
    this.snappingFocus.children[7].position.z = -1;

    this.snappingFocus.position.set(0, 0.5, 0);
    this.snappingFocus.rotation.x = 0.5 * Math.PI;

    scene.add( this.snappingFocus);
  }

  startAnimation(renderer, scene) {
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 0.1;

    const animate = () => {
      requestAnimationFrame(animate);
      // this.controls.update();
      renderer.render( scene, this.usedCamera);
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

  addBoxAtFocus(scene, color) {
    const snappedBoxPoint = new THREE.Vector3();
    snappedBoxPoint.copy(this.snappingFocus.position);
    snappedBoxPoint.y = this.snappingFocus.position.y + CUBE_SIZE / 2;

    if (this.checkIfPointAllowsInsertion(snappedBoxPoint, this.usedLevel)) {
      var material = new THREE.MeshLambertMaterial({ color });
      // var geometry = new THREE.BoxBufferGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
      var geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
      const box = new THREE.Mesh(geometry, material);

      box.position.copy(snappedBoxPoint);
      box.userData.level = this.usedLevel;
      this.projectGroup.add(box);

      this.projectModel[this.usedLevel] =  this.projectModel[this.usedLevel] || [];
      this.projectModel[this.usedLevel].push({
        point: snappedBoxPoint,
        box,
      });
    }
  }

  pickColor(color) {
    this.pickedColor = color;
  }

  onCameraChange(camera) {
    this.usedCamera = camera.camera;
    this.usedCameraModel = camera.id;
  }

  deleteBoxAtCursor() {
    const intersections = this.raycaster.intersectObjects(_.compact(_.map(_.flatten(this.projectModel), 'box')));
    const intersection = (intersections.length) > 0 ? intersections[ 0 ] : null;
    if (intersection) {
      this.deleteFromProject(intersection.object);
    }
  }

  deleteFromProject(boxMesh) {
    _.remove(this.projectModel[boxMesh.userData.level], ['box.uuid', boxMesh.uuid]);
    this.projectGroup.remove(boxMesh);
    this.reapplySnappingAlignmentHint(this.snappingFocus);
  }

  getModelFromProject(type = 'gltf') {
    const boxes = _.compact(_.map(_.flatten(this.projectModel), 'box'));
    const resultGeometry = new THREE.Geometry();
    const projectMaterials = _.map(boxes, 'material');
    _.forEach(boxes, (box) => resultGeometry.merge(box.geometry, box.matrix, 1));
    if (type === 'gltf') this.exportToGltfAndDownload(new THREE.Mesh(resultGeometry, projectMaterials[0])); // TODO: allow all materials (bug)
    if (type === 'obj') this.exportToObjAndDownload(new THREE.Mesh(resultGeometry, projectMaterials));
  }

  exportToObjAndDownload(mesh) {
    // @ts-ignore-begin
    var exporter = new THREE.OBJExporter();
    var result = exporter.parse(mesh);
    this.downloadModelFile(result);
  }

  exportToGltfAndDownload(mesh) {
    // @ts-ignore-begin
    var exporter = new THREE.GLTFExporter();

    exporter.parse( mesh, (gltf) => {
      this.downloadModelFile(JSON.stringify( gltf, null, 2 ));
    });
  }

  downloadModelFile(result) {
    const blob = new Blob([result], {'type': 'text/plain'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    // the filename you want
    a.download = 'cobegen_project.gltf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);

  }


}
