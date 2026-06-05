import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { rescueService, ReportQueryParams } from '@/services/rescueService';
import { MonthlyReport } from '@/types/rescue';
import dayjs from 'dayjs';

const months = Array.from({ length: 12 }, (_, i) => {
  const date = dayjs().subtract(i, 'month');
  return {
    value: date.format('YYYY-MM'),
    label: date.format('YYYY年MM月')
  };
});

const ReportExportPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(months[0].value);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportList, setReportList] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  const buildReportParams = useCallback((): ReportQueryParams => {
    return {
      month: selectedMonth
    };
  }, [selectedMonth]);

  const loadData = useCallback(async () => {
    console.log('[ReportExport] 加载月度报表:', selectedMonth);
    setLoading(true);
    try {
      const params = buildReportParams();
      console.log('[ReportExport] 查询参数:', params);

      const [reportData, listData] = await Promise.all([
        rescueService.getMonthlyReport(params),
        rescueService.getReportList({ month: selectedMonth })
      ]);

      console.log('[ReportExport] 报表数据:', reportData);
      console.log('[ReportExport] 历史报表列表:', listData);

      setReport(reportData);
      setReportList(listData.list || []);
    } catch (error) {
      console.error('[ReportExport] 加载报表失败:', error);
      Taro.showToast({ title: '数据加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, buildReportParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useDidShow(() => {
    loadData();
  });

  const handleMonthSelect = () => {
    Taro.showActionSheet({
      itemList: months.map(m => m.label),
      success: (res) => {
        setSelectedMonth(months[res.tapIndex].value);
      }
    });
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!report || exporting) return;
    try {
      setExporting(true);
      const params: ReportQueryParams = {
        month: selectedMonth,
        format
      };
      console.log('[ReportExport] 导出报表参数:', params);

      const result = await rescueService.exportReport(params);
      console.log('[ReportExport] 报表导出成功:', result);

      Taro.showModal({
        title: '导出成功',
        content: `${format === 'excel' ? 'Excel' : 'PDF'}报表已生成，文件名：${result.fileName}，点击确定下载`,
        confirmText: '下载',
        success: async (res) => {
          if (res.confirm) {
            try {
              await rescueService.downloadReport(result.downloadUrl, result.fileName);
              console.log('[ReportExport] 报表下载完成');
            } catch (downloadError) {
              console.error('[ReportExport] 下载失败:', downloadError);
              Taro.showToast({ title: '下载失败', icon: 'none' });
            }
          }
        }
      });

      await loadData();
    } catch (error) {
      console.error('[ReportExport] 导出失败:', error);
      Taro.showToast({ title: '导出失败', icon: 'none' });
    } finally {
      setExporting(false);
    }
  };

  if (!report) {
    return (
      <View className={styles.page}>
        <View style={{ textAlign: 'center', padding: 100 }}>
          <Text style={{ color: '#86909C' }}>加载中...</Text>
        </View>
      </View>
    );
  }

  const maxServiceCount = Math.max(...report.serviceBreakdown.map(s => s.count));

  return (
    <View className={styles.page}>
      <ScrollView scrollY>
        <View className={styles.monthSelector} onClick={handleMonthSelect}>
          <View>
            <Text className={styles.monthLabel}>选择月份</Text>
            <Text className={styles.monthValue}>
              {months.find(m => m.value === selectedMonth)?.label || selectedMonth}
            </Text>
          </View>
          <View className={styles.selectBtn}>切换月份 ›</View>
        </View>

        <View className={styles.summaryCards}>
          <View className={styles.summaryCard}>
            <Text className={styles.summaryIcon}>💰</Text>
            <Text className={styles.summaryValue}>¥{report.totalRevenue.toLocaleString()}</Text>
            <Text className={styles.summaryLabel}>总营收</Text>
          </View>
          <View className={styles.summaryCard}>
            <Text className={styles.summaryIcon}>📈</Text>
            <Text className={styles.summaryValue}>¥{report.netProfit.toLocaleString()}</Text>
            <Text className={styles.summaryLabel}>净利润</Text>
          </View>
          <View className={styles.summaryCard}>
            <Text className={styles.summaryIcon}>📋</Text>
            <Text className={styles.summaryValue}>{report.orderCount}</Text>
            <Text className={styles.summaryLabel}>订单数</Text>
          </View>
          <View className={styles.summaryCard}>
            <Text className={styles.summaryIcon}>🚨</Text>
            <Text className={styles.summaryValue}>{report.rescueCount}</Text>
            <Text className={styles.summaryLabel}>救援数</Text>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>经营概览</Text>
          <View className={styles.dataCard}>
            <View className={styles.dataRow}>
              <Text className={styles.dataName}>总营收</Text>
              <Text className={styles.dataValue}>¥{report.totalRevenue.toLocaleString()}</Text>
            </View>
            <View className={styles.dataRow}>
              <Text className={styles.dataName}>总成本</Text>
              <Text className={styles.dataValue}>¥{report.totalCost.toLocaleString()}</Text>
            </View>
            <View className={[styles.dataRow, styles.profitRow]}>
              <Text className={styles.dataName}>净利润</Text>
              <Text className={styles.dataValue}>¥{report.netProfit.toLocaleString()}</Text>
            </View>
            <View className={styles.dataRow}>
              <Text className={styles.dataName}>平均客单价</Text>
              <Text className={styles.dataValue}>¥{report.avgOrderAmount}</Text>
            </View>
            <View className={styles.dataRow}>
              <Text className={styles.dataName}>客户满意度</Text>
              <Text className={styles.dataValue}>⭐ {report.customerSatisfaction}</Text>
            </View>
            <View className={styles.dataRow}>
              <Text className={styles.dataName}>新增会员</Text>
              <Text className={styles.dataValue}>{report.newMembers} 人</Text>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>门店营收排名</Text>
          <View className={styles.dataCard}>
            <View className={styles.storeList}>
              {report.storeBreakdown
                .sort((a, b) => b.revenue - a.revenue)
                .map((store, index) => (
                  <View key={store.storeName} className={styles.storeRow}>
                    <View className={classnames(
                      styles.storeRank,
                      { [styles.top1]: index === 0, [styles.top2]: index === 1, [styles.top3]: index === 2 }
                    )}>
                      {index + 1}
                    </View>
                    <Text className={styles.storeName}>{store.storeName}</Text>
                    <Text className={styles.storeRevenue}>¥{store.revenue.toLocaleString()}</Text>
                  </View>
                ))}
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>服务类型分布</Text>
          <View className={styles.dataCard}>
            <View className={styles.serviceChart}>
              {report.serviceBreakdown.map((service, index) => {
                const heightPercent = (service.count / maxServiceCount) * 100;
                return (
                  <View key={service.serviceType} className={styles.serviceBar}>
                    <View className={styles.barContainer}>
                      <View
                        className={styles.barFill}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </View>
                    <Text className={styles.barLabel}>{service.serviceType}</Text>
                    <Text className={styles.barValue}>{service.count}单</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      <View className={styles.footer}>
        <View
          className={[styles.exportBtn, styles.excel]}
          onClick={() => handleExport('excel')}
          style={{ opacity: exporting ? 0.6 : 1 }}
        >
          {exporting ? '⏳ 导出中...' : '📊 导出 Excel'}
        </View>
        <View
          className={[styles.exportBtn, styles.pdf]}
          onClick={() => handleExport('pdf')}
          style={{ opacity: exporting ? 0.6 : 1 }}
        >
          {exporting ? '⏳ 导出中...' : '📄 导出 PDF'}
        </View>
      </View>
    </View>
  );
};

export default ReportExportPage;
