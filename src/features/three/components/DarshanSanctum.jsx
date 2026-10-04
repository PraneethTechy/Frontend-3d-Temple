import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useQueueStore } from '../../../store/useQueueStore.js';
import { useCapacityExpansionStore } from '../../simulation/capacityExpansionStore.js';

/**
 * Authentic Dravidian Darshan Sanctum (Garbhagriha & Mukha Mandapam)
 * Inspired by Arunachaleswarar Temple, Tiruvannamalai.
 * Features:
 * - Sacred Peetham platform
 * - Arunachaleswarar Shiva Lingam with triple Vibhuti markings & red Kumkum tilak
 * - Avudaiyar (Yoni-Peetham) pedestal with Gomukha spout
 * - Golden Prabhavali flaming halo arch
 * - Twin brass Kuthu Vilakku tall diya oil lamps with warm glow
 * - Reverent stone Nandi bull on pedestal in Mukha Mandapam facing the sanctum
 * - Stepped Dravidian Vimana tower with golden Kalasa finial
 * - Mukha Mandapam with carved Dravidian pillars framing the vista
 */
export function DarshanSanctum({ component, isSelected, showLabels: propShowLabels }) {
  const { dimensions = {}, properties = {} } = component;
  const length = Number(dimensions.length) || 18; // Width across facade (X)
  const width = Number(dimensions.width) || 16;   // Depth along axis (Z)
  const height = Number(dimensions.height) || 14; // Vimana height (Y)

  const storeShowLabels = useQueueStore((state) => state.showLabels);
  const isCapacityModalOpen = useCapacityExpansionStore((state) => state.isOpen);
  const isSaveModalOpen = useQueueStore((state) => state.isSaveModalOpen);
  const isPlansModalOpen = useQueueStore((state) => state.isPlansModalOpen);
  const isAnyModalOpen = isCapacityModalOpen || isSaveModalOpen || isPlansModalOpen;
  const showLabels = !isAnyModalOpen && (propShowLabels !== undefined ? propShowLabels : (storeShowLabels ?? true));

  const deityName = properties.deity || 'Arunachaleswarar Shiva Lingam';
  const vimanaHeight = Number(properties.vimanaHeight) || height;
  const showNandi = properties.showNandi !== undefined ? properties.showNandi : true;
  const showPrabhavali = properties.showPrabhavali !== undefined ? properties.showPrabhavali : true;
  const diyaGlow = properties.diyaGlow !== undefined ? properties.diyaGlow : true;
  const entranceWidth = Math.min(length * 0.45, Math.max(3.0, Number(properties.entranceWidth || properties.archWidth) || 5.0));

  // Authentic Dravidian temple stone palette matching the campus gopurams
  const darkGranite = '#7A6E5F'; // Heavy foundation plinth granite (warm aged granite)
  const templeStone = properties.stoneColor && !properties.stoneColor.toLowerCase().includes('9ca3af') && !properties.stoneColor.toLowerCase().includes('7e6852')
    ? properties.stoneColor 
    : '#B5A693'; // Warm weathered temple limestone/granite
  const moldStone = '#8E8070'; // Moldings & jambs
  const warmStone = '#A39482'; // Pillar shafts
  const polishedMarble = '#E4E4E7';
  const goldBrass = '#D4AF37';
  const kumkumRed = '#991B1B';
  const vibhutiWhite = '#F8FAFC';

  const sanctumDepth = width * 0.45;
  const mandapamDepth = width * 0.55;
  const sanctumWidth = length * 0.70;

  // Garbhagriha wall thickness & door opening
  const doorWidth = entranceWidth * 0.65;
  const doorHeight = 4.0;

  return (
    <group>
      {/* 1. Grand Sculpted Adhishthana Plinth Foundation */}
      <mesh position={[0, 0.25, 0]} receiveShadow>
        <boxGeometry args={[length + 1.8, 0.5, width + 1.8]} />
        <meshStandardMaterial color={darkGranite} roughness={0.88} />
      </mesh>
      {/* Upper Polished Tier Step */}
      <mesh position={[0, 0.6, 0]} receiveShadow>
        <boxGeometry args={[length + 1.0, 0.25, width + 1.0]} />
        <meshStandardMaterial color={polishedMarble} roughness={0.45} />
      </mesh>

      {/* 2. Rear Garbhagriha (Inner Sanctum Chamber) */}
      <group position={[0, 0.72, -width / 2 + sanctumDepth / 2]}>
        {/* Outer Sanctum Walls (Left, Right, Back) */}
        {/* Back Wall */}
        <mesh position={[0, 2.8, -sanctumDepth / 2 + 0.35]} castShadow receiveShadow>
          <boxGeometry args={[sanctumWidth, 5.6, 0.7]} />
          <meshStandardMaterial color={templeStone} roughness={0.72} />
        </mesh>
        {/* Left Wall */}
        <mesh position={[-sanctumWidth / 2 + 0.35, 2.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 5.6, sanctumDepth]} />
          <meshStandardMaterial color={templeStone} roughness={0.72} />
        </mesh>
        {/* Right Wall */}
        <mesh position={[sanctumWidth / 2 - 0.35, 2.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 5.6, sanctumDepth]} />
          <meshStandardMaterial color={templeStone} roughness={0.72} />
        </mesh>

        {/* Front Portal Wall with Substantial Ceremonial Gateway Opening */}
        {/* Left jamb */}
        <mesh
          position={[-(sanctumWidth / 2 + doorWidth / 2) / 2, 2.8, sanctumDepth / 2 - 0.35]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[(sanctumWidth - doorWidth) / 2, 5.6, 0.7]} />
          <meshStandardMaterial color={templeStone} roughness={0.72} />
        </mesh>
        {/* Right jamb */}
        <mesh
          position={[(sanctumWidth / 2 + doorWidth / 2) / 2, 2.8, sanctumDepth / 2 - 0.35]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[(sanctumWidth - doorWidth) / 2, 5.6, 0.7]} />
          <meshStandardMaterial color={templeStone} roughness={0.72} />
        </mesh>
        {/* Lintel above door */}
        <mesh position={[0, doorHeight + (5.6 - doorHeight) / 2, sanctumDepth / 2 - 0.35]} castShadow receiveShadow>
          <boxGeometry args={[doorWidth + 0.2, 5.6 - doorHeight, 0.7]} />
          <meshStandardMaterial color={darkGranite} roughness={0.65} />
        </mesh>

        {/* Ceremonial Torana Doorway Arch Frame */}
        <mesh position={[0, doorHeight / 2, sanctumDepth / 2 + 0.05]}>
          <boxGeometry args={[doorWidth + 0.6, doorHeight + 0.4, 0.2]} />
          <meshStandardMaterial color={goldBrass} roughness={0.3} metalness={0.75} />
        </mesh>

        {/* Sacred Garbhagriha Inner Sanctum Golden Door Leaves (Suvarna Kapatam) */}
        {[-1, 1].map((doorSide) => {
          const hingeX = doorSide * (doorWidth / 2 - 0.08);
          const leafW = doorWidth * 0.48;
          return (
            <group
              key={`garbha-door-${doorSide}`}
              position={[hingeX, 0, sanctumDepth / 2 - 0.15]}
              rotation={[0, doorSide * THREE.MathUtils.degToRad(78), 0]}
            >
              {/* Embossed Golden Door Leaf */}
              <mesh position={[doorSide * (leafW / 2), doorHeight / 2, 0]} castShadow>
                <boxGeometry args={[leafW, doorHeight * 0.96, 0.1]} />
                <meshStandardMaterial color={goldBrass} roughness={0.25} metalness={0.88} />
              </mesh>
              {/* Dark Teak Wood Core Trim Frame */}
              <mesh position={[doorSide * (leafW / 2), doorHeight / 2, -0.04]} castShadow>
                <boxGeometry args={[leafW + 0.04, doorHeight * 0.98, 0.04]} />
                <meshStandardMaterial color="#2B1810" roughness={0.6} />
              </mesh>
              {/* Sacred Brass Studs / Bosses */}
              {[-0.6, 0, 0.6].map((rowY, rIdx) => (
                <mesh key={`inner-stud-${rIdx}`} position={[doorSide * (leafW / 2), doorHeight / 2 + rowY, 0.06]}>
                  <sphereGeometry args={[0.045, 8, 8]} />
                  <meshStandardMaterial color="#FFFBEB" roughness={0.2} metalness={0.9} />
                </mesh>
              ))}
            </group>
          );
        })}

        {/* Inner Chamber Floor (Dressed Dark Granite) */}
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <boxGeometry args={[sanctumWidth - 1.4, 0.1, sanctumDepth - 1.4]} />
          <meshStandardMaterial color={darkGranite} roughness={0.6} />
        </mesh>

        {/* ======================================================== */}
        {/* 3. SACRED ARUNACHALESWARAR SHIVA SANCTUM FOCAL OBJECT    */}
        {/* ======================================================== */}
        <group position={[0, 0.1, -sanctumDepth * 0.05]}>
          {/* Peetham Base 1: Octagonal/Square Granite Base */}
          <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.5, 1.7, 0.6, 8]} />
            <meshStandardMaterial color={darkGranite} roughness={0.5} />
          </mesh>

          {/* Peetham Base 2: Moulded Avudaiyar (Circular Yoni-Peetham Base) */}
          <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.3, 1.45, 0.35, 24]} />
            <meshStandardMaterial color={darkGranite} roughness={0.4} />
          </mesh>

          {/* Gomukha (Drainage Spout projecting to the Left / North) */}
          <mesh position={[-1.2, 0.75, 0]} rotation={[0, 0, -0.05]} castShadow>
            <boxGeometry args={[0.9, 0.2, 0.4]} />
            <meshStandardMaterial color={darkGranite} roughness={0.4} />
          </mesh>

          {/* Sacred Black Granite Shiva Lingam (Main Focal Cylinder + Dome) */}
          <group position={[0, 1.35, 0]}>
            {/* Lingam Main Shaft */}
            <mesh castShadow>
              <cylinderGeometry args={[0.55, 0.58, 1.1, 24]} />
              <meshStandardMaterial color="#171412" roughness={0.3} metalness={0.25} />
            </mesh>
            {/* Lingam Smooth Hemispherical Dome Apex */}
            <mesh position={[0, 0.55, 0]} castShadow>
              <sphereGeometry args={[0.55, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#171412" roughness={0.3} metalness={0.25} />
            </mesh>

            {/* Sacred Shaivite Markings (Facing forward +Z towards the devotees): */}
            {/* Triple White Vibhuti Stripes (Tripundra) */}
            {[-0.08, 0, 0.08].map((offY, vIdx) => (
              <mesh key={`vibhuti-${vIdx}`} position={[0, 0.2 + offY, 0.565]}>
                <boxGeometry args={[0.52, 0.032, 0.02]} />
                <meshStandardMaterial color={vibhutiWhite} roughness={0.2} />
              </mesh>
            ))}
            {/* Red Kumkum Tilak Bindu Dot in center */}
            <mesh position={[0, 0.2, 0.575]}>
              <cylinderGeometry args={[0.045, 0.045, 0.02, 16]} rotation={[Math.PI / 2, 0, 0]} />
              <meshStandardMaterial color={kumkumRed} roughness={0.3} />
            </mesh>

            {/* Fresh Sacred Yellow/Orange Floral Garland (Mala) */}
            <mesh position={[0, -0.05, 0]} rotation={[0.15, 0, 0]} castShadow>
              <torusGeometry args={[0.62, 0.08, 10, 24]} />
              <meshStandardMaterial color="#F59E0B" roughness={0.6} />
            </mesh>
          </group>

          {/* Golden Prabhavali Flaming Halo Arch rising behind the Lingam */}
          {showPrabhavali && (
            <group position={[0, 1.5, -0.35]}>
              {/* Outer Golden Arch */}
              <mesh castShadow>
                <torusGeometry args={[1.3, 0.1, 12, 32, Math.PI]} rotation={[0, 0, 0]} />
                <meshStandardMaterial color={goldBrass} roughness={0.22} metalness={0.9} />
              </mesh>
              {/* Twin Supporting Pillars of Prabhavali */}
              {[-1.3, 1.3].map((archX, pIdx) => (
                <mesh key={`prabha-post-${pIdx}`} position={[archX, -0.65, 0]} castShadow>
                  <cylinderGeometry args={[0.09, 0.11, 1.3, 12]} />
                  <meshStandardMaterial color={goldBrass} roughness={0.22} metalness={0.9} />
                </mesh>
              ))}
              {/* Crest Kirtimukha (Face of Glory) / Kalasam at arch peak */}
              <mesh position={[0, 1.4, 0]} castShadow>
                <coneGeometry args={[0.2, 0.45, 12]} />
                <meshStandardMaterial color={goldBrass} roughness={0.18} metalness={0.92} />
              </mesh>
            </group>
          )}

          {/* Twin Brass Kuthu Vilakku (Traditional Standing Oil Lamps) Flanking the Altar */}
          {[-1.4, 1.4].map((lampX, lIdx) => (
            <group key={`kuthu-vilakku-${lIdx}`} position={[lampX, 0.5, 0.1]}>
              {/* Bell Base */}
              <mesh position={[0, 0.15, 0]} castShadow>
                <cylinderGeometry args={[0.16, 0.3, 0.3, 16]} />
                <meshStandardMaterial color={goldBrass} roughness={0.25} metalness={0.85} />
              </mesh>
              {/* Tall Stem */}
              <mesh position={[0, 0.8, 0]} castShadow>
                <cylinderGeometry args={[0.04, 0.05, 1.0, 12]} />
                <meshStandardMaterial color={goldBrass} roughness={0.25} metalness={0.85} />
              </mesh>
              {/* Oil Reservoir Basin */}
              <mesh position={[0, 1.35, 0]} castShadow>
                <cylinderGeometry args={[0.22, 0.1, 0.12, 16]} />
                <meshStandardMaterial color={goldBrass} roughness={0.25} metalness={0.85} />
              </mesh>
              {/* Diya Wick Golden Flame */}
              <mesh position={[0, 1.46, 0]}>
                <coneGeometry args={[0.05, 0.14, 12]} />
                <meshBasicMaterial color="#FEF08A" />
              </mesh>
            </group>
          ))}

          {/* Sacred Diya Glow PointLights Illuminating the Lingam */}
          {diyaGlow && (
            <>
              <pointLight position={[0, 1.8, 0.8]} color="#F59E0B" intensity={4.5} distance={12} />
              <pointLight position={[0, 2.2, -0.2]} color="#FB923C" intensity={2.5} distance={7} />
            </>
          )}
        </group>

        {/* 4. Elegant Low-Profile Garbhagriha Roof with Golden Kalasa Finial */}
        <group position={[0, 5.6, 0]}>
          {/* Heavy Dressed Stone Roof Slab */}
          <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
            <boxGeometry args={[sanctumWidth + 0.4, 0.30, sanctumDepth + 0.4]} />
            <meshStandardMaterial color={moldStone} roughness={0.70} />
          </mesh>
          {/* Classical Kapota Drip-Cornice */}
          <mesh position={[0, 0.38, 0]} castShadow>
            <boxGeometry args={[sanctumWidth + 0.8, 0.18, sanctumDepth + 0.8]} />
            <meshStandardMaterial color={templeStone} roughness={0.65} />
          </mesh>
          {/* Sacred Golden Kalasa Finial atop Sanctum Roof */}
          <group position={[0, 0.75, 0]}>
            <mesh castShadow>
              <coneGeometry args={[0.35, 0.90, 16]} />
              <meshStandardMaterial color={goldBrass} roughness={0.22} metalness={0.90} />
            </mesh>
            <mesh position={[0, -0.25, 0]}>
              <sphereGeometry args={[0.30, 14, 14]} />
              <meshStandardMaterial color={goldBrass} roughness={0.22} metalness={0.90} />
            </mesh>
          </group>
        </group>
      </group>

      {/* 5. Mukha Mandapam (Pillared Front Viewing Pavilion) */}
      <group position={[0, 0.72, width / 2 - mandapamDepth / 2]}>
        {/* Carved Dravidian Stone Pillars supporting the Mandapam Ceiling */}
        {[-length * 0.38, -length * 0.22, length * 0.22, length * 0.38].map((pX, colIdx) =>
          [-mandapamDepth * 0.36, 0, mandapamDepth * 0.36].map((pZ, rowIdx) => {
            // Keep central viewing corridor open between -length*0.22 and +length*0.22!
            return (
              <group key={`mandapa-pillar-${colIdx}-${rowIdx}`} position={[pX, 0, pZ]}>
                {/* Plinth */}
                <mesh position={[0, 0.3, 0]}>
                  <boxGeometry args={[0.55, 0.6, 0.55]} />
                  <meshStandardMaterial color={darkGranite} roughness={0.75} />
                </mesh>
                {/* Shaft */}
                <mesh position={[0, 2.2, 0]} castShadow>
                  <cylinderGeometry args={[0.22, 0.26, 3.2, 16]} />
                  <meshStandardMaterial color={warmStone} roughness={0.65} />
                </mesh>
                {/* Bodika Capital */}
                <mesh position={[0, 3.9, 0]}>
                  <boxGeometry args={[0.65, 0.3, 0.65]} />
                  <meshStandardMaterial color={darkGranite} roughness={0.6} />
                </mesh>
              </group>
            );
          })
        )}

        {/* ======================================================== */}
        {/* 6. SACRED NANDI BULL SEATED IN MANDAPAM FACING SANCTUM  */}
        {/* ======================================================== */}
        {showNandi && (
          <group position={[0, 0, mandapamDepth * 0.15]}>
            {/* Nandi Stone Pedestal */}
            <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.4, 0.6, 2.0]} />
              <meshStandardMaterial color={darkGranite} roughness={0.8} />
            </mesh>
            {/* Upper Moulding */}
            <mesh position={[0, 0.65, 0]} receiveShadow>
              <boxGeometry args={[1.5, 0.12, 2.1]} />
              <meshStandardMaterial color={templeStone} roughness={0.7} />
            </mesh>

            {/* Recumbent Black Granite Nandi Bull (Facing -Z toward the Sanctum!) */}
            <group position={[0, 0.72, 0]}>
              {/* Nandi Body */}
              <mesh position={[0, 0.38, 0.1]} castShadow>
                <boxGeometry args={[0.85, 0.65, 1.4]} />
                <meshStandardMaterial color="#1F1A17" roughness={0.4} />
              </mesh>
              {/* Nandi Hump */}
              <mesh position={[0, 0.78, -0.1]} castShadow>
                <sphereGeometry args={[0.32, 14, 14]} />
                <meshStandardMaterial color="#1F1A17" roughness={0.4} />
              </mesh>
              {/* Nandi Head facing -Z towards Garbhagriha */}
              <mesh position={[0, 0.7, -0.65]} rotation={[-0.2, 0, 0]} castShadow>
                <boxGeometry args={[0.42, 0.45, 0.6]} />
                <meshStandardMaterial color="#1F1A17" roughness={0.4} />
              </mesh>
              {/* Nandi Horns */}
              {[-0.16, 0.16].map((hX, hIdx) => (
                <mesh key={`horn-${hIdx}`} position={[hX, 0.98, -0.6]} rotation={[-0.3, 0, hX * 1.5]} castShadow>
                  <coneGeometry args={[0.06, 0.28, 8]} />
                  <meshStandardMaterial color="#110E0C" roughness={0.3} />
                </mesh>
              ))}
              {/* Nandi Golden Bell Garland */}
              <mesh position={[0, 0.5, -0.3]} rotation={[0.4, 0, 0]}>
                <torusGeometry args={[0.46, 0.05, 8, 18]} />
                <meshStandardMaterial color={goldBrass} roughness={0.25} metalness={0.85} />
              </mesh>
            </group>
          </group>
        )}

        {/* Mandapam Flat Stone Ceiling & Parapet */}
        <mesh position={[0, 4.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[length * 0.92, 0.45, mandapamDepth * 0.95]} />
          <meshStandardMaterial color={darkGranite} roughness={0.7} />
        </mesh>
        {/* Decorative Parapet Band */}
        <mesh position={[0, 4.5, 0]}>
          <boxGeometry args={[length * 0.94, 0.35, mandapamDepth * 0.98]} />
          <meshStandardMaterial color={kumkumRed} roughness={0.5} />
        </mesh>
      </group>

      {/* 7. Grand Ceremonial Maha Dwara (Darshan Entrance Gateway) */}
      {/* Aligned directly with the approaching queue to communicate: "THIS IS WHERE I ENTER FOR DARSHAN" */}
      <group position={[0, 0, width / 2]}>
        {/* Flanking Dressed Granite Portal Pylons */}
        {[-1, 1].map((side) => (
          <group key={`maha-dwara-pylon-${side}`} position={[side * (entranceWidth / 2 + 0.6), 0, 0]}>
            {/* Plinth */}
            <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.9, 0.8, 0.9]} />
              <meshStandardMaterial color={darkGranite} roughness={0.85} />
            </mesh>
            {/* Portal Column Stambha */}
            <mesh position={[0, 2.4, 0]} castShadow>
              <cylinderGeometry args={[0.3, 0.35, 3.2, 16]} />
              <meshStandardMaterial color={templeStone} roughness={0.7} />
            </mesh>
            {/* Bodika Capital */}
            <mesh position={[0, 4.15, 0]} castShadow>
              <boxGeometry args={[1.0, 0.35, 1.0]} />
              <meshStandardMaterial color={moldStone} roughness={0.65} />
            </mesh>
          </group>
        ))}

        {/* Overhead Ceremonial Architrave Lintel Beam */}
        <mesh position={[0, 4.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[entranceWidth + 2.4, 0.45, 1.0]} />
          <meshStandardMaterial color={darkGranite} roughness={0.7} />
        </mesh>

        {/* Golden Torana Arch Crest atop Entrance Portal */}
        <mesh position={[0, 5.0, 0]} castShadow>
          <boxGeometry args={[entranceWidth + 1.2, 0.55, 0.3]} />
          <meshStandardMaterial color={goldBrass} roughness={0.28} metalness={0.8} />
        </mesh>

        {/* Grand Maha Dwara Temple Doors (Dwara Kapatam - Heavy Carved Teak & Brass Doors) */}
        {[-1, 1].map((doorSide) => {
          const hingeX = doorSide * (entranceWidth / 2 - 0.12);
          const leafW = entranceWidth * 0.44;
          const doorH = 3.6;
          return (
            <group
              key={`maha-dwara-door-${doorSide}`}
              position={[hingeX, 0.72, 0.1]}
              rotation={[0, doorSide * THREE.MathUtils.degToRad(76), 0]}
            >
              {/* Massive Seasoned Teak Wood Door Leaf */}
              <mesh position={[doorSide * (leafW / 2), doorH / 2, 0]} castShadow>
                <boxGeometry args={[leafW, doorH, 0.14]} />
                <meshStandardMaterial color="#351C0F" roughness={0.65} metalness={0.15} />
              </mesh>
              {/* Outer Golden Brass Border Cladding */}
              <mesh position={[doorSide * (leafW / 2), doorH / 2, 0.05]} castShadow>
                <boxGeometry args={[leafW * 0.88, doorH * 0.90, 0.06]} />
                <meshStandardMaterial color={goldBrass} roughness={0.3} metalness={0.82} />
              </mesh>
              {/* Inner Carved Wood Relief Inset */}
              <mesh position={[doorSide * (leafW / 2), doorH / 2, 0.09]}>
                <boxGeometry args={[leafW * 0.74, doorH * 0.78, 0.03]} />
                <meshStandardMaterial color="#261208" roughness={0.7} />
              </mesh>
              {/* Ornate Brass Bosses / Spikes (3x3 grid) */}
              {[-0.9, 0, 0.9].map((offY, yIdx) =>
                [-leafW * 0.25, 0, leafW * 0.25].map((offX, xIdx) => (
                  <mesh
                    key={`boss-${yIdx}-${xIdx}`}
                    position={[doorSide * (leafW / 2 + offX), doorH / 2 + offY, 0.11]}
                  >
                    <sphereGeometry args={[0.055, 8, 8]} />
                    <meshStandardMaterial color="#FDE047" roughness={0.2} metalness={0.9} />
                  </mesh>
                ))
              )}
              {/* Sacred Brass Temple Door Ring Knocker */}
              <mesh position={[doorSide * (leafW * 0.65), doorH * 0.45, 0.13]} castShadow>
                <torusGeometry args={[0.12, 0.03, 8, 16]} />
                <meshStandardMaterial color={goldBrass} roughness={0.25} metalness={0.85} />
              </mesh>
            </group>
          );
        })}

        {/* Stepped Granite Threshold Stairs (Descending from Mandapam Y=0.72 to Ground Y=0) */}
        {[0, 1, 2].map((stepIdx) => {
          const stepY = 0.24 * (2 - stepIdx) + 0.12;
          const stepZ = 0.45 * (stepIdx + 1);
          return (
            <mesh key={`threshold-step-${stepIdx}`} position={[0, stepY, stepZ]} receiveShadow>
              <boxGeometry args={[entranceWidth + 0.4 - stepIdx * 0.2, 0.24, 0.45]} />
              <meshStandardMaterial color={darkGranite} roughness={0.75} />
            </mesh>
          );
        })}

        {/* Welcoming Entrance Diya Lamps Flanking the Stairs */}
        {[-entranceWidth / 2 - 1.4, entranceWidth / 2 + 1.4].map((lampX, lIdx) => (
          <group key={`entrance-lamp-${lIdx}`} position={[lampX, 0, 1.2]}>
            <mesh position={[0, 0.4, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.28, 0.8, 12]} />
              <meshStandardMaterial color={darkGranite} roughness={0.75} />
            </mesh>
            <mesh position={[0, 1.0, 0]} castShadow>
              <sphereGeometry args={[0.18, 12, 12]} />
              <meshStandardMaterial color={goldBrass} roughness={0.25} metalness={0.85} />
            </mesh>
            <pointLight position={[0, 1.2, 0]} color="#F59E0B" intensity={1.8} distance={8} />
          </group>
        ))}

        {/* Welcoming Portal Luminous Badge: MAHA DWARA | DARSHAN ENTRANCE */}
        <Html position={[0, 3.8, 0.6]} center distanceFactor={28} zIndexRange={[90, 0]}>
          <div className="pointer-events-none select-none px-3 py-1 rounded-lg bg-stone-950/95 border border-amber-400 text-amber-200 font-bold text-[11px] tracking-wider shadow-2xl flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-amber-400 font-serif font-black">🚪</span>
            <span>MAHA DWARA</span>
            <span className="text-[9px] text-amber-300 font-normal">| DARSHAN ENTRANCE</span>
          </div>
        </Html>
      </group>

      {/* 8. Front Darshan Viewing Corridor Railings (Direct, unobstructed central vista) */}
      <group position={[0, 0.72, width / 2 - 0.2]}>
        {/* Flanking Brass Rails leaving the central aisle open */}
        {[-length * 0.32, length * 0.32].map((railX, rIdx) => (
          <group key={`front-rail-${rIdx}`} position={[railX, 0, 0]}>
            <mesh position={[0, 0.85, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.035, 0.035, length * 0.28, 16]} />
              <meshStandardMaterial color={goldBrass} roughness={0.25} metalness={0.85} />
            </mesh>
            {[-length * 0.12, length * 0.12].map((sX, bIdx) => (
              <mesh key={`stanchion-${bIdx}`} position={[sX, 0.42, 0]}>
                <cylinderGeometry args={[0.045, 0.045, 0.85, 16]} />
                <meshStandardMaterial color={goldBrass} roughness={0.25} metalness={0.85} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* 9. Label Badge for Precision Identification */}
      {showLabels && (
        <Html position={[0, vimanaHeight + 2.2, 0]} center distanceFactor={35} zIndexRange={[100, 0]}>
          <div className="pointer-events-none select-none px-3.5 py-1.5 rounded-xl bg-stone-950/95 border border-amber-400 text-amber-200 font-bold text-xs tracking-wider shadow-2xl flex items-center gap-2 whitespace-nowrap">
            <span className="text-amber-400 font-serif font-black text-sm">🛕</span>
            <span>DARSHAN SANCTUM</span>
            <span className="text-[10px] text-amber-300 font-normal">| {deityName.toUpperCase()}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
