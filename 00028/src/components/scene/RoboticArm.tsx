import { forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useArmAnimation } from '@/hooks/useArmAnimation';
import { getEndEffectorPosition } from '@/utils/kinematics';

interface RoboticArmProps {
  armId: string;
}

export interface RoboticArmRef {
  getEndEffectorPosition: () => THREE.Vector3 | null;
}

const RoboticArm = forwardRef<RoboticArmRef, RoboticArmProps>(({ armId }, ref) => {
  const { arm } = useArmAnimation(armId);

  useImperativeHandle(ref, () => ({
    getEndEffectorPosition: () => {
      if (!arm) return null;
      return getEndEffectorPosition(arm.joints, arm.position);
    },
  }));

  if (!arm) return null;

  const isColliding = arm.isColliding;
  const collidingJoints = arm.collidingJoints;

  const isJointColliding = (index: number) => isColliding && collidingJoints.includes(index);

  return (
    <group position={arm.position}>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.8, 0.3, 16]} />
        <meshStandardMaterial
          color={isColliding ? '#ff3366' : '#1a2332'}
          metalness={0.8}
          roughness={0.3}
          emissive={isColliding ? '#ff3366' : '#000000'}
          emissiveIntensity={isColliding ? 0.3 : 0}
        />
      </mesh>

      <group rotation={[0, arm.joints[0].angle, 0]}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.25, 0.8, 12]} />
          <meshStandardMaterial
            color={isJointColliding(0) ? '#ff3366' : '#2a3444'}
            metalness={0.7}
            roughness={0.3}
            emissive={isJointColliding(0) ? '#ff3366' : '#000000'}
            emissiveIntensity={isJointColliding(0) ? 0.5 : 0}
          />
        </mesh>

        <group position={[0, 0.8, 0]} rotation={[0, 0, arm.joints[1].angle]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <capsuleGeometry args={[0.18, 0.8, 8, 16]} />
            <meshStandardMaterial
              color={isJointColliding(1) ? '#ff3366' : '#3d4f66'}
              metalness={0.6}
              roughness={0.35}
              emissive={isJointColliding(1) ? '#ff3366' : '#000000'}
              emissiveIntensity={isJointColliding(1) ? 0.5 : 0}
            />
          </mesh>

          <group position={[0, 1, 0]} rotation={[0, 0, arm.joints[2].angle]}>
            <mesh position={[0, 0.45, 0]} castShadow>
              <capsuleGeometry args={[0.15, 0.7, 8, 16]} />
              <meshStandardMaterial
                color={isJointColliding(2) ? '#ff3366' : '#3d4f66'}
                metalness={0.6}
                roughness={0.35}
                emissive={isJointColliding(2) ? '#ff3366' : '#000000'}
                emissiveIntensity={isJointColliding(2) ? 0.5 : 0}
              />
            </mesh>

            <group position={[0, 0.85, 0]} rotation={[0, arm.joints[3].angle, 0]}>
              <mesh position={[0, 0.3, 0]} castShadow>
                <cylinderGeometry args={[0.12, 0.12, 0.5, 12]} />
                <meshStandardMaterial
                  color={isJointColliding(3) ? '#ff3366' : '#4a5d78'}
                  metalness={0.7}
                  roughness={0.3}
                  emissive={isJointColliding(3) ? '#ff3366' : '#000000'}
                  emissiveIntensity={isJointColliding(3) ? 0.5 : 0}
                />
              </mesh>

              <group position={[0, 0.55, 0]} rotation={[arm.joints[4].angle, 0, 0]}>
                <mesh position={[0, 0.2, 0]} castShadow>
                  <cylinderGeometry args={[0.08, 0.08, 0.3, 8]} />
                  <meshStandardMaterial
                    color={isJointColliding(4) ? '#ff3366' : '#00d4ff'}
                    metalness={0.9}
                    roughness={0.2}
                    emissive={isJointColliding(4) ? '#ff3366' : '#00d4ff'}
                    emissiveIntensity={isJointColliding(4) ? 0.5 : 0.3}
                  />
                </mesh>

                <group position={[0, 0.4, 0]}>
                  <mesh position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
                    <boxGeometry args={[0.05, 0.25, 0.03]} />
                    <meshStandardMaterial
                      color="#1a2332"
                      metalness={0.8}
                      roughness={0.2}
                    />
                  </mesh>
                  <mesh position={[0.1, 0, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
                    <boxGeometry args={[0.05, 0.25, 0.03]} />
                    <meshStandardMaterial
                      color="#1a2332"
                      metalness={0.8}
                      roughness={0.2}
                    />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});

RoboticArm.displayName = 'RoboticArm';

export default RoboticArm;
