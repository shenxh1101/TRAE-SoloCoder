export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

export function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function compareAnswers(
  studentAnswer: string,
  correctAnswer: string,
  questionType: string
): boolean {
  const normalize = (str: string) =>
    str
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[，,]/g, ',');

  if (questionType === 'MULTIPLE_CHOICE') {
    const studentArr = normalize(studentAnswer).split(',').sort();
    const correctArr = normalize(correctAnswer).split(',').sort();
    return studentArr.length === correctArr.length &&
      studentArr.every((val, idx) => val === correctArr[idx]);
  }

  return normalize(studentAnswer) === normalize(correctAnswer);
}

export function calculateDifficultyIndex(correctRate: number): number {
  return 1 - correctRate;
}

export function calculateDiscriminationIndex(
  highGroupCorrectRate: number,
  lowGroupCorrectRate: number
): number {
  return highGroupCorrectRate - lowGroupCorrectRate;
}
