import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// La escena 3D va en su propio fichero: así three solo se descarga cuando hace falta
// y el título de la portada no tiene que esperarlo.

// El HDR de estudio se sirve desde la propia web: la CSP no deja pedirlo fuera.
const HDR_ESTUDIO = '/hdr/studio_small_03_1k.hdr';
const VERDE = '#0C3B33';
const BLANCO = new THREE.Color('#FFFFFF');

// Una esfera deformada con ondas suaves: sale una piedra de cristal, sin aristas.
function crearEscultura() {
  const base = new THREE.IcosahedronGeometry(1.25, 40);
  base.deleteAttribute('uv');
  base.deleteAttribute('normal');
  const geo = mergeVertices(base);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const { x, y, z } = v;
    const onda =
      0.16 * Math.sin(1.7 * x + 0.6) * Math.cos(1.3 * y - 0.4) +
      0.12 * Math.sin(2.1 * y + 1.1 * z) +
      0.08 * Math.cos(2.6 * z - 1.4 * x + 0.9);
    v.multiplyScalar(1 + onda);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function Escultura({ quieta }: { quieta: boolean }) {
  const grupo = useRef<THREE.Group>(null);
  const raton = useRef({ x: 0, y: 0 });
  const giro = useRef(0);
  const geometria = useMemo(crearEscultura, []);

  useEffect(() => () => geometria.dispose(), [geometria]);

  // El ratón se sigue en toda la ventana, no solo encima del dibujo
  useEffect(() => {
    if (quieta) return;
    const mover = (e: PointerEvent) => {
      raton.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      raton.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', mover, { passive: true });
    return () => window.removeEventListener('pointermove', mover);
  }, [quieta]);

  useFrame((_, delta) => {
    const g = grupo.current;
    if (!g || quieta) return;
    const d = Math.min(delta, 0.05);
    giro.current += d * 0.12;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, giro.current + raton.current.x * 0.45, 3, d);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, raton.current.y * 0.28, 3, d);
  });

  return (
    <Float speed={quieta ? 0 : 1.2} rotationIntensity={0.25} floatIntensity={0.7} floatingRange={[-0.08, 0.08]}>
      <group ref={grupo}>
        <mesh geometry={geometria}>
          <MeshTransmissionMaterial
            samples={10}
            resolution={512}
            transmission={1}
            roughness={0.3}
            thickness={0.9}
            ior={1.25}
            chromaticAberration={0.02}
            anisotropicBlur={0.2}
            distortion={0.15}
            distortionScale={0.4}
            temporalDistortion={0}
            color="#F4F8F6"
            attenuationColor={VERDE}
            attenuationDistance={9}
            background={BLANCO}
          />
        </mesh>
        {/* Dos piezas detrás del cristal, para que se vea que refracta */}
        <mesh position={[0.5, -0.3, -1.5]}>
          <sphereGeometry args={[0.34, 48, 48]} />
          <meshStandardMaterial color={VERDE} roughness={0.35} />
        </mesh>
        <mesh position={[-0.75, 0.6, -1.1]}>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshStandardMaterial color="#D9D9DE" roughness={0.2} metalness={0.4} />
        </mesh>
      </group>
    </Float>
  );
}

// "parada" deja de dibujar del todo: se usa cuando la escultura no está a la vista
export default function HeroEscena({ quieta, parada = false }: { quieta: boolean; parada?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 7.4], fov: 35 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      frameloop={parada ? 'never' : quieta ? 'demand' : 'always'}
      fallback={null}
    >
      <color attach="background" args={['#FFFFFF']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 5, 3]} intensity={1.4} />
      <Escultura quieta={quieta} />
      <Environment files={HDR_ESTUDIO} />
    </Canvas>
  );
}
