const _ = require('lodash');

const calculateMean = (numbers) => {
  if (!numbers || numbers.length === 0) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
};

const calculateMedian = (numbers) => {
  if (!numbers || numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

const calculateStandardDeviation = (numbers) => {
  if (!numbers || numbers.length < 2) return 0;
  const mean = calculateMean(numbers);
  const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
  return Math.sqrt(calculateMean(squaredDiffs));
};

const calculateWeightedAverage = (values, weights) => {
  if (!values || !weights || values.length !== weights.length) return 0;
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) return 0;
  return values.reduce((sum, val, i) => sum + val * weights[i], 0) / totalWeight;
};

const getStatistics = (numbers) => {
  if (!numbers || numbers.length === 0) {
    return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, range: 0, count: 0 };
  }

  const mean = calculateMean(numbers);
  const median = calculateMedian(numbers);
  const stdDev = calculateStandardDeviation(numbers);
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const range = max - min;

  return {
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    min,
    max,
    range,
    count: numbers.length
  };
};

const calculateFunnelMetrics = (data) => {
  const stages = [
    { name: '简历投递', count: data.totalResumes || 0 },
    { name: '简历筛选', count: data.screenedResumes || 0 },
    { name: '电话面试通过', count: data.phoneScreenPassed || 0 },
    { name: '面试安排', count: data.interviewScheduled || 0 },
    { name: '面试到场', count: data.interviewAttended || 0 },
    { name: '面试通过', count: data.interviewPassed || 0 },
    { name: 'Offer发放', count: data.offerSent || 0 },
    { name: 'Offer接受', count: data.offerAccepted || 0 },
    { name: '已录用', count: data.hired || 0 }
  ];

  const stagesWithRates = stages.map((stage, index) => {
    const prevCount = index > 0 ? stages[index - 1].count : stage.count;
    const conversionRate = prevCount > 0
      ? Math.round((stage.count / prevCount) * 10000) / 100
      : 0;

    return {
      ...stage,
      conversionRate: `${conversionRate}%`,
      conversionRateNum: conversionRate
    };
  });

  const firstStageCount = stages[0].count;
  const lastStageCount = stages[stages.length - 1].count;
  const hireRate = firstStageCount > 0
    ? Math.round((lastStageCount / firstStageCount) * 10000) / 100
    : 0;

  return {
    stages: stagesWithRates,
    hireRate,
    totalResumes: data.totalResumes || 0,
    totalHired: data.hired || 0,
    overallConversionRate: `${hireRate}%`
  };
};

module.exports = {
  calculateMean,
  calculateMedian,
  calculateStandardDeviation,
  calculateWeightedAverage,
  getStatistics,
  calculateFunnelMetrics
};
