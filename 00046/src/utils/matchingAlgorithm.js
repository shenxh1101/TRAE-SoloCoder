const calculateSkillMatch = (requiredSkills, candidateSkills) => {
  if (!requiredSkills || requiredSkills.length === 0) return 100;
  if (!candidateSkills || candidateSkills.length === 0) return 0;

  const requiredSet = new Set(requiredSkills.map(s => s.toLowerCase()));
  const candidateSet = new Set(candidateSkills.map(s => s.toLowerCase()));

  let exactMatchCount = 0;
  let partialMatchCount = 0;

  for (const req of requiredSet) {
    if (candidateSet.has(req)) {
      exactMatchCount++;
    } else {
      for (const cand of candidateSet) {
        if (cand.includes(req) || req.includes(cand)) {
          partialMatchCount++;
          break;
        }
      }
    }
  }

  const exactScore = (exactMatchCount / requiredSet.size) * 70;
  const partialScore = (partialMatchCount / requiredSet.size) * 20;
  const baseScore = 10;

  return Math.round(exactScore + partialScore + baseScore);
};

const calculateExperienceMatch = (requiredYears, candidateYears) => {
  if (!requiredYears || !candidateYears) return 100;

  let minYears, maxYears;
  if (typeof requiredYears === 'object') {
    minYears = requiredYears.min || 0;
    maxYears = requiredYears.max || 99;
  } else {
    minYears = requiredYears;
    maxYears = 99;
  }

  if (candidateYears >= minYears && candidateYears <= maxYears) return 100;
  if (candidateYears >= minYears - 2) return 80;
  if (candidateYears >= minYears - 4) return 60;
  if (candidateYears >= minYears) return 90;
  return 40;
};

const calculateEducationMatch = (requiredDegree, candidateDegree) => {
  const degreeRank = {
    '高中': 1, '中专': 1, '专科': 2, '大专': 2, '本科': 3, '学士': 3, 'bachelor': 3,
    '硕士': 4, '研究生': 4, 'master': 4, '博士': 5, 'phd': 5
  };

  const reqRank = degreeRank[requiredDegree] || 3;
  const candRank = degreeRank[candidateDegree] || 3;

  if (candRank >= reqRank) return 100;
  if (candRank === reqRank - 1) return 70;
  return 40;
};

const calculateLocationMatch = (jobLocation, candidateLocation) => {
  if (!jobLocation || !candidateLocation) return 100;
  return jobLocation === candidateLocation ? 100 : 50;
};

const calculateTotalScore = (scores, weights = {}) => {
  const defaultWeights = {
    skills: 0.4,
    experience: 0.3,
    education: 0.15,
    location: 0.15
  };

  const finalWeights = { ...defaultWeights, ...weights };

  const skillScore = scores.skillMatch || 0;
  const expScore = scores.experienceMatch || 0;
  const eduScore = scores.educationMatch || 0;
  const locScore = scores.locationMatch || 0;

  const totalScore =
    skillScore * finalWeights.skills +
    expScore * finalWeights.experience +
    eduScore * finalWeights.education +
    locScore * finalWeights.location;

  return Math.round(totalScore * 100) / 100;
};

const matchCandidatesToJob = (job, candidates, threshold = 0) => {
  const results = candidates.map(candidate => {
    const skillScore = calculateSkillMatch(job.requiredSkills, candidate.skills);
    const expScore = calculateExperienceMatch(job.yearsOfExperience, candidate.yearsOfExperience);
    const eduScore = calculateEducationMatch(job.educationLevel, candidate.highestDegree);
    const locScore = calculateLocationMatch(job.location, candidate.location);

    const totalScore = calculateTotalScore({
      skillMatch: skillScore, experienceMatch: expScore, educationMatch: eduScore, locationMatch: locScore });

    return {
      candidateId: candidate,
      totalScore,
      breakdown: { skills: skillScore, experience: expScore, education: eduScore, location: locScore },
      matchLevel: totalScore >= 85 ? '优秀匹配' : totalScore >= 70 ? '良好匹配' : totalScore >= threshold ? '基本匹配' : '不匹配'
    };
  });

  return results
    .filter(r => r.totalScore >= threshold)
    .sort((a, b) => b.totalScore - a.totalScore);
};

module.exports = {
  calculateSkillMatch,
  calculateExperienceMatch,
  calculateEducationMatch,
  calculateLocationMatch,
  calculateTotalScore,
  matchCandidatesToJob
};
