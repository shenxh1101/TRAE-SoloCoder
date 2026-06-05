const OperationReport = require('../models/OperationReport');
const moment = require('moment');
const { Parser } = require('json2csv');

exports.generateDailyReport = async (req, res, next) => {
  try {
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();
    
    const existingReport = await OperationReport.findOne({
      reportDate: moment(reportDate).startOf('day').toDate(),
      reportType: 'daily'
    });

    if (existingReport && !req.query.force) {
      return res.status(200).json({
        success: true,
        message: '日报表已存在',
        data: existingReport
      });
    }

    const report = await OperationReport.generateDailyReport(reportDate);

    res.status(200).json({
      success: true,
      message: '日报表生成成功',
      data: report
    });
  } catch (err) {
    next(err);
  }
};

exports.generateWeeklyReport = async (req, res, next) => {
  try {
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();
    
    const report = await OperationReport.generateWeeklyReport(reportDate);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: '该周无日报表数据，无法生成周报表'
      });
    }

    res.status(200).json({
      success: true,
      message: '周报表生成成功',
      data: report
    });
  } catch (err) {
    next(err);
  }
};

exports.getReports = async (req, res, next) => {
  try {
    const { type = 'daily', startDate, endDate, page = 1, limit = 30 } = req.query;
    
    const query = { reportType: type };
    if (startDate && endDate) {
      query.reportDate = {
        $gte: moment(startDate).startOf('day').toDate(),
        $lte: moment(endDate).endOf('day').toDate()
      };
    }

    const skip = (page - 1) * limit;
    
    const reports = await OperationReport.find(query)
      .sort({ reportDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await OperationReport.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reports.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: reports
    });
  } catch (err) {
    next(err);
  }
};

exports.getReport = async (req, res, next) => {
  try {
    const report = await OperationReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: '报表不存在'
      });
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (err) {
    next(err);
  }
};

exports.exportReport = async (req, res, next) => {
  try {
    const { type = 'daily', startDate, endDate, format = 'json' } = req.query;
    
    const query = { reportType: type };
    if (startDate && endDate) {
      query.reportDate = {
        $gte: moment(startDate).startOf('day').toDate(),
        $lte: moment(endDate).endOf('day').toDate()
      };
    }

    const reports = await OperationReport.find(query).sort({ reportDate: -1 });

    if (format === 'csv') {
      const fields = [
        'reportDate',
        'totalSpaces',
        'totalParkings',
        'totalRevenue',
        'averageUtilizationRate',
        'peakHour',
        'peakOccupancy',
        'violationCount',
        'newUsers',
        'newMonthlyCards'
      ];
      
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(reports.map(r => ({
        ...r.toObject(),
        reportDate: moment(r.reportDate).format('YYYY-MM-DD')
      })));

      res.header('Content-Type', 'text/csv');
      res.attachment(`parking_reports_${type}_${moment().format('YYYYMMDD')}.csv`);
      return res.send(csv);
    }

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (err) {
    next(err);
  }
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = moment().startOf('day');
    const yesterday = moment().subtract(1, 'day').startOf('day');

    const todayReport = await OperationReport.findOne({
      reportDate: today.toDate(),
      reportType: 'daily'
    });

    const yesterdayReport = await OperationReport.findOne({
      reportDate: yesterday.toDate(),
      reportType: 'daily'
    });

    const ParkingRecord = require('../models/ParkingRecord');
    const ParkingSpace = require('../models/ParkingSpace');
    const User = require('../models/User');

    const currentParkings = await ParkingRecord.countDocuments({ status: 'parking' });
    const totalSpaces = await ParkingSpace.countDocuments();
    const availableSpaces = await ParkingSpace.countDocuments({ status: 'available' });
    const totalUsers = await User.countDocuments();
    const activeMonthlyCards = await require('../models/MonthlyCard').countDocuments({ status: 'active' });

    const recentParkings = await ParkingRecord.find()
      .sort({ entryTime: -1 })
      .limit(10)
      .populate('spaceId')
      .populate('userId', 'name');

    res.status(200).json({
      success: true,
      data: {
        today: todayReport ? {
          revenue: todayReport.totalRevenue,
          parkings: todayReport.totalParkings,
          utilizationRate: todayReport.averageUtilizationRate,
          violations: todayReport.violationCount
        } : null,
        yesterday: yesterdayReport ? {
          revenue: yesterdayReport.totalRevenue,
          parkings: yesterdayReport.totalParkings,
          utilizationRate: yesterdayReport.averageUtilizationRate,
          violations: yesterdayReport.violationCount
        } : null,
        current: {
          totalSpaces,
          occupiedSpaces: currentParkings,
          availableSpaces,
          occupancyRate: totalSpaces > 0 ? Math.round((currentParkings / totalSpaces) * 10000) / 100 : 0
        },
        stats: {
          totalUsers,
          activeMonthlyCards
        },
        recentParkings
      }
    });
  } catch (err) {
    next(err);
  }
};
