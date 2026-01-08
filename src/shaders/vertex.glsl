attribute vec3 aPosition;
attribute vec3 aNormal;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec4 position = uModelViewMatrix * vec4(aPosition, 1.0);
  vPosition = position.xyz;
  vNormal = (uNormalMatrix * vec4(aNormal, 0.0)).xyz;
  gl_Position = uProjectionMatrix * position;
}
