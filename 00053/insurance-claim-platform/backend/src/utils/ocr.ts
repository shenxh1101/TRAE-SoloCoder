import Tesseract from 'tesseract.js';
import db from '../db';

export interface ExtractedAssessmentData {
  claim_no: string;
  vehicle_model: string;
  damage_location: string;
  estimated_cost: number;
  confidence: number;
  raw_text: string;
}

export interface HistoricalComparison {
  category: string;
  historical_avg: number;
  estimated_cost: number;
  deviation_percent: number;
  within_range: boolean;
}

export async function extractTextFromImage(imagePath: string): Promise<string> {
  try {
    const result = await Tesseract.recognize(
      imagePath,
      'chi_sim+eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );
    return result.data.text;
  } catch (error) {
    console.error('OCR extraction error:', error);
    throw new Error('Failed to extract text from image');
  }
}

export function parseAssessmentData(text: string): ExtractedAssessmentData {
  const data: ExtractedAssessmentData = {
    claim_no: '',
    vehicle_model: '',
    damage_location: '',
    estimated_cost: 0,
    confidence: 0,
    raw_text: text
  };

  let confidence = 0;

  const claimNoMatch = text.match(/(?:索赔号|理赔号|claim\s*no|claim_number|CL\d+|BN\d+)[：:\s]*([A-Za-z0-9-]+)/i);
  if (claimNoMatch) {
    data.claim_no = claimNoMatch[1].trim();
    confidence += 25;
  } else {
    const altClaimNoMatch = text.match(/\b(?:CL|BN|LP|CH)(?:NO|No|no)?[-_]?(\d{6,})\b/i);
    if (altClaimNoMatch) {
      data.claim_no = altClaimNoMatch[0];
      confidence += 15;
    }
  }

  const vehiclePatterns = [
    /(?:车型|车辆型号|vehicle\s*model|car\s*model)[：:\s]*([A-Za-z0-9\u4e00-\u9fa5\s-]+?)(?:\n|，|,|;|；)/i,
    /\b(?:大众|丰田|本田|宝马|奔驰|奥迪|别克|福特|日产|现代|比亚迪|吉利|哈弗|传祺|五菱|长安|奇瑞|雷克萨斯|保时捷|特斯拉|别克|雪佛兰)[A-Za-z0-9\s\u4e00-\u9fa5]*[\u4e00-\u9fa5A-Za-z0-9]*/,
    /\b(?:SUV|轿车|MPV|皮卡|面包车)\b/i
  ];

  for (const pattern of vehiclePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.vehicle_model = match[0].trim();
      confidence += 20;
      break;
    }
  }

  const damagePatterns = [
    /(?:受损部位|损伤部位|损坏位置|damage\s*location|damage\s*area)[：:\s]*([\u4e00-\u9fa5A-Za-z\s、,，]+?)(?:\n|。|；|;)/i,
    /(?:前杠|后杠|前保险杠|后保险杠|左前门|右前门|左后门|右后门|引擎盖|后备箱盖|车顶|左后视镜|右后视镜|左前大灯|右前大灯|左后尾灯|右后尾灯|前挡风|后挡风|左侧|右侧|前部|后部)/,
    /(?:bumper|door|hood|trunk|roof|mirror|headlight|taillight|windshield|fender)/i
  ];

  for (const pattern of damagePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.damage_location = match[1] ? match[1].trim() : match[0].trim();
      confidence += 20;
      break;
    }
  }

  const costPatterns = [
    /(?:预估费用|估计费用|定损金额|estimated\s*cost|repair\s*cost|amount)[：:\s]*[¥￥]?[\s]*([\d,]+\.?\d*)/i,
    /[¥￥][\s]*([\d,]+\.?\d*)/,
    /\bRMB[\s]*([\d,]+\.?\d*)/i,
    /\b([\d,]+\.?\d*)[\s]*(?:元|圆)\b/
  ];

  for (const pattern of costPatterns) {
    const match = text.match(pattern);
    if (match) {
      const costStr = match[1].replace(/,/g, '');
      data.estimated_cost = parseFloat(costStr) || 0;
      confidence += 25;
      break;
    }
  }

  data.confidence = Math.min(confidence, 100);

  return data;
}

export function compareWithHistorical(
  estimated_cost: number,
  category: string
): HistoricalComparison {
  const sql = `
    SELECT AVG(actual_cost) as avg_cost 
    FROM assessment_items 
    WHERE category = ?
  `;
  
  const result = db.prepare(sql).get(category) as { avg_cost: number } | undefined;
  
  const historical_avg = result?.avg_cost || estimated_cost;
  const deviation_percent = historical_avg > 0
    ? Math.round((estimated_cost - historical_avg) / historical_avg * 10000) / 100
    : 0;
  
  const within_range = Math.abs(deviation_percent) <= 20;

  return {
    category,
    historical_avg: Math.round(historical_avg * 100) / 100,
    estimated_cost,
    deviation_percent,
    within_range
  };
}

export async function processImageAssessment(imagePath: string): Promise<{
  extracted: ExtractedAssessmentData;
  comparison?: HistoricalComparison;
}> {
  const text = await extractTextFromImage(imagePath);
  const extracted = parseAssessmentData(text);

  let comparison: HistoricalComparison | undefined;
  if (extracted.estimated_cost > 0) {
    const category = extracted.damage_location || 'general';
    comparison = compareWithHistorical(extracted.estimated_cost, category);
  }

  return {
    extracted,
    comparison
  };
}

export default {
  extractTextFromImage,
  parseAssessmentData,
  compareWithHistorical,
  processImageAssessment
};
