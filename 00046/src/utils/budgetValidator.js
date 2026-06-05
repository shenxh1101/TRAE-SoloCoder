const _ = require('lodash');

const marketSalaryData = {
  '工程师-初级': { min: 15000, max: 25000, median: 20000 },
  '工程师-中级': { min: 25000, max: 40000, median: 32000 },
  '工程师-高级': { min: 40000, max: 60000, median: 50000 },
  '工程师-专家': { min: 60000, max: 100000, median: 80000 },
  '产品经理-初级': { min: 18000, max: 28000, median: 23000 },
  '产品经理-中级': { min: 28000, max: 45000, median: 36000 },
  '产品经理-高级': { min: 45000, max: 70000, median: 55000 },
  '设计师-初级': { min: 15000, max: 25000, median: 20000 },
  '设计师-中级': { min: 25000, max: 40000, median: 32000 },
  '设计师-高级': { min: 40000, max: 60000, median: 50000 },
  '运营-初级': { min: 12000, max: 20000, median: 16000 },
  '运营-中级': { min: 20000, max: 35000, median: 27000 },
  '运营-高级': { min: 35000, max: 55000, median: 45000 },
};

const validateBudget = (job) => {
  const { title, level, salaryMin, salaryMax, budget, salaryRange } = job;

  let minSalary = salaryMin || (salaryRange ? salaryRange.min : 0);
  let maxSalary = salaryMax || (salaryRange ? salaryRange.max : 0);

  const key = `${title}-${level}`;
  const marketData = marketSalaryData[key] || null;

  const issues = [];
  const warnings = [];

  if (minSalary && maxSalary && minSalary > maxSalary) {
    issues.push('最低薪资不能高于最高薪资');
  }

  const totalAnnualBudget = budget;
  const annualSalaryMin = minSalary ? minSalary * 14 : 0;
  const annualSalaryMax = maxSalary ? maxSalary * 14 : 0;

  if (totalAnnualBudget && annualSalaryMax && totalAnnualBudget < annualSalaryMax) {
    issues.push(`职位预算(${totalAnnualBudget.toLocaleString()})低于最高年薪(${annualSalaryMax.toLocaleString()})，请调整预算或薪资范围`);
  }

  if (totalAnnualBudget && annualSalaryMin && totalAnnualBudget < annualSalaryMin) {
    issues.push(`职位预算(${totalAnnualBudget.toLocaleString()})低于最低年薪(${annualSalaryMin.toLocaleString()})，预算严重不足`);
  }

  if (marketData) {
    if (minSalary && minSalary < marketData.min * 0.8) {
      warnings.push(`最低薪资(${minSalary.toLocaleString()})低于市场水平的80%，可能难以吸引候选人。市场参考：${marketData.min.toLocaleString()}-${marketData.max.toLocaleString()}`);
    }
    if (maxSalary && maxSalary > marketData.max * 1.3) {
      warnings.push(`最高薪资(${maxSalary.toLocaleString()})高于市场水平的130%，请确认是否合理。市场参考：${marketData.min.toLocaleString()}-${marketData.max.toLocaleString()}`);
    }
  }

  const bufferRatio = totalAnnualBudget && annualSalaryMax
    ? ((totalAnnualBudget - annualSalaryMax) / annualSalaryMax * 100).toFixed(1)
    : null;

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    marketData,
    salaryHealth: {
      annualSalaryMin,
      annualSalaryMax,
      totalAnnualBudget,
      budgetBuffer: bufferRatio ? `${bufferRatio}%` : null,
      marketMedian: marketData ? marketData.median : null
    }
  };
};

const calculateCompensationPackage = (level, baseSalary, performanceRating = 1.0) => {
  const levelFactors = {
    'P5': { stockMultiplier: 0.0, bonusMultiplier: 0.15 },
    'P6': { stockMultiplier: 0.3, bonusMultiplier: 0.20 },
    'P7': { stockMultiplier: 0.6, bonusMultiplier: 0.25 },
    'P8': { stockMultiplier: 1.0, bonusMultiplier: 0.30 },
    'P9': { stockMultiplier: 1.5, bonusMultiplier: 0.40 },
    'P10': { stockMultiplier: 2.0, bonusMultiplier: 0.50 },
  };

  const factors = levelFactors[level] || levelFactors['P6'];

  const annualBase = baseSalary * 14;
  const annualBonus = annualBase * factors.bonusMultiplier * performanceRating;
  const annualStock = annualBase * factors.stockMultiplier;
  const totalCompensation = annualBase + annualBonus + annualStock;

  return {
    baseSalary,
    annualBase,
    annualBonus,
    annualStock,
    totalCompensation,
    breakdown: {
      base: annualBase,
      bonus: annualBonus,
      stock: annualStock
    },
    ratio: {
      base: (annualBase / totalCompensation * 100).toFixed(1),
      bonus: (annualBonus / totalCompensation * 100).toFixed(1),
      stock: (annualStock / totalCompensation * 100).toFixed(1)
    }
  };
};

module.exports = {
  validateBudget,
  calculateCompensationPackage,
  marketSalaryData
};
