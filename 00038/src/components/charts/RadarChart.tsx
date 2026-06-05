import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { cn } from '@/lib/utils';

interface RadarIndicator {
  name: string;
  max: number;
  unit?: string;
}

interface RadarDataSeries {
  name: string;
  value: number[];
  color?: string;
}

interface RadarChartProps {
  indicators: RadarIndicator[];
  series: RadarDataSeries[];
  height?: number | string;
  width?: number | string;
  className?: string;
  showLegend?: boolean;
  radius?: number | string;
}

const DEFAULT_COLORS = [
  'rgba(99, 102, 241, 0.6)',
  'rgba(34, 211, 238, 0.6)',
  'rgba(168, 85, 247, 0.6)',
  'rgba(249, 115, 22, 0.6)',
  'rgba(16, 185, 129, 0.6)',
];

const DEFAULT_BORDER_COLORS = [
  '#6366F1',
  '#22D3EE',
  '#A855F7',
  '#F97316',
  '#10B981',
];

export const RadarChart: React.FC<RadarChartProps> = ({
  indicators,
  series,
  height = 400,
  width = '100%',
  className,
  showLegend = true,
  radius = '70%',
}) => {
  const option: EChartsOption = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 30, 54, 0.95)',
        borderColor: 'rgba(99, 102, 241, 0.3)',
        borderWidth: 1,
        textStyle: {
          color: '#F1F5F9',
          fontSize: 12,
        },
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number[]; seriesName: string; color: string };
          let result = `<div style="font-weight: 600; margin-bottom: 8px; color: ${p.color}">${p.seriesName}</div>`;
          indicators.forEach((indicator, index) => {
            const value = p.value[index];
            const unit = indicator.unit || '';
            const percentage = ((value / indicator.max) * 100).toFixed(1);
            result += `<div style="display: flex; justify-content: space-between; gap: 16px; margin: 4px 0;">
              <span style="color: #94A3B8;">${indicator.name}:</span>
              <span style="color: #F1F5F9; font-family: monospace;">${value.toFixed(2)}${unit} (${percentage}%)</span>
            </div>`;
          });
          return result;
        },
      },
      legend: showLegend
        ? {
            show: true,
            bottom: 10,
            textStyle: {
              color: '#94A3B8',
              fontSize: 12,
            },
            itemWidth: 16,
            itemHeight: 16,
            itemGap: 20,
          }
        : undefined,
      radar: {
        indicator: indicators.map((ind) => ({
          name: ind.name,
          max: ind.max,
        })),
        radius,
        center: ['50%', '45%'],
        splitNumber: 5,
        axisName: {
          color: '#94A3B8',
          fontSize: 12,
          fontWeight: 500,
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(99, 102, 241, 0.15)',
            width: 1,
          },
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(99, 102, 241, 0.02)', 'rgba(99, 102, 241, 0.05)'],
          },
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(99, 102, 241, 0.2)',
          },
        },
      },
      series: [
        {
          type: 'radar',
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 2,
          },
          areaStyle: {
            opacity: 0.3,
          },
          emphasis: {
            areaStyle: {
              opacity: 0.5,
            },
          },
          data: series.map((s, index) => ({
            name: s.name,
            value: s.value,
            itemStyle: {
              color: s.color || DEFAULT_BORDER_COLORS[index % DEFAULT_BORDER_COLORS.length],
            },
            lineStyle: {
              color: s.color || DEFAULT_BORDER_COLORS[index % DEFAULT_BORDER_COLORS.length],
            },
            areaStyle: {
              color: s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
            },
          })),
        },
      ],
    };
  }, [indicators, series, showLegend, radius]);

  return (
    <div className={cn('w-full', className)} style={{ width, height }}>
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};

export default RadarChart;
