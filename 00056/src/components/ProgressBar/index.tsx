import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';

interface ProgressBarProps {
  percent: number;
  height?: number;
  color?: string;
  bgColor?: string;
  showLabel?: boolean;
  labelPosition?: 'left' | 'right' | 'inside';
  size?: 'sm' | 'md' | 'lg';
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  height,
  color,
  bgColor,
  showLabel = false,
  labelPosition = 'right',
  size = 'md'
}) => {
  const safePercent = Math.max(0, Math.min(100, percent));

  const containerClass = classnames(
    styles.container,
    styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`]
  );

  return (
    <View className={containerClass}>
      {showLabel && labelPosition === 'left' && (
        <Text className={styles.label}>{safePercent}%</Text>
      )}
      <View
        className={styles.track}
        style={{
          height: height ? `${height}rpx` : undefined,
          backgroundColor: bgColor
        }}
      >
        <View
          className={styles.bar}
          style={{
            width: `${safePercent}%`,
            backgroundColor: color
          }}
        >
          {showLabel && labelPosition === 'inside' && safePercent >= 10 && (
            <Text className={styles.insideLabel}>{safePercent}%</Text>
          )}
        </View>
      </View>
      {showLabel && labelPosition === 'right' && (
        <Text className={styles.label}>{safePercent}%</Text>
      )}
    </View>
  );
};

export default ProgressBar;
