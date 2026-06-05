import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { TrafficFlow } from '../../types';

interface FlowChartProps {
  data: TrafficFlow;
  chartType?: 'bar' | 'line';
  title?: string;
  height?: number | string;
  showLegend?: boolean;
  animated?: boolean;
}

const directionNames: Record<keyof TrafficFlow, string> = {
  north: '北进口',
  south: '南进口',
  east: '东进口',
  west: '西进口',
};

const directionColors: Record<keyof TrafficFlow, string> = {
  north: '#22d3ee',
  south: '#a78bfa',
  east: '#4ade80',
  west: '#facc15',
};

export const FlowChart: React.FC<FlowChartProps> = ({
  data,
  chartType = 'bar',
  title,
  height = 300,
  showLegend = true,
  animated = true,
}) => {
  const option: EChartsOption = useMemo(() => {
    const categories = Object.keys(directionNames) as (keyof TrafficFlow)[];
    const values = categories.map(key => data[key]);

    const series: EChartsOption['series'] =
      chartType === 'bar'
        ? [
            {
              name: '流量',
              type: 'bar',
              data: categories.map((key, index) => ({
                value: values[index],
                itemStyle: {
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: directionColors[key] },
                      { offset: 1, color: `${directionColors[key]}40` },
                    ],
                  },
                  borderRadius: [4, 4, 0, 0],
                  shadowBlur: 10,
                  shadowColor: `${directionColors[key]}80`,
                },
              })),
              barWidth: '40%',
              animation: animated,
              animationDuration: 1000,
              animationEasing: 'elasticOut',
            },
          ]
        : [
            {
              name: '流量',
              type: 'line',
              data: values,
              smooth: true,
              symbol: 'circle',
              symbolSize: 10,
              lineStyle: {
                width: 3,
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 1,
                  y2: 0,
                  colorStops: [
                    { offset: 0, color: '#22d3ee' },
                    { offset: 0.5, color: '#a78bfa' },
                    { offset: 1, color: '#4ade80' },
                  ],
                },
                shadowBlur: 10,
                shadowColor: '#22d3ee80',
              },
              itemStyle: {
                color: '#22d3ee',
                borderColor: '#fff',
                borderWidth: 2,
              },
              areaStyle: {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: 'rgba(34, 211, 238, 0.3)' },
                    { offset: 1, color: 'rgba(34, 211, 238, 0)' },
                  ],
                },
              },
              animation: animated,
              animationDuration: 1500,
              animationEasing: 'cubicInOut',
            },
          ];

    return {
      backgroundColor: 'transparent',
      title: title
        ? {
            text: title,
            textStyle: {
              color: '#22d3ee',
              fontSize: 16,
              fontFamily: 'monospace',
              textShadowBlur: 10,
              textShadowColor: '#22d3ee80',
            },
            left: 'center',
            top: 10,
          }
        : undefined,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        borderColor: '#22d3ee',
        borderWidth: 1,
        textStyle: {
          color: '#fff',
          fontFamily: 'monospace',
        },
        axisPointer: {
          type: chartType === 'bar' ? 'shadow' : 'line',
          lineStyle: {
            color: '#22d3ee',
            type: 'dashed',
          },
          shadowStyle: {
            color: 'rgba(34, 211, 238, 0.1)',
          },
        },
      },
      legend: showLegend
        ? {
            show: true,
            data: ['流量'],
            textStyle: {
              color: '#9ca3af',
              fontFamily: 'monospace',
            },
            top: 10,
            right: 20,
          }
        : undefined,
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: title || showLegend ? 60 : 20,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories.map(key => directionNames[key]),
        axisLine: {
          lineStyle: {
            color: '#374151',
          },
        },
        axisLabel: {
          color: '#9ca3af',
          fontFamily: 'monospace',
          fontSize: 12,
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        name: '车辆数',
        nameTextStyle: {
          color: '#6b7280',
          fontFamily: 'monospace',
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          color: '#9ca3af',
          fontFamily: 'monospace',
        },
        splitLine: {
          lineStyle: {
            color: '#1f2937',
            type: 'dashed',
          },
        },
      },
      series,
    };
  }, [data, chartType, title, showLegend, animated]);

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{
        renderer: 'canvas',
      }}
    />
  );
};
