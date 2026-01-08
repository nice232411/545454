import { mat4, quat, vec3 } from 'gl-matrix';

interface ConeParams {
  radius: number;
  height: number;
  segments: number;
}

interface Orientation {
  axis: vec3;
  quat: quat;
}

class ConeAnimation {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private coneBuffer: WebGLBuffer | null = null;
  private coneNormalBuffer: WebGLBuffer | null = null;
  private coneIndexBuffer: WebGLBuffer | null = null;
  private axisBuffer: WebGLBuffer | null = null;
  private directionVectorBuffer: WebGLBuffer | null = null;
  private coneParams: ConeParams = { radius: 1, height: 2, segments: 32 };
  private coneVertexCount = 0;

  private startOrientation: Orientation;
  private endOrientation: Orientation;
  private animationProgress = 0;
  private isAnimating = false;
  private animationSpeed = 0.01;
  private showIntermediateFrames = true;
  private intermediateFrames: quat[] = [];
  private loopAnimation = true;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    const gl = this.canvas.getContext('webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    this.gl = gl;

    this.startOrientation = {
      axis: vec3.fromValues(0, 1, 0),
      quat: quat.create()
    };

    this.endOrientation = {
      axis: vec3.fromValues(1, 0, 0),
      quat: quat.create()
    };

    this.updateOrientationQuaternions();
  }

  private updateOrientationQuaternions() {
    const upVector = vec3.fromValues(0, 1, 0);

    quat.rotationTo(this.startOrientation.quat, upVector, this.startOrientation.axis);
    quat.rotationTo(this.endOrientation.quat, upVector, this.endOrientation.axis);

    this.generateIntermediateFrames();
  }

  private generateIntermediateFrames() {
    this.intermediateFrames = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const q = quat.create();
      quat.slerp(q, this.startOrientation.quat, this.endOrientation.quat, t);
      this.intermediateFrames.push(q);
    }
  }

  private async loadShader(url: string): Promise<string> {
    const response = await fetch(url);
    return await response.text();
  }

  async initialize() {
    const vertexShaderSource = await this.loadShader('/src/shaders/vertex.glsl');
    const fragmentShaderSource = await this.loadShader('/src/shaders/fragment.glsl');

    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    this.program = this.createProgram(vertexShader, fragmentShader);

    this.generateCone();
    this.generateAxisLines();
    this.generateDirectionVectors();

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.render();
  }

  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      throw new Error('Shader compilation error: ' + info);
    }

    return shader;
  }

  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program = this.gl.createProgram()!;
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(program);
      throw new Error('Program linking error: ' + info);
    }

    return program;
  }

  private generateCone() {
    const { radius, height, segments } = this.coneParams;
    const vertices: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    vertices.push(0, height / 2, 0);
    normals.push(0, 1, 0);

    const sideNormalY = radius / Math.sqrt(radius * radius + height * height);
    const sideNormalXZ = height / Math.sqrt(radius * radius + height * height);

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = radius * Math.cos(theta);
      const z = radius * Math.sin(theta);

      vertices.push(x, -height / 2, z);

      normals.push(
        sideNormalXZ * Math.cos(theta),
        sideNormalY,
        sideNormalXZ * Math.sin(theta)
      );
    }

    for (let i = 0; i < segments; i++) {
      indices.push(0, i + 1, i + 2);
    }

    const baseCenter = vertices.length / 3;
    vertices.push(0, -height / 2, 0);
    normals.push(0, -1, 0);

    for (let i = segments; i >= 1; i--) {
      indices.push(baseCenter, i + 1, i);
    }

    this.coneVertexCount = indices.length;

    this.coneBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.coneBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

    this.coneNormalBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.coneNormalBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);

    this.coneIndexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.coneIndexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
  }

  private generateAxisLines() {
    const axisLength = 3;
    const vertices = [
      0, 0, 0,  axisLength, 0, 0,
      0, 0, 0,  0, axisLength, 0,
      0, 0, 0,  0, 0, axisLength
    ];

    this.axisBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axisBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
  }

  private generateDirectionVectors() {
    const vectorLength = this.coneParams.height * 1.5;
    const startDir = vec3.clone(this.startOrientation.axis);
    const endDir = vec3.clone(this.endOrientation.axis);

    vec3.scale(startDir, startDir, vectorLength);
    vec3.scale(endDir, endDir, vectorLength);

    const vertices = [
      0, 0, 0, startDir[0], startDir[1], startDir[2],
      0, 0, 0, endDir[0], endDir[1], endDir[2]
    ];

    this.directionVectorBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.directionVectorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.DYNAMIC_DRAW);
  }

  private drawCone(quaternion: quat, alpha: number) {
    if (!this.program) return;

    const modelMatrix = mat4.create();
    const rotationMatrix = mat4.create();
    mat4.fromQuat(rotationMatrix, quaternion);
    mat4.multiply(modelMatrix, modelMatrix, rotationMatrix);

    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, [5, 5, 5], [0, 0, 0], [0, 1, 0]);

    const modelViewMatrix = mat4.create();
    mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, this.canvas.width / this.canvas.height, 0.1, 100);

    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    this.gl.useProgram(this.program);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.coneBuffer);
    const positionLoc = this.gl.getAttribLocation(this.program, 'aPosition');
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 3, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.coneNormalBuffer);
    const normalLoc = this.gl.getAttribLocation(this.program, 'aNormal');
    this.gl.enableVertexAttribArray(normalLoc);
    this.gl.vertexAttribPointer(normalLoc, 3, this.gl.FLOAT, false, 0, 0);

    const uModelViewMatrix = this.gl.getUniformLocation(this.program, 'uModelViewMatrix');
    const uProjectionMatrix = this.gl.getUniformLocation(this.program, 'uProjectionMatrix');
    const uNormalMatrix = this.gl.getUniformLocation(this.program, 'uNormalMatrix');

    this.gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
    this.gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
    this.gl.uniformMatrix4fv(uNormalMatrix, false, normalMatrix);

    const uLightPosition = this.gl.getUniformLocation(this.program, 'uLightPosition');
    const uAmbientColor = this.gl.getUniformLocation(this.program, 'uAmbientColor');
    const uDiffuseColor = this.gl.getUniformLocation(this.program, 'uDiffuseColor');
    const uSpecularColor = this.gl.getUniformLocation(this.program, 'uSpecularColor');
    const uShininess = this.gl.getUniformLocation(this.program, 'uShininess');
    const uAlpha = this.gl.getUniformLocation(this.program, 'uAlpha');

    this.gl.uniform3f(uLightPosition, 5, 5, 5);
    this.gl.uniform3f(uAmbientColor, 0.3, 0.3, 0.3);
    this.gl.uniform3f(uDiffuseColor, 0.4, 0.7, 1.0);
    this.gl.uniform3f(uSpecularColor, 0.8, 0.8, 0.8);
    this.gl.uniform1f(uShininess, 64.0);
    this.gl.uniform1f(uAlpha, alpha);

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.coneIndexBuffer);
    this.gl.drawElements(this.gl.TRIANGLES, this.coneVertexCount, this.gl.UNSIGNED_SHORT, 0);
  }

  private drawAxes() {
    if (!this.program) return;

    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, [5, 5, 5], [0, 0, 0], [0, 1, 0]);

    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, this.canvas.width / this.canvas.height, 0.1, 100);

    const modelViewMatrix = mat4.create();
    mat4.copy(modelViewMatrix, viewMatrix);

    const normalMatrix = mat4.create();
    mat4.identity(normalMatrix);

    this.gl.useProgram(this.program);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axisBuffer);
    const positionLoc = this.gl.getAttribLocation(this.program, 'aPosition');
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 3, this.gl.FLOAT, false, 0, 0);

    const normalLoc = this.gl.getAttribLocation(this.program, 'aNormal');
    this.gl.disableVertexAttribArray(normalLoc);
    this.gl.vertexAttrib3f(normalLoc, 0, 1, 0);

    const uModelViewMatrix = this.gl.getUniformLocation(this.program, 'uModelViewMatrix');
    const uProjectionMatrix = this.gl.getUniformLocation(this.program, 'uProjectionMatrix');
    const uNormalMatrix = this.gl.getUniformLocation(this.program, 'uNormalMatrix');

    this.gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
    this.gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
    this.gl.uniformMatrix4fv(uNormalMatrix, false, normalMatrix);

    const uLightPosition = this.gl.getUniformLocation(this.program, 'uLightPosition');
    const uAmbientColor = this.gl.getUniformLocation(this.program, 'uAmbientColor');
    const uDiffuseColor = this.gl.getUniformLocation(this.program, 'uDiffuseColor');
    const uSpecularColor = this.gl.getUniformLocation(this.program, 'uSpecularColor');
    const uShininess = this.gl.getUniformLocation(this.program, 'uShininess');
    const uAlpha = this.gl.getUniformLocation(this.program, 'uAlpha');

    this.gl.uniform3f(uLightPosition, 5, 5, 5);
    this.gl.uniform3f(uSpecularColor, 0, 0, 0);
    this.gl.uniform1f(uShininess, 1.0);
    this.gl.uniform1f(uAlpha, 1.0);

    this.gl.uniform3f(uAmbientColor, 1, 0, 0);
    this.gl.uniform3f(uDiffuseColor, 1, 0, 0);
    this.gl.drawArrays(this.gl.LINES, 0, 2);

    this.gl.uniform3f(uAmbientColor, 0, 1, 0);
    this.gl.uniform3f(uDiffuseColor, 0, 1, 0);
    this.gl.drawArrays(this.gl.LINES, 2, 2);

    this.gl.uniform3f(uAmbientColor, 0, 0, 1);
    this.gl.uniform3f(uDiffuseColor, 0, 0, 1);
    this.gl.drawArrays(this.gl.LINES, 4, 2);
  }

  private drawDirectionVectors() {
    if (!this.program) return;

    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, [5, 5, 5], [0, 0, 0], [0, 1, 0]);

    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, this.canvas.width / this.canvas.height, 0.1, 100);

    const modelViewMatrix = mat4.create();
    mat4.copy(modelViewMatrix, viewMatrix);

    const normalMatrix = mat4.create();
    mat4.identity(normalMatrix);

    this.gl.useProgram(this.program);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.directionVectorBuffer);
    const positionLoc = this.gl.getAttribLocation(this.program, 'aPosition');
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 3, this.gl.FLOAT, false, 0, 0);

    const normalLoc = this.gl.getAttribLocation(this.program, 'aNormal');
    this.gl.disableVertexAttribArray(normalLoc);
    this.gl.vertexAttrib3f(normalLoc, 0, 1, 0);

    const uModelViewMatrix = this.gl.getUniformLocation(this.program, 'uModelViewMatrix');
    const uProjectionMatrix = this.gl.getUniformLocation(this.program, 'uProjectionMatrix');
    const uNormalMatrix = this.gl.getUniformLocation(this.program, 'uNormalMatrix');

    this.gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
    this.gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
    this.gl.uniformMatrix4fv(uNormalMatrix, false, normalMatrix);

    const uLightPosition = this.gl.getUniformLocation(this.program, 'uLightPosition');
    const uAmbientColor = this.gl.getUniformLocation(this.program, 'uAmbientColor');
    const uDiffuseColor = this.gl.getUniformLocation(this.program, 'uDiffuseColor');
    const uSpecularColor = this.gl.getUniformLocation(this.program, 'uSpecularColor');
    const uShininess = this.gl.getUniformLocation(this.program, 'uShininess');
    const uAlpha = this.gl.getUniformLocation(this.program, 'uAlpha');

    this.gl.uniform3f(uLightPosition, 5, 5, 5);
    this.gl.uniform3f(uSpecularColor, 0, 0, 0);
    this.gl.uniform1f(uShininess, 1.0);
    this.gl.uniform1f(uAlpha, 1.0);

    this.gl.lineWidth(2.0);

    this.gl.uniform3f(uAmbientColor, 1, 1, 0);
    this.gl.uniform3f(uDiffuseColor, 1, 1, 0);
    this.gl.drawArrays(this.gl.LINES, 0, 2);

    this.gl.uniform3f(uAmbientColor, 1, 0.5, 0);
    this.gl.uniform3f(uDiffuseColor, 1, 0.5, 0);
    this.gl.drawArrays(this.gl.LINES, 2, 2);

    this.gl.lineWidth(1.0);
  }

  private render() {
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clearColor(0.1, 0.1, 0.15, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.drawAxes();
    this.drawDirectionVectors();

    if (this.showIntermediateFrames && !this.isAnimating) {
      for (let i = 0; i < this.intermediateFrames.length; i++) {
        const alpha = 0.15 + (i / this.intermediateFrames.length) * 0.3;
        this.drawCone(this.intermediateFrames[i], alpha);
      }
    } else {
      const currentQuat = quat.create();
      quat.slerp(currentQuat, this.startOrientation.quat, this.endOrientation.quat, this.animationProgress);
      this.drawCone(currentQuat, 1.0);
    }

    if (this.isAnimating) {
      this.animationProgress += this.animationSpeed;
      if (this.animationProgress >= 1) {
        if (this.loopAnimation) {
          this.animationProgress = 0;
        } else {
          this.animationProgress = 1;
          this.isAnimating = false;
        }
      }
    }

    requestAnimationFrame(() => this.render());
  }

  startAnimation() {
    this.isAnimating = true;
    this.animationProgress = 0;
  }

  stopAnimation() {
    this.isAnimating = false;
  }

  resetAnimation() {
    this.animationProgress = 0;
    this.isAnimating = false;
  }

  setAnimationSpeed(speed: number) {
    this.animationSpeed = speed;
  }

  setShowIntermediateFrames(show: boolean) {
    this.showIntermediateFrames = show;
  }

  setConeParams(params: Partial<ConeParams>) {
    this.coneParams = { ...this.coneParams, ...params };
    this.generateCone();
  }

  setStartAxis(axis: vec3) {
    vec3.normalize(this.startOrientation.axis, axis);
    this.updateOrientationQuaternions();
    this.generateDirectionVectors();
  }

  setEndAxis(axis: vec3) {
    vec3.normalize(this.endOrientation.axis, axis);
    this.updateOrientationQuaternions();
    this.generateDirectionVectors();
  }

  setLoopAnimation(loop: boolean) {
    this.loopAnimation = loop;
  }

  getAnimationProgress(): number {
    return this.animationProgress;
  }
}

export default ConeAnimation;
