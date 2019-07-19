import { Injectable } from '@angular/core';
import * as THREE from 'three';
import '../threeExtras';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  exportToObjAndDownload(mesh) {
    // @ts-ignore-begin
    var exporter = new THREE.OBJExporter();
    var result = exporter.parse(mesh);
    this.downloadTextFile(result, 'cubegen_model.obj');
  }

  exportToDaeAndDownload(mesh) {
    // @ts-ignore-begin
    var exporter = new THREE.ColladaExporter();
    const result = exporter.parse(mesh);
    this.downloadTextFile(result.data, 'cubegen_model.dae');
  }

  exportToGltfAndDownload(mesh) {
    // @ts-ignore-begin
    var exporter = new THREE.GLTFExporter();

    exporter.parse( mesh, (gltf) => {
      this.downloadTextFile(JSON.stringify( gltf, null, 2 ), 'cubegen_model.gltf');
    }, { forceIndices: true });
  }

  downloadTextFile(result, filename) {
    const blob = new Blob([result], {'type': 'text/plain'});
    const url = window.URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    // the filename you want
    a.download = filename;
    window.document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  }

  exportToProjectFile(project) {
    this.downloadTextFile(JSON.stringify(project), 'cubegen_project.cbg');
  }
}
