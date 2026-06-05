import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useUserStore } from '@/store/useUserStore';
import { userService, InsuranceRenewParams } from '@/services/userService';
import { InsuranceInfo } from '@/types/user';
import { mockInsurances } from '@/data/mockUser';

interface InsuranceQuote {
  companies: Array<{
    id: string;
    name: string;
    logo: string;
    plans: Array<{
      id: string;
      name: string;
      coverage: string[];
      premium: number;
      originalPremium: number;
    }>;
  }>;
}

const InsurancePage: React.FC = () => {
  const { userInfo, currentVehicle } = useUserStore();
  const [insurances, setInsurances] = useState<InsuranceInfo[]>([]);
  const [reminders, setReminders] = useState<InsuranceInfo[]>([]);
  const [quote, setQuote] = useState<InsuranceQuote | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState<InsuranceInfo | null>(null);

  const loadData = async () => {
    try {
      console.log('[Insurance] 开始加载保险数据');
      
      const [insuranceData, reminderData] = await Promise.all([
        userService.getInsuranceList(currentVehicle?.id),
        userService.checkInsuranceReminders()
      ]);

      console.log('[Insurance] 保险列表数据:', insuranceData);
      console.log('[Insurance] 到期提醒数据:', reminderData);

      setInsurances(insuranceData.sort((a, b) => {
        const statusOrder = { expired: 0, expiring: 1, active: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      }));
      setReminders(reminderData);

      if (reminderData.length > 0) {
        const reminderText = reminderData.map(r => {
          const days = getDaysUntilExpire(r.expireDate);
          return `${r.company} - ${days > 0 ? `还有${days}天到期` : '已过期'}`;
        }).join('\n');
        Taro.showModal({
          title: '保险到期提醒',
          content: reminderText,
          showCancel: false
        });
      }
    } catch (error) {
      console.error('[Insurance] 加载保险信息失败:', error);
      setInsurances(mockInsurances.sort((a, b) => {
        const statusOrder = { expired: 0, expiring: 1, active: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      }));
    }
  };

  useEffect(() => {
    if (userInfo) {
      loadData();
    }
  }, [userInfo]);

  useDidShow(() => {
    if (userInfo) {
      loadData();
    }
  });

  const handleGetQuote = async (insurance: InsuranceInfo) => {
    if (!insurance.vehicleId) {
      Taro.showToast({ title: '车辆信息不存在', icon: 'none' });
      return;
    }
    try {
      console.log('[Insurance] 获取续保报价，保险ID:', insurance.id);
      const quoteData = await userService.getInsuranceQuote(insurance.vehicleId);
      console.log('[Insurance] 续保报价数据:', quoteData);
      setQuote(quoteData);
      setSelectedInsurance(insurance);
      setShowQuoteModal(true);
    } catch (error) {
      console.error('[Insurance] 获取续保报价失败:', error);
      Taro.showToast({ title: '获取报价失败，请重试', icon: 'none' });
    }
  };

  const handleSelectPlan = async (companyId: string, planId: string) => {
    if (!selectedInsurance || !quote) return;

    const company = quote.companies.find(c => c.id === companyId);
    const plan = company?.plans.find(p => p.id === planId);

    if (!company || !plan) return;

    Taro.showModal({
      title: '确认续保',
      content: `保险公司：${company.name}\n险种：${plan.name}\n保费：¥${plan.premium}（原价¥${plan.originalPremium}）`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const today = new Date();
            const nextYear = new Date(today);
            nextYear.setFullYear(nextYear.getFullYear() + 1);

            const renewParams: InsuranceRenewParams = {
              insuranceId: selectedInsurance.id,
              insuranceCompany: company.name,
              coveragePlan: plan.name,
              startDate: today.toISOString().split('T')[0],
              endDate: nextYear.toISOString().split('T')[0],
              premium: plan.premium
            };

            console.log('[Insurance] 续保参数:', renewParams);
            const result = await userService.renewInsurance(renewParams);
            console.log('[Insurance] 续保结果:', result);
            
            setShowQuoteModal(false);
            setQuote(null);
            setSelectedInsurance(null);
            
            Taro.showToast({ title: '续保成功', icon: 'success' });
            loadData();
          } catch (error) {
            console.error('[Insurance] 续保失败:', error);
            Taro.showToast({ title: '续保失败，请重试', icon: 'none' });
          }
        }
      }
    });
  };

  const getDaysUntilExpire = (expireDate: string) => {
    const expire = new Date(expireDate).getTime();
    const now = Date.now();
    return Math.ceil((expire - now) / (1000 * 60 * 60 * 24));
  };

  if (!userInfo) {
    return (
      <View className={styles.page}>
        <View style={{ textAlign: 'center', padding: 100 }}>
          <Text style={{ color: '#86909C' }}>请先登录</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className={styles.page} scrollY>
      {insurances.length > 0 ? (
        insurances.map(insurance => {
          const daysLeft = getDaysUntilExpire(insurance.expireDate);
          return (
            <View
              key={insurance.id}
              className={classnames(styles.insuranceCard, styles[insurance.status])}
            >
              <View className={styles.insuranceHeader}>
                <View>
                  <Text className={styles.company}>{insurance.company}</Text>
                  <Text style={{ fontSize: 24, color: '#86909C', marginTop: 4 }}>
                    {userInfo.vehicles.find(v => v.id === insurance.vehicleId)?.plateNumber}
                  </Text>
                </View>
                <View className={classnames(styles.statusTag, styles[insurance.status])}>
                  {insurance.status === 'active' ? '有效' : insurance.status === 'expiring' ? '即将到期' : '已过期'}
                </View>
              </View>

              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>险种</Text>
                <Text className={styles.infoValue}>{insurance.type}</Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>保单号</Text>
                <Text className={styles.infoValue}>{insurance.policyNumber}</Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>保险期限</Text>
                <Text className={styles.infoValue}>{insurance.startDate} 至 {insurance.expireDate}</Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>保费</Text>
                <Text className={styles.infoValue}>¥{insurance.amount}</Text>
              </View>

              {insurance.status !== 'expired' && daysLeft <= 30 && (
                <View className={styles.expireWarning}>
                  <Text className={styles.warningIcon}>⚠️</Text>
                  <Text className={styles.warningText}>
                    {daysLeft > 0 ? `还有 ${daysLeft} 天到期，请及时续保` : '保险已到期，请立即续保'}
                  </Text>
                </View>
              )}

              <View style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                <View className={styles.renewBtn} onClick={() => handleGetQuote(insurance)}>
                  {insurance.status === 'expired' ? '立即投保' : '一键续保'}
                </View>
              </View>
            </View>
          );
        })
      ) : (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>🛡️</Text>
          <Text>暂无保险信息</Text>
        </View>
      )}

      {showQuoteModal && quote && selectedInsurance && (
        <View className={styles.modalOverlay} onClick={() => setShowQuoteModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>选择续保方案</Text>
              <Text className={styles.modalClose} onClick={() => setShowQuoteModal(false)}>✕</Text>
            </View>
            <ScrollView className={styles.modalBody} scrollY>
              {quote.companies.map(company => (
                <View key={company.id} className={styles.quoteCompany}>
                  <View className={styles.companyHeader}>
                    <Text className={styles.companyLogo}>{company.logo}</Text>
                    <Text className={styles.companyName}>{company.name}</Text>
                  </View>
                  {company.plans.map(plan => (
                    <View key={plan.id} className={styles.quotePlan} onClick={() => handleSelectPlan(company.id, plan.id)}>
                      <View className={styles.planInfo}>
                        <Text className={styles.planName}>{plan.name}</Text>
                        <Text className={styles.planCoverage}>
                          {plan.coverage.join(' · ')}
                        </Text>
                      </View>
                      <View className={styles.planPrice}>
                        <Text className={styles.premium}>¥{plan.premium}</Text>
                        <Text className={styles.originalPremium}>¥{plan.originalPremium}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default InsurancePage;
