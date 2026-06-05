import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface GasChartProps {
  data: { date: string; value: number }[];
  name: string;
}

export const GasChart: React.FC<GasChartProps> = ({ data, name }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current);
      
      const option: echarts.EChartsOption = {
        backgroundColor: 'transparent',
        title: {
          text: `${name} - 近7天瓦斯浓度趋势`,
          textStyle: { color: '#00D4FF', fontSize: 14 },
          left: 'center',
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(26, 39, 64, 0.9)',
          borderColor: '#00D4FF',
          textStyle: { color: '#fff' },
          formatter: (params: any) => {
            const data = params[0];
            return `<div>${data.name}</div><div>瓦斯浓度: <span style="color: ${data.value >= 0.8 ? '#FF3B3B' : '#00FF88'}">${data.value.toFixed(2)}%</span></div>`;
          },
        },
        grid: {
          left: '10%',
          right: '10%',
          top: '20%',
          bottom: '15%',
        },
        xAxis: {
          type: 'category',
          data: data.map(d => d.date),
          axisLine: { lineStyle: { color: '#2A3A5A' } },
          axisLabel: { color: '#888', fontSize: 10 },
        },
        yAxis: {
          type: 'value',
          max: 1.2,
          axisLine: { lineStyle: { color: '#2A3A5A' } },
          axisLabel: { 
            color: '#888', 
            fontSize: 10,
            formatter: '{value}%',
          },
          splitLine: { lineStyle: { color: '#1A2740' } },
        },
        series: [
          {
            name: '瓦斯浓度',
            type: 'line',
            data: data.map(d => d.value),
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: {
              color: '#00D4FF',
              width: 2,
            },
            itemStyle: {
              color: (params: any) => params.value >= 0.8 ? '#FF3B3B' : '#00D4FF',
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(0, 212, 255, 0.3)' },
                { offset: 1, color: 'rgba(0, 212, 255, 0)' },
              ]),
            },
            markLine: {
              silent: true,
              lineStyle: { color: '#FF3B3B', type: 'dashed' },
              data: [{ yAxis: 0.8, name: '预警阈值' }],
              label: {
                formatter: '预警阈值 0.8%',
                color: '#FF3B3B',
                fontSize: 10,
              },
            },
          },
        ],
      };

      chartInstance.current.setOption(option);
    }

    return () => {
      chartInstance.current?.dispose();
    };
  }, [data, name]);

  return <div ref={chartRef} className="w-full h-64" />;
};
