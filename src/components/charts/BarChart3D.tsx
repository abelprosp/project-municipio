import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, Text, OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface BarData {
  name: string;
  value: number;
  color: string;
}

interface BarChart3DProps {
  data: BarData[];
  maxValue: number;
}

type BackgroundType = 'transparent' | 'gradient' | 'dark' | 'light' | 'blue';

const backgrounds: Record<BackgroundType, string> = {
  transparent: 'transparent',
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  dark: '#0f172a',
  light: '#f8fafc',
  blue: '#1e3a8a',
};

// Tooltip 3D flutuante
function Tooltip3D({ 
  position, 
  label, 
  value, 
  percent,
  color 
}: { 
  position: [number, number, number]; 
  label: string;
  value: number;
  percent: number;
  color: string;
}) {
  return (
    <Html position={position} center>
      <Card className="p-2 bg-background/95 backdrop-blur-sm border shadow-lg min-w-[150px]">
        <div className="space-y-1">
          <div className="font-semibold text-sm flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </div>
          <div className="text-xs text-muted-foreground">
            Valor: <strong>{value}</strong>
          </div>
          <div className="text-xs text-muted-foreground">
            Percentual: <strong>{percent}%</strong>
          </div>
        </div>
      </Card>
    </Html>
  );
}

// Partículas de brilho ao redor das barras
function SparkleParticles({ position, active }: { position: [number, number, number]; active: boolean }) {
  const particlesRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (particlesRef.current && active) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      particlesRef.current.children.forEach((particle, i) => {
        if (particle instanceof THREE.Mesh) {
          const scale = 0.5 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.3;
          particle.scale.setScalar(scale);
        }
      });
    }
  });

  if (!active) return null;

  return (
    <group ref={particlesRef} position={position}>
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 1.5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return (
          <mesh key={i} position={[x, 2, z]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial 
              color="#ffffff" 
              emissive="#ffff00" 
              emissiveIntensity={0.8}
              transparent
              opacity={0.7}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Bar3D({ 
  position, 
  height, 
  color, 
  label, 
  value,
  index,
  total,
  percent,
  onBarClick,
  onHover,
  animationDelay,
  isHovered,
  isSelected
}: { 
  position: [number, number, number]; 
  height: number; 
  color: string;
  label: string;
  value: number;
  index: number;
  total: number;
  percent: number;
  onBarClick: (pos: [number, number, number], label: string, value: number, percent: number) => void;
  onHover?: (index: number | null) => void;
  animationDelay: number;
  isHovered: boolean;
  isSelected: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [animatedHeight, setAnimatedHeight] = useState(0);
  
  // Animação de entrada
  useEffect(() => {
    const timer = setTimeout(() => {
      const targetHeight = height;
      const duration = 800;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3); // Easing cubic
        setAnimatedHeight(targetHeight * easeOut);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    }, animationDelay);
    
    return () => clearTimeout(timer);
  }, [height, animationDelay]);

  useFrame((state) => {
    if (meshRef.current) {
      if (hovered || isSelected) {
        meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
        meshRef.current.scale.set(1.1, hovered ? 1.15 : 1.1, 1.1);
      } else {
        meshRef.current.rotation.y = 0;
        meshRef.current.scale.set(1, 1, 1);
      }
    }
  });

  const barWidth = 0.8;
  const barDepth = 0.8;
  const currentHeight = animatedHeight || height;

  return (
    <group position={position}>
      {/* Gradiente na barra usando mesh com gradiente */}
      <Box 
        ref={meshRef}
        args={[barWidth, currentHeight, barDepth]} 
        position={[0, currentHeight / 2, 0]}
        onPointerEnter={() => {
          setHovered(true);
          onHover?.(index);
        }}
        onPointerLeave={() => {
          setHovered(false);
          onHover?.(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onBarClick(position, label, value, percent);
        }}
      >
        <meshStandardMaterial 
          color={hovered || isSelected ? color : color} 
          emissive={hovered || isSelected ? color : '#000000'}
          emissiveIntensity={hovered || isSelected ? 0.4 : 0}
          metalness={0.5}
          roughness={0.3}
        />
      </Box>
      
      {/* Gradiente adicional usando mesh transparente */}
      <Box 
        args={[barWidth * 0.95, currentHeight * 0.3, barDepth * 0.95]} 
        position={[0, currentHeight * 0.85, 0.01]}
      >
        <meshStandardMaterial 
          color={color}
          transparent
          opacity={0.3}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </Box>

      {/* Partículas de brilho */}
      <SparkleParticles position={[0, currentHeight, 0]} active={hovered || isSelected} />
      
      {/* Valor e percentual no topo da barra - SEMPRE mostrar */}
      {currentHeight > 0 && (
        <group position={[0, currentHeight + 0.4, 0]}>
          <Text
            position={[0, 0.15, 0]}
            fontSize={0.25}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.03}
            outlineColor="#000000"
            fontWeight="bold"
          >
            {value}
          </Text>
          <Text
            position={[0, -0.1, 0]}
            fontSize={0.18}
            color="#94a3b8"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
            fontWeight="500"
          >
            {percent}%
          </Text>
        </group>
      )}
      
      {/* Label na frente da barra (não rotacionado) - sempre na base */}
      <Text
        position={[0, 0, barDepth / 2 + 0.25]}
        fontSize={0.18}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="#000000"
        maxWidth={3}
        fontWeight="500"
      >
        {label.length > 15 ? label.substring(0, 13) + '...' : label}
      </Text>

      {/* Tooltip 3D quando hovered */}
      {hovered && (
        <Tooltip3D
          position={[0, currentHeight + 1.5, 0]}
          label={label}
          value={value}
          percent={percent}
          color={color}
        />
      )}

      {/* Sombra embaixo da barra */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[barWidth * 1.2, barDepth * 1.2]} />
        <meshStandardMaterial 
          color="#000000" 
          transparent 
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

export function BarChart3D({ data, maxValue }: BarChart3DProps) {
  const [backgroundType] = useState<BackgroundType>('transparent'); // Fixo - sem seleção
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Sem dados para exibir
      </div>
    );
  }

  const normalizedData = data.map(item => ({
    ...item,
    normalizedHeight: Math.max(0.1, (item.value / maxValue) * 4),
  }));

  const spacing = 1.8; // Reduzido para deixar os gráficos mais próximos
  const totalWidth = (data.length - 1) * spacing;
  const startX = -totalWidth / 2;

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  const topStatus = sortedData[0];

  const getBackgroundStyle = () => {
    const bg = backgrounds[backgroundType];
    if (backgroundType === 'gradient') {
      return { background: bg };
    }
    return { backgroundColor: bg };
  };


  return (
    <div ref={containerRef} className="w-full h-full flex flex-col">
      {/* Controles removidos - gráfico simplificado */}

      {/* Canvas 3D */}
      <div className="flex-1 relative" style={getBackgroundStyle()}>
        <Canvas
          camera={{ position: [0, 5, 7], fov: 45 }} // Vista fixa mais vertical
          style={{ width: '100%', height: '100%' }}
          gl={{ antialias: true, alpha: backgroundType === 'transparent', preserveDrawingBuffer: true }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, 5, -5]} intensity={0.5} />
          <pointLight position={[0, 10, 0]} intensity={0.3} />
          
          {/* Grid base com gradiente */}
          <gridHelper args={[20, 20, '#475569', '#1e293b']} position={[0, 0, 0]} />
          
          {/* Linha de referência REMOVIDA */}
          
          {/* Barras com animação sequencial */}
          {normalizedData.map((item, index) => {
            const percent = Math.round((item.value / totalValue) * 100);
            return (
              <Bar3D
                key={index}
                position={[startX + index * spacing, 0, 0]}
                height={item.normalizedHeight}
                color={item.color}
                label={item.name}
                value={item.value}
                index={index}
                total={data.length}
                percent={percent}
                onBarClick={() => {}} // Desabilitado
                onHover={(idx) => setHoveredBar(idx)}
                animationDelay={index * 100}
                isHovered={hoveredBar === index}
                isSelected={false} // Sem seleção
              />
            );
          })}
          
          {/* Controles de órbita desabilitados - vista fixa */}
          <OrbitControls 
            enablePan={false}
            enableZoom={false}
            enableRotate={false}
            target={[0, 0, 0]}
          />
        </Canvas>
      </div>

      {/* Legenda descritiva */}
      <div className="mt-4 pt-4 border-t flex-shrink-0">
        <div className="text-sm space-y-2">
          <div className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            Distribuição dos Projetos por Status
          </div>
          <div className="text-muted-foreground text-xs space-y-1">
            <div>
              <strong>Total de projetos:</strong> {totalValue} projetos
            </div>
            <div>
              <strong>Status predominante:</strong> {topStatus?.name} com {topStatus?.value} projetos ({Math.round((topStatus?.value / totalValue) * 100)}%)
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {sortedData.slice(0, 5).map((item) => {
                const itemPercent = Math.round((item.value / totalValue) * 100);
                return (
                  <span key={item.name} className="inline-flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded">
                    <span 
                      className="inline-block h-2 w-2 rounded-full" 
                      style={{ backgroundColor: item.color }} 
                    />
                    {item.name}: {item.value} ({itemPercent}%)
                  </span>
                );
              })}
              {sortedData.length > 5 && (
                <span className="text-xs text-muted-foreground px-2 py-1">
                  +{sortedData.length - 5} outros status
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
