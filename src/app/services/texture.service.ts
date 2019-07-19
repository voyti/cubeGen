import * as THREE from 'three';
import { Injectable } from '@angular/core';

const CUBE_SIZE = 12;

@Injectable({
  providedIn: 'root'
})
export class TextureService {

  constructor() { }

  getTexture(hexColor) {
    const textureCanvas = this.generateTexture(hexColor);
    const texture = new THREE.Texture(textureCanvas);
    texture.needsUpdate = true; // important
    return texture;
  }

   // source: https://codepen.io/rauluranga/pen/RNzboz
  generateTexture(hexColor) {

  // create canvas
  var canvas = document.createElement('canvas');
  canvas.width = CUBE_SIZE;
  canvas.height = CUBE_SIZE;

  // get context
  var context = canvas.getContext('2d');

  // draw background
  context.fillStyle = hexColor;
  context.fillRect( 0, 0, CUBE_SIZE, CUBE_SIZE );

  return canvas;
  }
}
