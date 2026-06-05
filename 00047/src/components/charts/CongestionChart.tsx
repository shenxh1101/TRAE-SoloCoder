import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { CongestionPrediction } from '../../types';
import { getCongestionColor, formatTime } from '../../utils/trafficUtils';

interface CongestionChartProps {
  data: CongestionPrediction[];
  chartType?: 'line' | 'heatmap';
  title?: string;
  height?: number | string;
  selectedRoadId?: string;
}

export const CongestionChart: React.FC<CongestionChartProps> = ({
  data,
  chartType = 'line',
  title,
  height = 300,
  selectedRoadId,
}) => {
  const displayData = useMemo(() => {
    if (selectedRoadId) {
      return data.filter(d => d.roadId === selectedRoadId);
    }
    return data.slice(0, 6);
  }, [data, selectedRoadId]);

  const option: EChartsOption = useMemo(() => {
    if (chartType === 'heatmap') {
      const roadNames = displayData.map(d => d.roadName);
      const timeLabels = displayData[0]?.predictions.map(p => formatTime(p.timestamp)) || [];

      const heatmapData = displayData.flatMap((road, roadIndex) =>
        road.predictions.map((pred, timeIndex) => [
          timeIndex,
          roadIndex,
          Math.round(pred.congestionIndex * 100),
        ])
      );

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
          position: 'top',
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          borderColor: '#22d3ee',
          borderWidth: 1,
          textStyle: {
            color: '#fff',
            fontFamily: 'monospace',
          },
          formatter: (params: unknown) => {
            const p = params as { data: number[]; name: string };
            const roadIndex = p.data[1];
            const timeIndex = p.data[0];
            const value = p.data[2];
            const road = displayData[roadIndex];
            const pred = road?.predictions[timeIndex];
            const level =
              value < 30
                ? '畅通'
                : value < 50
                ? '轻度拥堵'
                : value < 70
                ? '中度拥堵'
                : '严重拥堵';
            return `
              <div style="font-family: monospace;">
                <div style="color: #22d3ee; margin-bottom: 4px;">${road?.roadName || ''}</div>
                <div style="color: #9ca3af;">${pred ? formatTime(pred.timestamp) : ''}</div>
                <div style="color: ${getCongestionColor(value / 100)}; font-weight: bold;">
                  拥堵指数: ${value}% (${level})
                </div>
              </div>
            `;
          },
        },
        grid: {
          left: '3%',
          right: '10%',
          bottom: '15%',
          top: title ? 60 : 20,
        },
        xAxis: {
          type: 'category',
          data: timeLabels,
          splitArea: {
            show: true,
          },
          axisLine: {
            lineStyle: {
              color: '#374151',
            },
          },
          axisLabel: {
            color: '#9ca3af',
            fontFamily: 'monospace',
            fontSize: 10,
            rotate: 45,
          },
        },
        yAxis: {
          type: 'category',
          data: roadNames,
          splitArea: {
            show: true,
          },
          axisLine: {
            lineStyle: {
              color: '#374151',
            },
          },
          axisLabel: {
            color: '#9ca3af',
            fontFamily: 'monospace',
            fontSize: 11,
          },
        },
        visualMap: {
          min: 0,
          max: 100,
          calculable: true,
          orient: 'vertical',
          right: '1%',
          top: 'center',
          text: ['高', '低'],
          textStyle: {
            color: '#9ca3af',
            fontFamily: 'monospace',
          },
          inRange: {
            color: ['#2E933C', '#F77F00', '#FF6B00', '#D62828'],
          },
        },
        series: [
          {
            name: '拥堵指数',
            type: 'heatmap',
            data: heatmapData,
            label: {
              show: false,
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
            animation: true,
            animationDuration: 1000,
            animationEasing: 'cubicOut',
          },
        ],
      };
    }

    const colors = ['#22d3ee', '#a78bfa', '#4ade80', '#facc15', '#f472b6', '#fb923c'];

    const series: EChartsOption['series'] = displayData.map((road, index) => ({
      name: road.roadName,
      type: 'line',
      data: road.predictions.map(p => Math.round(p.congestionIndex * 100)),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        width: 2,
        color: colors[index % colors.length],
        shadowBlur: 8,
        shadowColor: `${colors[index % colors.length]}60`,
      },
      itemStyle: {
        color: colors[index % colors.length],
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: `${colors[index % colors.length]}30` },
            { offset: 1, color: `${colors[index % colors.length]}00` },
          ],
        },
      },
      animation: true,
      animationDuration: 1500,
      animationDelay: index * 200,
      animationEasing: 'cubicOut',
    }));

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
          type: 'line',
          lineStyle: {
            color: '#22d3ee',
            type: 'dashed',
          },
        },
        formatter: (params: unknown) => {
          const p = params as Array<{ seriesName: string; value: number; dataIndex: number }>;
          if (!p || p.length === 0) return '';
          const pred = displayData[0]?.predictions[p[0].dataIndex];
          let html = `<div style="font-family: monospace; margin-bottom: 8px;">${
            pred ? formatTime(pred.timestamp) : ''
          }</div>`;
          p.forEach(item => {
            const color = getCongestionColor(item.value / 100);
            html += `
              <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
                <span style="color: #9ca3af;">${item.seriesName}:</span>
                <span style="color: ${color}; font-weight: bold;">${item.value}%</span>
              </div>
            `;
          });
          return html;
        },
      },
      legend: {
        data: displayData.map(d => d.roadName),
        textStyle: {
          color: '#9ca3af',
          fontFamily: 'monospace',
          fontSize: 11,
        },
        top: title ? 40 : 10,
        left: 'center',
        itemWidth: 20,
        itemHeight: 2,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: title ? 100 : 60,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: displayData[0]?.predictions.map(p => formatTime(p.timestamp)) || [],
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: '#374151',
          },
        },
        axisLabel: {
          color: '#9ca3af',
          fontFamily: 'monospace',
          fontSize: 11,
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        name: '拥堵指数 (%)',
        max: 100,
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
          formatter: '{value}%',
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
  }, [chartType, displayData, title]);

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
