#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import time
import traceback
from datetime import date, timedelta
from functools import wraps

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from models import init_db, SessionLocal, Customer, Order, Receivable
from modules import (
    CreditScoringEngine,
    OrderRiskController,
    FinancialStatementParser,
    ReceivableManager,
    CreditRiskReportGenerator,
    OperationLogManager,
    run_daily_credit_update,
    run_daily_collection_scan,
    run_monthly_report
)
from utils import format_currency
from main import create_sample_data


def test_step(step_num, description):
    print(f"\n{'='*80}")
    print(f"【测试步骤 {step_num}】{description}")
    print('='*80)


def print_result(success, message):
    status = "✅ 通过" if success else "❌ 失败"
    print(f"\n{status}: {message}")
    return success


def close_all_connections():
    try:
        from models import engine
        engine.dispose()
    except:
        pass
    time.sleep(1.5)

def clear_locks():
    close_all_connections()
    try:
        from config.settings import DATA_DIR
        db_path = os.path.join(DATA_DIR, 'credit_risk.db')
        wal_path = db_path + '-wal'
        shm_path = db_path + '-shm'
        if os.path.exists(wal_path):
            try:
                os.remove(wal_path)
            except:
                pass
        if os.path.exists(shm_path):
            try:
                os.remove(shm_path)
            except:
                pass
    except:
        pass
    time.sleep(1.0)


def with_retry(max_retries=5, delay=1.0):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if 'database is locked' in str(e) or 'PendingRollbackError' in str(e) or 'rollback' in str(e).lower() or 'disk I/O' in str(e):
                        if attempt < max_retries - 1:
                            print(f"数据库锁定，第 {attempt + 1} 次重试...")
                            clear_locks()
                            time.sleep(delay * (attempt + 1))
                        else:
                            raise last_exception
                    else:
                        raise last_exception
            raise last_exception
        return wrapper
    return decorator


def run_full_test():
    print("\n" + "#"*80)
    print("#" + " "*78 + "#")
    print("#" + " "*20 + "客户信用风险评估与订单风控管理系统" + " "*19 + "#")
    print("#" + " "*28 + "完整功能测试" + " "*30 + "#")
    print("#" + " "*78 + "#")
    print("#"*80)

    results = []

    # 步骤1: 数据库初始化
    test_step(1, "数据库初始化")
    try:
        from config.settings import DATA_DIR
        db_path = os.path.join(DATA_DIR, 'credit_risk.db')
        if os.path.exists(db_path):
            os.remove(db_path)
            print("\n已删除旧数据库，重新初始化...")
        clear_locks()
        init_db()
        create_sample_data()
        clear_locks()
        results.append(print_result(True, "数据库初始化并创建示例数据成功"))
    except Exception as e:
        traceback.print_exc()
        results.append(print_result(False, f"数据库初始化失败: {e}"))
        return

    # 步骤2: 检查示例数据
    test_step(2, "检查示例客户数据")
    try:
        clear_locks()
        db = SessionLocal()
        customers = db.query(Customer).filter(Customer.is_active == True).all()
        db.close()
        clear_locks()

        if len(customers) >= 5:
            print(f"\n已加载 {len(customers)} 个客户数据:")
            print("-" * 80)
            print(f"{'编码':<10} {'名称':<25} {'行业':<12} {'评分':<8} {'等级':<6} {'信用额度':<15}")
            print("-" * 80)
            for c in customers:
                print(f"{c.customer_code:<10} {c.name[:24]:<25} {c.industry:<12} {c.credit_score:<8.1f} {c.credit_level:<6} {format_currency(c.credit_limit):<15}")
            results.append(print_result(True, f"成功加载 {len(customers)} 个客户数据"))
        else:
            results.append(print_result(False, f"客户数据不足，只有 {len(customers)} 个"))
    except Exception as e:
        traceback.print_exc()
        results.append(print_result(False, f"客户数据检查失败: {e}"))

    # 步骤3: 测试信用评分引擎
    test_step(3, "信用评分引擎 - 计算动态信用评分")
    try:
        clear_locks()
        db = SessionLocal()
        customer = db.query(Customer).filter(Customer.customer_code == 'CUST003').first()
        db.close()
        clear_locks()

        scorer = CreditScoringEngine()
        score, score_details = scorer.calculate_credit_score(customer)

        print(f"\n客户: {customer.name}")
        print(f"原评分: {customer.credit_score:.1f} -> 新评分: {score:.1f}")
        print(f"\n各维度评分详情:")
        print("-" * 50)
        for key, value in score_details.items():
            key_cn = {
                'payment_history': '付款历史',
                'credit_utilization': '信用利用率',
                'order_frequency': '订单频率',
                'average_order_value': '平均订单金额',
                'years_as_customer': '合作年限',
                'financial_health': '财务健康'
            }
            print(f"  {key_cn.get(key, key):<15}: {value:>6.1f} 分")
        print("-" * 50)

        new_limit, new_level = scorer.calculate_credit_limit(customer, score)
        print(f"\n推荐信用等级: {new_level}, 推荐额度: {format_currency(new_limit)}")

        scorer.close()
        clear_locks()
        results.append(print_result(True, f"信用评分计算成功，综合评分: {score:.1f}"))
    except Exception as e:
        traceback.print_exc()
        results.append(print_result(False, f"信用评分计算失败: {e}"))

    # 步骤4: 测试订单风控校验
    test_step(4, "订单风控校验 - 超限订单多级审批")
    try:
        clear_locks()
        db = SessionLocal()
        customer = db.query(Customer).filter(Customer.customer_code == 'CUST004').first()
        db.close()
        clear_locks()

        print(f"\n客户: {customer.name}")
        print(f"信用额度: {format_currency(customer.credit_limit)}")
        print(f"当前余额: {format_currency(customer.current_balance)}")
        print(f"可用额度: {format_currency(customer.available_credit)}")

        test_amount = customer.available_credit + 600000
        print(f"\n测试下单金额: {format_currency(test_amount)}")

        controller = OrderRiskController()
        check_result = controller.check_credit_limit(customer.id, test_amount)
        print(f"\n额度检查: {check_result['message']}")
        print(f"超出额度: {format_currency(check_result['shortfall'])}")
        print(f"需要审批等级: {check_result['approval_level']}级")
        print(f"审批人: {', '.join(check_result['approvers'])}")

        @with_retry(max_retries=3)
        def do_create_order(cust_id, amount):
            ctrl = OrderRiskController()
            try:
                return ctrl.create_order(cust_id, amount, notes='测试大额订单')
            finally:
                ctrl.close()

        order = do_create_order(customer.id, test_amount)
        print(f"\n订单创建成功: {order.order_number}")
        print(f"订单状态: {order.order_status}")
        print(f"是否冻结: {order.is_frozen}")

        print(f"\n开始执行三级审批流程:")
        print("-" * 50)

        @with_retry(max_retries=3)
        def do_approve(order_id, role, name, decision, note):
            ctrl = OrderRiskController()
            try:
                return ctrl.approve_order(order_id, role, name, decision, note)
            finally:
                ctrl.close()

        r1 = do_approve(order.id, '销售经理', '张三', 'approved', '业务需求真实，同意')
        print(f"1. 销售经理审批: {r1['message']}")
        clear_locks()

        r2 = do_approve(order.id, '财务主管', '李四', 'approved', '资金安排可行，同意')
        print(f"2. 财务主管审批: {r2['message']}")
        clear_locks()

        r3 = do_approve(order.id, '风控总监', '王五', 'approved', '风险可控，同意')
        print(f"3. 风控总监审批: {r3['message']}")
        print("-" * 50)

        clear_locks()
        db = SessionLocal()
        order = db.query(Order).filter(Order.id == order.id).first()
        db.close()
        print(f"\n审批完成后订单状态: {order.order_status}")

        controller.close()
        clear_locks()
        results.append(print_result(True, "订单风控校验与三级审批流程测试通过"))
    except Exception as e:
        traceback.print_exc()
        results.append(print_result(False, f"订单风控测试失败: {e}"))

    # 步骤5: 测试财务报表解析
    test_step(5, "财务报表解析 - 手动录入并计算财务指标")
    try:
        clear_locks()
        db = SessionLocal()
        customer = db.query(Customer).filter(Customer.customer_code == 'CUST002').first()
        db.close()
        clear_locks()

        print(f"\n客户: {customer.name}")
        print(f"当前信用等级: {customer.credit_level} (评分: {customer.credit_score:.1f})")

        financial_data = {
            'total_assets': 5000000,
            'total_liabilities': 2000000,
            'current_assets': 2500000,
            'current_liabilities': 1000000,
            'inventory': 500000,
            'cash_and_equivalents': 800000,
            'operating_cash_flow': 600000,
            'revenue': 8000000,
            'net_profit': 800000,
        }

        print(f"\n录入财务数据:")
        print("-" * 50)
        print(f"  总资产: {format_currency(financial_data['total_assets'])}")
        print(f"  总负债: {format_currency(financial_data['total_liabilities'])}")
        print(f"  流动资产: {format_currency(financial_data['current_assets'])}")
        print(f"  流动负债: {format_currency(financial_data['current_liabilities'])}")
        print(f"  经营现金流: {format_currency(financial_data['operating_cash_flow'])}")
        print("-" * 50)

        @with_retry(max_retries=3)
        def do_manual_input(cust_id, data, period, uploader):
            p = FinancialStatementParser()
            try:
                return p.manual_input(cust_id, data, period, uploader)
            finally:
                p.close()

        record, ratios, health_score = do_manual_input(
            customer.id, financial_data, '2024-Q4', '测试人员'
        )

        print(f"\n计算得到的财务指标:")
        print("-" * 50)
        print(f"  资产负债率: {ratios['asset_liability_ratio']*100:.2f}% (目标: ≤50%)")
        print(f"  流动比率: {ratios['current_ratio']:.2f} (目标: ≥2.0)")
        print(f"  速动比率: {ratios['quick_ratio']:.2f} (目标: ≥1.0)")
        print(f"  现金流比率: {ratios['cash_flow_ratio']:.2f} (目标: ≥0.4)")
        print(f"  财务健康评分: {health_score:.1f}/100")
        print("-" * 50)

        clear_locks()

        @with_retry(max_retries=3)
        def do_update_credit(cust_id, reason):
            db = SessionLocal()
            try:
                cust = db.query(Customer).filter(Customer.id == cust_id).first()
                s = CreditScoringEngine()
                try:
                    return s.update_customer_credit(cust, reason=reason, notify=False)
                finally:
                    s.close()
            finally:
                db.close()

        do_update_credit(customer.id, '财务报表更新，重新评估')
        clear_locks()

        db = SessionLocal()
        customer = db.query(Customer).filter(Customer.id == customer.id).first()
        db.close()
        print(f"\n更新后信用等级: {customer.credit_level} (评分: {customer.credit_score:.1f})")

        clear_locks()
        results.append(print_result(True, f"财务报表解析成功，财务健康评分: {health_score:.1f}"))
    except Exception as e:
        traceback.print_exc()
        results.append(print_result(False, f"财务报表解析测试失败: {e}"))

    # 步骤6: 测试应收账款扫描与催收策略
    test_step(6, "应收账款扫描 - 生成差异化催收策略")
    try:
        clear_locks()

        print("\n更新应收账款逾期状态...")
        @with_retry(max_retries=3)
        def do_update_overdue():
            mgr = ReceivableManager()
            try:
                return mgr.update_overdue_status()
            finally:
                mgr.close()

        updated = do_update_overdue()
        print(f"更新了 {len(updated)} 条应收账款状态")

        print("\n执行逾期账款扫描，生成催收任务...")

        @with_retry(max_retries=3)
        def do_scan(notify):
            mgr = ReceivableManager()
            try:
                result = mgr.scan_overdue_receivables(notify=notify)
                simple_tasks = []
                for task_info in result:
                    task = task_info['task']
                    customer_name = task_info['customer']
                    rec = task_info['receivable']
                    simple_tasks.append({
                        'priority': task.priority,
                        'customer_name': customer_name,
                        'days_overdue': rec.days_overdue,
                        'remaining_amount': rec.remaining_amount,
                        'assigned_to_sales': task.assigned_to_sales,
                        'assigned_to_finance': task.assigned_to_finance,
                        'actions_required': task.actions_required
                    })
                return simple_tasks
            finally:
                mgr.close()

        tasks = do_scan(False)
        print(f"生成 {len(tasks)} 个催收任务")

        if tasks:
            print("\n催收任务详情:")
            print("-" * 90)
            print(f"{'优先级':<10} {'客户':<20} {'逾期天数':<10} {'逾期金额':<15} {'销售负责人':<12} {'财务负责人':<12}")
            print("-" * 90)
            for t in tasks:
                print(f"{t['priority'].upper():<10} {t['customer_name'][:19]:<20} {t['days_overdue']:<10} "
                      f"{format_currency(t['remaining_amount']):<15} {t['assigned_to_sales']:<12} {t['assigned_to_finance']:<12}")
                print(f"  应执行措施: {t['actions_required']}")
            print("-" * 90)

        print("\n逾期账龄分布:")
        @with_retry(max_retries=3)
        def do_get_summary():
            mgr = ReceivableManager()
            try:
                return mgr.get_overdue_summary()
            finally:
                mgr.close()

        summary = do_get_summary()
        print("-" * 70)
        print(f"{'逾期期间':<12} {'笔数':<8} {'金额':<18} {'涉及客户数':<12}")
        print("-" * 70)
        for item in summary:
            print(f"{item['overdue_period']:<12} {item['count']:<8} "
                  f"{format_currency(item['total_amount']):<18} {item['customer_count']:<12}")
        print("-" * 70)

        clear_locks()
        results.append(print_result(True, f"应收账款扫描成功，生成 {len(tasks)} 个催收任务"))
    except Exception as e:
        traceback.print_exc()
        results.append(print_result(False, f"应收账款扫描测试失败: {e}"))

    # 步骤7: 测试批量信用评估
    test_step(7, "批量信用评估 - 每日定时任务")
    try:
        clear_locks()

        @with_retry(max_retries=3)
        def do_run_daily_update():
            engine = CreditScoringEngine()
            try:
                return engine.update_all_customers_credit(reason='每日批量信用评估')
            finally:
                engine.close()

        result = do_run_daily_update()
        clear_locks()

        print(f"\n处理客户数: {result['total_processed']}")
        print(f"重大调整数: {result['significant_changes']}")

        if result['significant_changes'] > 0:
            print("\n信用等级发生重大调整的客户:")
            print("-" * 70)
            for change in result['details']:
                if change['old_level'] != change['new_level']:
                    print(f"  {change['customer']}: {change['old_level']} -> {change['new_level']} "
                          f"(评分: {change['old_score']:.1f} -> {change['new_score']:.1f})")
            print("-" * 70)

        results.append(print_result(True, f"批量信用评估成功，处理 {result['total_processed']} 个客户"))
    except Exception as e:
        traceback.print_exc()
        results.append(print_result(False, f"批量信用评估测试失败: {e}"))

    # 步骤8: 测试月度报告生成
    test_step(8, "月度信用风险报告 - PDF + Excel + 图表")
    try:
        clear_locks()

        @with_retry(max_retries=3)
        def do_collect_stats():
            g = CreditRiskReportGenerator()
            try:
                return g.collect_statistics()
            finally:
                g.close()

        print("\n正在收集统计数据...")
        stats = do_collect_stats()

        print("\n报告核心数据:")
        print("-" * 60)
        print(f"  报告期: {stats['report_month']}")
        print(f"  客户总数: {stats['total_customers']}")
        print(f"  应收账款总额: {format_currency(stats['total_receivables'])}")
        print(f"  坏账金额: {format_currency(stats['bad_debt_amount'])}")
        print(f"  坏账率: {stats['bad_debt_rate']*100:.2f}%")
        print(f"  本月订单数: {stats['total_orders']}")
        print(f"  超限订单数: {stats['over_limit_orders']}")
        print(f"  超限比例: {stats['over_limit_ratio']*100:.2f}%")
        print("-" * 60)

        print("\n客户等级分布:")
        for level, count in stats['level_distribution'].items():
            pct = count / stats['total_customers'] * 100 if stats['total_customers'] > 0 else 0
            bar = '█' * int(pct / 5)
            print(f"  {level:<4} | {bar:<20} {count:>4}户 ({pct:>5.1f}%)")

        print("\n正在生成报告文件...")

        @with_retry(max_retries=3)
        def do_generate_report():
            g = CreditRiskReportGenerator()
            try:
                return g.generate_monthly_report()
            finally:
                g.close()

        report_paths, stats = do_generate_report()

        print("\n报告生成结果:")
        print("-" * 80)
        print(f"  Excel报告: {report_paths['excel']}")
        if report_paths['pdf']:
            print(f"  PDF报告: {report_paths['pdf']}")
        else:
            print(f"  PDF报告: 未生成（请安装 reportlab 库）")
        print("-" * 80)

        clear_locks()
        results.append(print_result(True, "月度信用风险报告生成成功"))
    except Exception as e:
        traceback.print_exc()
        results.append(print_result(False, f"月度报告生成测试失败: {e}"))

    # 步骤9: 测试操作日志查询
    test_step(9, "操作日志 - 组合查询与导出")
    try:
        clear_locks()

        @with_retry(max_retries=3)
        def do_query_all():
            lm = OperationLogManager()
            try:
                return lm.query_logs()
            finally:
                lm.close()

        print("\n查询所有操作日志...")
        all_logs = do_query_all()
        print(f"共找到 {len(all_logs)} 条操作日志")

        @with_retry(max_retries=3)
        def do_get_stats():
            lm = OperationLogManager()
            try:
                return lm.get_operation_type_stats()
            finally:
                lm.close()

        print("\n按操作类型统计:")
        stats = do_get_stats()
        print("-" * 50)
        for op_type, count in sorted(stats.items(), key=lambda x: -x[1]):
            bar = '█' * int(count / 2)
            print(f"  {op_type:<25} | {bar:<20} {count:>4} 条")
        print("-" * 50)

        print("\n组合条件查询（信用调整 + 高风险客户）:")
        criteria = {
            'operation_type': 'credit_adjustment',
            'credit_level': ['BB', 'B', 'C']
        }

        @with_retry(max_retries=3)
        def do_advanced_search(crit):
            lm = OperationLogManager()
            try:
                return lm.advanced_search(crit)
            finally:
                lm.close()

        filtered_logs = do_advanced_search(criteria)

        @with_retry(max_retries=3)
        def do_print_logs(logs, limit):
            lm = OperationLogManager()
            try:
                lm.print_logs(logs, limit=limit)
            finally:
                lm.close()

        do_print_logs(filtered_logs, limit=5)

        print("\n导出查询结果...")

        @with_retry(max_retries=3)
        def do_export(crit):
            lm = OperationLogManager()
            try:
                return lm.batch_export(crit)
            finally:
                lm.close()

        export_path, count = do_export(criteria)
        print(f"已导出 {count} 条日志到: {export_path}")

        clear_locks()
        results.append(print_result(True, f"操作日志查询成功，共 {len(all_logs)} 条记录"))
    except Exception as e:
        traceback.print_exc()
        results.append(print_result(False, f"操作日志查询测试失败: {e}"))

    # 汇总测试结果
    print("\n" + "="*80)
    print("                                    测试结果汇总")
    print("="*80)

    passed = sum(1 for r in results if r)
    total = len(results)
    print(f"\n总计: {passed}/{total} 项测试通过")
    print("-" * 80)

    for i, result in enumerate(results, 1):
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  步骤 {i}: {status}")

    print("-" * 80)

    if passed == total:
        print("\n🎉 所有测试通过！系统功能完整可用。")
        return True
    else:
        print(f"\n⚠️  有 {total - passed} 项测试失败，请检查相关功能。")
        return False


if __name__ == '__main__':
    success = run_full_test()
    sys.exit(0 if success else 1)
