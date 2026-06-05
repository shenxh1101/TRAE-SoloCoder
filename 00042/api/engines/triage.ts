interface TriageInput {
  chief_complaint: string
  temperature?: number | null
  heart_rate?: number | null
  respiratory_rate?: number | null
  systolic_bp?: number | null
  diastolic_bp?: number | null
  blood_oxygen?: number | null
  historical_red_count?: number
  historical_yellow_count?: number
}

interface TriageResult {
  level: 'red' | 'yellow' | 'green'
  reasons: string[]
  score: number
}

const RED_KEYWORDS = ['心脏骤停', '呼吸困难', '意识障碍', '大出血', '严重创伤', '休克', '昏迷', '抽搐', '急性心梗']
const YELLOW_KEYWORDS = ['胸痛', '骨折', '剧烈腹痛', '高热', '中度烧伤', '呕血', '咯血', '剧烈头痛']
const GREEN_KEYWORDS = ['感冒', '轻微外伤', '皮疹', '慢性病', '复诊', '咨询', '感冒发热', '头痛']

export function runTriage(input: TriageInput): TriageResult {
  const reasons: string[] = []
  let score = 0

  if (input.temperature != null) {
    if (input.temperature > 39.5 || input.temperature < 35) {
      reasons.push(`体温异常: ${input.temperature}°C`)
      score += 3
    } else if (input.temperature >= 38.5 && input.temperature <= 39.5) {
      reasons.push(`体温偏高: ${input.temperature}°C`)
      score += 2
    }
  }

  if (input.systolic_bp != null) {
    if (input.systolic_bp < 90 || input.systolic_bp > 180) {
      reasons.push(`收缩压异常: ${input.systolic_bp}mmHg`)
      score += 3
    } else if ((input.systolic_bp >= 90 && input.systolic_bp <= 100) || (input.systolic_bp >= 160 && input.systolic_bp <= 180)) {
      reasons.push(`收缩压偏离: ${input.systolic_bp}mmHg`)
      score += 2
    }
  }

  if (input.heart_rate != null) {
    if (input.heart_rate > 130 || input.heart_rate < 45) {
      reasons.push(`心率异常: ${input.heart_rate}次/分`)
      score += 3
    } else if ((input.heart_rate >= 110 && input.heart_rate <= 130)) {
      reasons.push(`心率偏快: ${input.heart_rate}次/分`)
      score += 2
    }
  }

  if (input.respiratory_rate != null) {
    if (input.respiratory_rate > 30 || input.respiratory_rate < 10) {
      reasons.push(`呼吸频率异常: ${input.respiratory_rate}次/分`)
      score += 3
    } else if (input.respiratory_rate >= 24 && input.respiratory_rate <= 30) {
      reasons.push(`呼吸频率偏快: ${input.respiratory_rate}次/分`)
      score += 2
    }
  }

  if (input.blood_oxygen != null) {
    if (input.blood_oxygen < 88) {
      reasons.push(`血氧饱和度严重偏低: ${input.blood_oxygen}%`)
      score += 3
    } else if (input.blood_oxygen >= 88 && input.blood_oxygen <= 92) {
      reasons.push(`血氧饱和度偏低: ${input.blood_oxygen}%`)
      score += 2
    }
  }

  const complaint = input.chief_complaint || ''

  for (const kw of RED_KEYWORDS) {
    if (complaint.includes(kw)) {
      reasons.push(`主诉含危重关键词: ${kw}`)
      score += 3
      break
    }
  }

  for (const kw of YELLOW_KEYWORDS) {
    if (complaint.includes(kw)) {
      reasons.push(`主诉含急症关键词: ${kw}`)
      score += 2
      break
    }
  }

  for (const kw of GREEN_KEYWORDS) {
    if (complaint.includes(kw)) {
      reasons.push(`主诉含一般关键词: ${kw}`)
      score += 1
      break
    }
  }

  if (input.historical_red_count && input.historical_red_count > 0) {
    reasons.push(`历史危重记录: ${input.historical_red_count}次`)
    score += input.historical_red_count
  }
  if (input.historical_yellow_count && input.historical_yellow_count > 1) {
    reasons.push(`历史急症记录: ${input.historical_yellow_count}次`)
    score += Math.floor(input.historical_yellow_count / 2)
  }

  let level: 'red' | 'yellow' | 'green'
  if (score >= 3) {
    level = 'red'
  } else if (score >= 2) {
    level = 'yellow'
  } else {
    level = 'green'
  }

  if (reasons.length === 0) {
    reasons.push('生命体征正常，主诉无危重关键词')
  }

  return { level, reasons, score }
}
