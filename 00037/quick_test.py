#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速冒烟测试 - 验证核心功能
"""
import sys
import os
import warnings
import time
import traceback
from functools import wraps
warnings.filterwarnings('ignore')

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.database import init_db, SessionLocal, engine
from models.models import Customer, Order
from modules.credit_scoring import CreditScoringEngine
from modules.order_risk import OrderRiskController
from utils.helpers import format_currency

def clear_locks():
    try:
        engine.dispose()
    except:
        pass
    time.sleep(0.5)
    db_path = "data/credit_risk.db"
    for ext in ['.db-wal', '.db-shm']:
        lock_file = db_path.replace('.db', ext)
        if os.path.exists(lock_file):
            try:
                os.remove(lock_file)
            except:
                pass
    time.sleep(0.5)

def with_retry(max_retries=3, delay=1.0):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if 'database is locked' in str(e) or 'disk I/O' in str(e):
                        if attempt < max_retries - 1:
                            print(f"   数据库锁定，第 {attempt + 1} 次重试...")
                            clear_locks()
                            time.sleep(delay * (attempt + 1))
                        else:
                            raise last_exception
                    else:
                        raise last_exception
            raise last_exception
        return wrapper
    return decorator

def main():
    print("\n" + "="*60)
    print("  客户信用风险评估系统 - 快速冒烟测试")
    print("="*60)

    results = []

    try:
        print("\n1. 初始化数据库...")
        init_db()
        db = SessionLocal()
        customers = db.query(Customer).all()
        print(f"   已有 {len(customers)} 个客户")
        db.close()

        if len(customers) == 0:
            print("   创建示例数据...")
            from main import create_sample_data
            create_sample_data()
            db = SessionLocal()
            customers = db.query(Customer).all()
            print(f"   创建了 {len(customers)} 个示例客户")
            db.close()

        results.append(("数据库初始化", True))

        print("\n2. 测试信用评分引擎...")
        db = SessionLocal()
        customer = db.query(Customer).first()
        db.close()

        engine = CreditScoringEngine()
        try:
            total_score, score_details = engine.calculate_credit_score(customer)
            from utils.helpers import get_credit_level
            credit_level = get_credit_level(total_score)
            print(f"   客户: {customer.name}")
            print(f"   信用评分: {total_score:.2f}")
            print(f"   信用等级: {credit_level}")
            print(f"   各维度评分:")
            for key, val in score_details.items():
                print(f"     {key}: {val:.2f}")
            results.append(("信用评分计算", True))
        except Exception as e:
            print(f"   ❌ 失败: {e}")
            import traceback
            traceback.print_exc()
            results.append(("信用评分计算", False))
        finally:
            engine.close()

        print("\n3. 测试订单风控校验...")
        controller = OrderRiskController()
        try:
            test_amount = 50000
            check_result = controller.check_credit_limit(customer.id, test_amount)
            print(f"   订单金额: {format_currency(test_amount)}")
            print(f"   检查结果: {check_result['message']}")
            results.append(("订单风控校验", True))
        except Exception as e:
            print(f"   ❌ 失败: {e}")
            results.append(("订单风控校验", False))
        finally:
            controller.close()

        print("\n4. 测试创建正常订单...")
        controller = OrderRiskController()
        try:
            normal_amount = min(10000, customer.available_credit * 0.5)
            order = controller.create_order(customer.id, normal_amount, notes='冒烟测试订单')
            print(f"   订单号: {order.order_number}")
            print(f"   订单金额: {format_currency(order.total_amount)}")
            print(f"   订单状态: {order.order_status}")
            results.append(("创建正常订单", True))
        except Exception as e:
            print(f"   ❌ 失败: {e}")
            results.append(("创建正常订单", False))
        finally:
            controller.close()

        print("\n5. 测试财务报表解析...")
        clear_locks()
        from modules.financial_parser import FinancialStatementParser

        @with_retry(max_retries=3)
        def do_financial_parse(cust_id, data, period, uploader):
            parser = FinancialStatementParser()
            try:
                return parser.manual_input(cust_id, data, period, uploader)
            finally:
                parser.close()

        try:
            financial_data = {
                'total_assets': 5000000,
                'total_liabilities': 2000000,
                'current_assets': 2500000,
                'current_liabilities': 1000000,
                'inventory': 500000,
                'cash_and_equivalents': 800000,
                'operating_cash_flow': 600000,
                'revenue': 8000000,
                'net_profit': 800000
            }
            record, ratios, health_score = do_financial_parse(
                customer.id, financial_data, '2024-Q4', '冒烟测试'
            )
            print(f"   资产负债率: {ratios['asset_liability_ratio']*100:.2f}%")
            print(f"   流动比率: {ratios['current_ratio']:.2f}")
            print(f"   速动比率: {ratios['quick_ratio']:.2f}")
            print(f"   现金流比率: {ratios['cash_flow_ratio']:.2f}")
            print(f"   财务健康评分: {health_score:.1f}/100")
            results.append(("财务报表解析", True))
        except Exception as e:
            print(f"   ❌ 失败: {e}")
            import traceback as tb
            tb.print_exc()
            results.append(("财务报表解析", False))
        clear_locks()

        print("\n6. 测试应收账款扫描...")
        from modules.receivable_manager import ReceivableManager
        manager = ReceivableManager()
        try:
            updated = manager.update_overdue_status()
            print(f"   更新了 {len(updated)} 条应收账款状态")
            tasks_data = manager.scan_overdue_receivables(notify=False)
            print(f"   生成 {len(tasks_data)} 个催收任务")
            results.append(("应收账款扫描", True))
        except Exception as e:
            print(f"   ❌ 失败: {e}")
            import traceback
            traceback.print_exc()
            results.append(("应收账款扫描", False))
        finally:
            manager.close()

        print("\n7. 测试批量信用评估...")
        engine2 = CreditScoringEngine()
        try:
            result = engine2.update_all_customers_credit(reason='冒烟测试批量评估')
            print(f"   处理客户数: {result['total_processed']}")
            print(f"   重大调整数: {result['significant_changes']}")
            results.append(("批量信用评估", True))
        except Exception as e:
            print(f"   ❌ 失败: {e}")
            import traceback
            traceback.print_exc()
            results.append(("批量信用评估", False))
        finally:
            engine2.close()

        print("\n8. 测试月度报告生成...")
        from modules.report_generator import CreditRiskReportGenerator
        generator = CreditRiskReportGenerator()
        try:
            report_paths, stats = generator.generate_monthly_report()
            print(f"   Excel报告: {report_paths['excel']}")
            if report_paths['pdf']:
                print(f"   PDF报告: {report_paths['pdf']}")
            results.append(("月度报告生成", True))
        except Exception as e:
            print(f"   ❌ 失败: {e}")
            import traceback
            traceback.print_exc()
            results.append(("月度报告生成", False))
        finally:
            generator.close()

        print("\n9. 测试操作日志查询...")
        from modules.operation_log import OperationLogManager
        log_mgr = OperationLogManager()
        try:
            all_logs = log_mgr.query_logs()
            print(f"   共找到 {len(all_logs)} 条操作日志")
            stats = log_mgr.get_operation_type_stats()
            print(f"   操作类型数: {len(stats)}")
            results.append(("操作日志查询", True))
        except Exception as e:
            print(f"   ❌ 失败: {e}")
            import traceback
            traceback.print_exc()
            results.append(("操作日志查询", False))
        finally:
            log_mgr.close()

        print("\n" + "="*60)
        print("  测试结果汇总")
        print("="*60)

        passed = sum(1 for _, r in results if r)
        total = len(results)
        print(f"\n总计: {passed}/{total} 项通过")

        for name, result in results:
            status = "✅ 通过" if result else "❌ 失败"
            print(f"  {name}: {status}")

        print("\n" + "="*60)

        if passed == total:
            print("\n🎉 所有冒烟测试通过！核心功能正常。")
            return 0
        else:
            print(f"\n⚠️  有 {total - passed} 项测试失败。")
            return 1

    except Exception as e:
        print(f"\n❌ 测试过程中发生严重错误: {e}")
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
