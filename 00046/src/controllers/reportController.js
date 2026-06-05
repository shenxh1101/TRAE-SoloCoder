const moment = require('moment');
const ExcelJS = require('exceljs');
const RecruitmentReport = require('../models/RecruitmentReport');
const Job = require('../models/Job');
const JobCandidate = require('../models/JobCandidate');
const Interview = require('../models/Interview');
const Offer = require('../models/Offer');
const { calculateFunnelMetrics } = require('../utils/statistics');
const { sendEmail } = require('../utils/emailService');

const generateRecruitmentFunnelReport = async (filters = {}) => {
  const { startDate, endDate, department, jobId, source, channel } = filters;

  const dateQuery = {};
  if (startDate) dateQuery.$gte = new Date(startDate);
  if (endDate) dateQuery.$lte = new Date(endDate);

  const jobQuery = {};
  if (department) jobQuery.department = department;
  if (jobId) jobQuery._id = jobId;

  const jobs = await Job.find(jobQuery);
  const jobIds = jobs.map(j => j._id);

  const candidateQuery = { jobId: { $in: jobIds } };
  if (Object.keys(dateQuery).length > 0) {
    candidateQuery.createdAt = dateQuery;
  }
  if (source) candidateQuery.source = source;
  if (channel) candidateQuery.channel = channel;

  const totalResumes = await JobCandidate.countDocuments(candidateQuery);
  const screenedResumes = await JobCandidate.countDocuments({ ...candidateQuery, isShortlisted: true });
  const phoneScreenPassed = await JobCandidate.countDocuments({
    ...candidateQuery, status: { $in: ['phone_screen_passed', 'interview_scheduled', 'interview_in_progress', 'interview_completed', 'interview_passed', 'offer_preparing', 'offer_sent', 'offer_accepted', 'hired'] }
  });
  const interviewScheduled = await JobCandidate.countDocuments({
    ...candidateQuery, status: { $in: ['interview_scheduled', 'interview_in_progress', 'interview_completed', 'interview_passed', 'offer_preparing', 'offer_sent', 'offer_accepted', 'hired'] }
  });
  const interviewAttended = await Interview.countDocuments({
    jobId: { $in: jobIds },
    status: { $in: ['completed', 'no_show', 'passed', 'failed'] }
  });
  const interviewPassed = await JobCandidate.countDocuments({
    ...candidateQuery, status: { $in: ['interview_passed', 'offer_preparing', 'offer_sent', 'offer_accepted', 'hired'] }
  });
  const offerSent = await Offer.countDocuments({
    jobId: { $in: jobIds },
    status: { $nin: ['draft', 'cancelled', 'withdrawn'] }
  });
  const offerAccepted = await Offer.countDocuments({
    jobId: { $in: jobIds },
    status: 'accepted'
  });
  const hired = await JobCandidate.countDocuments({
    ...candidateQuery, status: 'hired'
  });

  const funnelData = {
    totalResumes,
    screenedResumes,
    phoneScreenPassed,
    interviewScheduled,
    interviewAttended,
    interviewPassed,
    offerSent,
    offerAccepted,
    hired
  };

  const funnelMetrics = calculateFunnelMetrics(funnelData);

  return {
    funnelData,
    funnelMetrics,
    reportPeriod: {
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    },
    generatedAt: new Date(),
    filters: { department, jobId, source, channel }
  };
};

exports.generateFunnelReport = async (req, res, next) => {
  try {
    const { startDate, endDate, department, jobId, source, channel, saveReport = false } = req.body;

    const reportData = await generateRecruitmentFunnelReport({
      startDate, endDate, department, jobId, source, channel
    });

    let savedReport = null;
    if (saveReport === true) {
      savedReport = await RecruitmentReport.create({
        reportType: 'funnel',
        reportPeriod: reportData.reportPeriod,
        filters: reportData.filters,
        funnelData: reportData.funnelData,
        metrics: reportData.funnelMetrics,
        generatedBy: req.user.id,
        status: 'completed'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...reportData,
        savedReport
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.exportFunnelReportToExcel = async (req, res, next) => {
  try {
    const { startDate, endDate, department, jobId, source, channel } = req.body;

    const reportData = await generateRecruitmentFunnelReport({
      startDate, endDate, department, jobId, source, channel
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Recruitment System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('招聘漏斗报表');

    worksheet.columns = [
      { header: '阶段', key: 'stage', width: 20 },
      { header: '人数', key: 'count', width: 10 },
      { header: '转化率', key: 'conversionRate', width: 12 },
      { header: '说明', key: 'description', width: 30 }
    ];

    const stageDescriptions = {
      '简历投递': '总简历投递数',
      '简历筛选': 'HR筛选通过',
      '电话面试通过': '电话面试通过',
      '面试安排': '已安排面试',
      '面试到场': '实际到场面试',
      '面试通过': '面试综合通过',
      'Offer发放': '已发出Offer',
      'Offer接受': '候选人接受Offer',
      '已录用': '最终录用'
    };

    reportData.funnelMetrics.stages.forEach(stage => {
      worksheet.addRow({
        stage: stage.name,
        count: stage.count,
        conversionRate: stage.conversionRate,
        description: stageDescriptions[stage.name] || ''
      });
    });

    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    const summarySheet = workbook.addWorksheet('汇总数据');
    summarySheet.columns = [
      { header: '指标', key: 'metric', width: 25 },
      { header: '数值', key: 'value', width: 20 }
    ];

    summarySheet.addRow({ metric: '总简历数', value: reportData.funnelData.totalResumes });
    summarySheet.addRow({ metric: '总录用人数', value: reportData.funnelData.hired });
    summarySheet.addRow({ metric: '整体录用率', value: reportData.funnelMetrics.overallConversionRate });
    summarySheet.addRow({ metric: '报表生成时间', value: new Date().toLocaleString() });

    if (department) {
      summarySheet.addRow({ metric: '部门', value: department });
    }
    if (jobId) {
      const job = await Job.findById(jobId);
      summarySheet.addRow({ metric: '职位', value: job?.title || jobId });
    }

    summarySheet.getRow(1).font = { bold: true, size: 12 };

    const fileName = `recruitment-funnel-report-${moment().format('YYYYMMDDHHmmss')}.xlsx`;
    const filePath = `./exports/${fileName}`;

    const fs = require('fs');
    if (!fs.existsSync('./exports')) {
      fs.mkdirSync('./exports', { recursive: true });
    }

    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('下载文件失败:', err);
      }
    });

    const report = await RecruitmentReport.create({
      reportType: 'funnel',
      reportPeriod: reportData.reportPeriod,
      filters: reportData.filters,
      funnelData: reportData.funnelData,
      metrics: reportData.funnelMetrics,
      generatedBy: req.user.id,
      exportRecords: [{
        exportedBy: req.user.id,
        exportedAt: new Date(),
        fileName,
        format: 'excel'
      }],
      status: 'completed'
    });

  } catch (error) {
    next(error);
  }
};

exports.getReports = async (req, res, next) => {
  try {
    const { reportType, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (reportType) query.reportType = reportType;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reports = await RecruitmentReport.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('generatedBy', 'name email');

    const total = await RecruitmentReport.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: reports
    });
  } catch (error) {
    next(error);
  }
};

exports.getReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;

    const report = await RecruitmentReport.findById(reportId)
      .populate('generatedBy', 'name email');

    if (!report) {
      return next(new AppError('报表不存在', 404));
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;

    const report = await RecruitmentReport.findById(reportId);
    if (!report) {
      return next(new AppError('报表不存在', 404));
    }

    await RecruitmentReport.findByIdAndDelete(reportId);

    res.status(200).json({
      success: true,
      message: '报表已删除'
    });
  } catch (error) {
    next(error);
  }
};

exports.sendReportByEmail = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { recipients, subject, message } = req.body;

    if (!recipients || recipients.length === 0) {
      return next(new AppError('请提供收件人邮箱', 400));
    }

    const report = await RecruitmentReport.findById(reportId);
    if (!report) {
      return next(new AppError('报表不存在', 404));
    }

    const emailPromises = recipients.map(email =>
      sendEmail({
        email,
        subject: subject || '招聘漏斗分析报表',
        message: message || `您好，\n\n请查看附件中的招聘漏斗分析报表。\n\n报表时间：${new Date(report.createdAt).toLocaleString()}`,
        html: `
          <div>
            <h3>招聘漏斗分析报表</h3>
            <p>报表生成时间：${new Date(report.createdAt).toLocaleString()}</p>
            <p>总简历数：${report.funnelData?.totalResumes || 0}</p>
            <p>总录用人数：${report.funnelData?.hired || 0}</p>
            <p>整体录用率：${report.metrics?.overallConversionRate || '0%'}</p>
          </div>
        `
      })
    );

    await Promise.all(emailPromises);

    report.exportRecords = report.exportRecords || [];
    report.exportRecords.push({
      exportedBy: req.user.id,
      exportedAt: new Date(),
      format: 'email',
      recipients
    });
    await report.save();

    res.status(200).json({
      success: true,
      message: `报表已发送给 ${recipients.length} 位收件人`
    });
  } catch (error) {
    next(error);
  }
};

exports.getDepartmentStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const departments = await Job.distinct('department');
    const departmentStats = [];

    for (const dept of departments) {
      const reportData = await generateRecruitmentFunnelReport({
        startDate, endDate, department: dept
      });

      departmentStats.push({
        department: dept,
        ...reportData.funnelData,
        hireRate: reportData.funnelMetrics.hireRate
      });
    }

    res.status(200).json({
      success: true,
      totalDepartments: departments.length,
      data: departmentStats
    });
  } catch (error) {
    next(error);
  }
};

exports.getSourceStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);

    const candidateQuery = {};
    if (Object.keys(dateQuery).length > 0) {
      candidateQuery.createdAt = dateQuery;
    }

    const sources = await JobCandidate.distinct('source', candidateQuery);
    const sourceStats = [];

    for (const source of sources) {
      const reportData = await generateRecruitmentFunnelReport({
        startDate, endDate, source
      });

      sourceStats.push({
        source: source || '未知',
        ...reportData.funnelData,
        hireRate: reportData.funnelMetrics.hireRate
      });
    }

    sourceStats.sort((a, b) => b.totalResumes - a.totalResumes);

    res.status(200).json({
      success: true,
      totalSources: sources.length,
      data: sourceStats
    });
  } catch (error) {
    next(error);
  }
};

exports.runDailyReportJob = async () => {
  try {
    console.log('🔄 开始生成每日招聘漏斗报表...');

    const yesterday = moment().subtract(1, 'day');
    const startOfDay = yesterday.startOf('day').toDate();
    const endOfDay = yesterday.endOf('day').toDate();

    const reportData = await generateRecruitmentFunnelReport({
      startDate: startOfDay,
      endDate: endOfDay
    });

    const report = await RecruitmentReport.create({
      reportType: 'funnel',
      reportPeriod: {
        startDate: startOfDay,
        endDate: endOfDay
      },
      filters: {},
      funnelData: reportData.funnelData,
      metrics: reportData.funnelMetrics,
      generatedBy: 'system',
      isAutomated: true,
      status: 'completed'
    });

    console.log(`✅ 每日报表生成完成: ${report._id}`);
    return report;
  } catch (error) {
    console.error('❌ 生成每日报表失败:', error);
    throw error;
  }
};
