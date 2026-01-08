precision mediump float;

varying vec3 vNormal;
varying vec3 vPosition;

uniform vec3 uLightPosition;
uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
uniform float uShininess;
uniform float uAlpha;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightPosition - vPosition);
  vec3 viewDir = normalize(-vPosition);
  vec3 reflectDir = reflect(-lightDir, normal);

  vec3 ambient = uAmbientColor;

  float diff = max(dot(normal, lightDir), 0.0);
  vec3 diffuse = diff * uDiffuseColor;

  float spec = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
  vec3 specular = spec * uSpecularColor;

  vec3 result = ambient + diffuse + specular;
  gl_FragColor = vec4(result, uAlpha);
}
