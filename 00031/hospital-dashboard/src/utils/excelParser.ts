import * as XLSX from 'xlsx';
import type { Schedule, Department, Doctor } from '../types';

export interface ParsedScheduleRow {
  department?: string;
  doctorName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  shiftType?: string;
  expectedPatients?: number;
}

export interface ParseResult {
  success: boolean;
  data: Schedule[];
  errors: string[];
  warnings: string[];
}

let _departments: Department[] = [];
let _doctors: Doctor[] = [];

export const setLookupData = (departments: Department[], doctors: Doctor[]) => {
  _departments = departments;
  _doctors = doctors;
};

export const parseExcelSchedule = async (file: File): Promise<ParseResult> => {
  const result: ParseResult = {
    success: false,
    data: [],
    errors: [],
    warnings: [],
  };

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

    if (jsonData.length < 2) {
      result.errors.push('Excel文件内容为空或格式不正确');
      return result;
    }

    const headers = jsonData[0].map(h => 
      h?.toString().trim().toLowerCase() || ''
    );

    const columnMap = {
      department: findColumnIndex(headers, ['科室', '部门', 'department', 'dept']),
      doctorName: findColumnIndex(headers, ['医生', '医师', '姓名', 'doctor', 'name']),
      date: findColumnIndex(headers, ['日期', '排班日期', 'date']),
      startTime: findColumnIndex(headers, ['开始时间', '上班时间', 'start', 'starttime']),
      endTime: findColumnIndex(headers, ['结束时间', '下班时间', 'end', 'endtime']),
      shiftType: findColumnIndex(headers, ['班次', '时段', 'shift', 'type']),
      expectedPatients: findColumnIndex(headers, ['预计接诊', '接诊量', '号源数', 'expected', 'patients']),
    };

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.every(cell => !cell)) continue;

      const parsedRow: ParsedScheduleRow = {
        department: getCellValue(row, columnMap.department),
        doctorName: getCellValue(row, columnMap.doctorName),
        date: formatDateValue(getCellValue(row, columnMap.date)),
        startTime: formatTimeValue(getCellValue(row, columnMap.startTime)),
        endTime: formatTimeValue(getCellValue(row, columnMap.endTime)),
        shiftType: getCellValue(row, columnMap.shiftType),
        expectedPatients: parseNumber(getCellValue(row, columnMap.expectedPatients)),
      };

      const validation = validateRow(parsedRow, i + 1);
      if (validation.errors.length > 0) {
        result.errors.push(...validation.errors);
        continue;
      }
      if (validation.warnings.length > 0) {
        result.warnings.push(...validation.warnings);
      }

      const schedule = convertToSchedule(parsedRow, i);
      if (schedule) {
        result.data.push(schedule);
      }
    }

    result.success = result.data.length > 0;
  } catch (error) {
    result.errors.push(`解析Excel文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }

  return result;
};

const findColumnIndex = (headers: string[], keywords: string[]): number => {
  for (const keyword of keywords) {
    const index = headers.findIndex(h => h.includes(keyword.toLowerCase()));
    if (index !== -1) return index;
  }
  return -1;
};

const getCellValue = (row: string[], index: number): string => {
  if (index === -1 || !row[index]) return '';
  return row[index].toString().trim();
};

const formatDateValue = (value: string): string => {
  if (!value) return '';
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
    const [m, d, y] = value.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return value;
};

const formatTimeValue = (value: string): string => {
  if (!value) return '';
  
  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }
  
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(value)) {
    return value.slice(0, 5);
  }
  
  const numValue = parseFloat(value);
  if (!isNaN(numValue) && numValue >= 0 && numValue < 1) {
    const totalMinutes = Math.round(numValue * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  return value;
};

const parseNumber = (value: string): number | undefined => {
  if (!value) return undefined;
  const num = parseInt(value, 10);
  return isNaN(num) ? undefined : num;
};

const validateRow = (row: ParsedScheduleRow, rowNum: number): { errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!row.department) {
    errors.push(`第${rowNum}行：缺少科室信息`);
  } else {
    const deptExists = _departments.some(d => d.name === row.department || d.id === row.department);
    if (!deptExists) {
      warnings.push(`第${rowNum}行：科室"${row.department}"在系统中未找到`);
    }
  }

  if (!row.doctorName) {
    errors.push(`第${rowNum}行：缺少医生姓名`);
  } else {
    const doctorExists = _doctors.some(d => d.name === row.doctorName);
    if (!doctorExists) {
      warnings.push(`第${rowNum}行：医生"${row.doctorName}"在系统中未找到`);
    }
  }

  if (!row.date) {
    errors.push(`第${rowNum}行：缺少排班日期`);
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
    errors.push(`第${rowNum}行：日期格式不正确"${row.date}"`);
  }

  if (!row.startTime) {
    errors.push(`第${rowNum}行：缺少开始时间`);
  } else if (!/^\d{2}:\d{2}$/.test(row.startTime)) {
    errors.push(`第${rowNum}行：开始时间格式不正确"${row.startTime}"`);
  }

  if (!row.endTime) {
    errors.push(`第${rowNum}行：缺少结束时间`);
  } else if (!/^\d{2}:\d{2}$/.test(row.endTime)) {
    errors.push(`第${rowNum}行：结束时间格式不正确"${row.endTime}"`);
  }

  return { errors, warnings };
};

const convertToSchedule = (row: ParsedScheduleRow, index: number): Schedule | null => {
  const department = _departments.find(d => d.name === row.department || d.id === row.department);
  const doctor = _doctors.find(d => d.name === row.doctorName);

  if (!department || !doctor) return null;

  let shiftType: 'morning' | 'afternoon' | 'evening' = 'morning';
  if (row.shiftType) {
    const type = row.shiftType.toLowerCase();
    if (type.includes('下') || type.includes('afternoon')) shiftType = 'afternoon';
    else if (type.includes('晚') || type.includes('夜') || type.includes('evening')) shiftType = 'evening';
  } else {
    const startHour = parseInt(row.startTime?.split(':')[0] || '0', 10);
    if (startHour >= 18) shiftType = 'evening';
    else if (startHour >= 14) shiftType = 'afternoon';
  }

  const baseExpected = shiftType === 'morning' ? 25 : shiftType === 'afternoon' ? 20 : 15;

  return {
    id: `sch-import-${Date.now()}-${index}`,
    doctorId: doctor.id,
    doctorName: doctor.name,
    departmentId: department.id,
    departmentName: department.name,
    date: row.date!,
    startTime: row.startTime!,
    endTime: row.endTime!,
    shiftType,
    expectedPatients: row.expectedPatients || baseExpected,
  };
};

export const generateScheduleTemplate = (): string[][] => {
  return [
    ['科室', '医生', '日期', '开始时间', '结束时间', '班次', '预计接诊量'],
    ['内科', '张明华', '2026-06-03', '08:00', '12:00', '上午', '25'],
    ['外科', '李建国', '2026-06-03', '14:00', '17:30', '下午', '20'],
  ];
};

export const downloadTemplate = () => {
  const data = generateScheduleTemplate();
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '排班表');
  XLSX.writeFile(workbook, '医生排班表模板.xlsx');
};
