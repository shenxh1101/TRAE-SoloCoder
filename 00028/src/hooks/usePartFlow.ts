import { useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSceneStore } from '@/store/useSceneStore';
import { PartState, PartType } from '@/types/part';
import { getEndEffectorPosition, lerp } from '@/utils/kinematics';

const BELT_START: [number, number, number] = [-8, 0.5, 2];
const BELT_END: [number, number, number] = [6, 0.5, 2];
const BELT_SPEED = 0.3;
const SPAWN_INTERVAL = 2;

export const usePartFlow = () => {
  const selectedPartType = useSceneStore((state) => state.selectedPartType);
  const isPlaying = useSceneStore((state) => state.recording.isPlaying);
  const lastSpawnTime = useRef(0);

  useFrame((state) => {
    if (isPlaying) return;

    const elapsed = state.clock.elapsedTime;
    const store = useSceneStore.getState();
    const { parts, arms, assemblySlots } = store;

    if (elapsed - lastSpawnTime.current > SPAWN_INTERVAL && parts.filter((p) => p.isOnBelt).length < 3) {
      const newPart: PartState = {
        id: '',
        type: selectedPartType,
        position: [...BELT_START] as [number, number, number],
        rotation: [0, 0, 0],
        isOnBelt: true,
        isBeingCarried: false,
        carrierArmId: null,
        isAssembled: false,
        beltProgress: 0,
      };
      store.addPart(newPart);
      lastSpawnTime.current = elapsed;
    }

    const partsToRemove: string[] = [];
    const partsToUpdate: { id: string; updates: Partial<PartState> }[] = [];

    for (const part of parts) {
      if (part.isAssembled) continue;

      if (part.isBeingCarried && part.carrierArmId) {
        const arm = arms.find((a) => a.id === part.carrierArmId);
        if (!arm) continue;

        const pickupPos = getEndEffectorPosition(arm.joints, arm.position);
        const emptySlot = assemblySlots.find((slot) => !slot.occupied);

        const cycleProgress = (arm.phase / (Math.PI * 2) + 0.5) % 1;

        if (cycleProgress > 0.6 && emptySlot) {
          const t = (cycleProgress - 0.6) * 2.5;
          partsToUpdate.push({
            id: part.id,
            updates: {
              position: [
                lerp(pickupPos.x, emptySlot.position[0], t),
                lerp(pickupPos.y, emptySlot.position[1], t),
                lerp(pickupPos.z, emptySlot.position[2], t),
              ],
            },
          });

          if (cycleProgress > 0.85) {
            partsToUpdate.push({
              id: part.id,
              updates: {
                isBeingCarried: false,
                carrierArmId: null,
                isAssembled: true,
                isOnBelt: false,
                position: emptySlot.position,
              },
            });
            store.setAssemblySlotOccupied(emptySlot.id, part.id);
          }
        } else {
          partsToUpdate.push({
            id: part.id,
            updates: {
              position: [pickupPos.x, pickupPos.y, pickupPos.z],
              rotation: [part.rotation[0], part.rotation[1] + 0.02, part.rotation[2]],
            },
          });
        }
        continue;
      }

      if (part.isOnBelt) {
        const newProgress = part.beltProgress + BELT_SPEED * 0.016;

        if (newProgress >= 1) {
          partsToRemove.push(part.id);
          continue;
        }

        const newX = lerp(BELT_START[0], BELT_END[0], newProgress);
        const newZ = BELT_START[2] + Math.sin(newProgress * Math.PI * 4) * 0.05;

        const updates: Partial<PartState> = {
          position: [newX, part.position[1], newZ],
          rotation: [part.rotation[0], part.rotation[1] + 0.03, part.rotation[2]],
          beltProgress: newProgress,
        };

        if (newProgress > 0.3) {
          let nearestArm = null;
          let minDistance = Infinity;

          for (const arm of arms) {
            const armEndPos = getEndEffectorPosition(arm.joints, arm.position);
            const dx = armEndPos.x - part.position[0];
            const dy = armEndPos.y - part.position[1];
            const dz = armEndPos.z - part.position[2];
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (distance < 1.5 && distance < minDistance) {
              const isCarrying = parts.some((p) => p.carrierArmId === arm.id);
              if (!isCarrying) {
                minDistance = distance;
                nearestArm = arm;
              }
            }
          }

          if (nearestArm) {
            updates.isOnBelt = false;
            updates.isBeingCarried = true;
            updates.carrierArmId = nearestArm.id;
          }
        }

        partsToUpdate.push({ id: part.id, updates });
      }
    }

    for (const { id, updates } of partsToUpdate) {
      store.updatePart(id, updates);
    }
    for (const id of partsToRemove) {
      store.removePart(id);
    }
  });

  const parts = useSceneStore((state) => state.parts);
  const setPartType = useCallback((type: PartType) => {
    useSceneStore.getState().setSelectedPartType(type);
  }, []);

  return {
    parts,
    selectedPartType,
    setPartType,
  };
};
