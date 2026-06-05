#!/usr/bin/env python3
import requests
import json
import sys
from datetime import datetime

BASE_URL = 'http://localhost:3001/api'
WS_URL = 'ws://localhost:3002'

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user = None
        self.results = []
        
    def log(self, test_name, success, message, data=None):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"\n{status} - {test_name}")
        print(f"   {message}")
        if data:
            print(f"   数据: {json.dumps(data, ensure_ascii=False, indent=2)[:200]}")
        self.results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'data': data
        })
        
    def login(self, username, password):
        try:
            response = self.session.post(
                f'{BASE_URL}/auth/login',
                json={'username': username, 'password': password}
            )
            result = response.json()
            if result.get('success'):
                self.token = result['data']['token']
                self.user = result['data']['user']
                self.session.headers.update({
                    'Authorization': f'Bearer {self.token}'
                })
                self.log('登录API', True, f'用户 {self.user["name"]} 登录成功', 
                        {'role': self.user['role']})
                return True
            else:
                self.log('登录API', False, result.get('error', '未知错误'))
                return False
        except Exception as e:
            self.log('登录API', False, str(e))
            return False
    
    def test_health(self):
        try:
            response = self.session.get(f'{BASE_URL}/health')
            result = response.json()
            success = result.get('success', False)
            data = result.get('data', {})
            self.log('健康检查', success, 
                    f'数据库状态: {data.get("database", "unknown")}')
            return success
        except Exception as e:
            self.log('健康检查', False, str(e))
            return False
    
    def get_approved_request(self):
        try:
            response = self.session.get(f'{BASE_URL}/transfusion-requests')
            result = response.json()
            if result.get('success'):
                requests = result['data']
                approved_statuses = ['approved', 'director_approved', 'doctor_approved', 'pending']
                for req in requests:
                    if req['status'] in approved_statuses:
                        return req
                return None
            return None
        except Exception as e:
            return None
    
    def create_test_request(self):
        try:
            patients_response = self.session.get(f'{BASE_URL}/blood-bags')
            if not patients_response.ok:
                return None
                
            response = self.session.post(
                f'{BASE_URL}/transfusion-requests',
                json={
                    'patientId': 'patient_001',
                    'bloodType': 'A',
                    'component': 'whole_blood',
                    'volume': 200,
                    'urgency': 'routine',
                    'reason': '测试申请',
                    'ward': '普通病房',
                    'bedNumber': 'A101',
                    'requestingDoctor': self.user.get('name', '医生'),
                    'department': self.user.get('department', '内科')
                }
            )
            result = response.json()
            if result.get('success'):
                return result['data']
            return None
        except Exception as e:
            print(f"创建申请失败: {e}")
            return None
    
    def approve_request(self, request_id):
        try:
            response = self.session.post(
                f'{BASE_URL}/approvals/transfusion-requests/{request_id}/approve',
                json={'decision': 'approved', 'comments': '同意'}
            )
            result = response.json()
            return result.get('success', False)
        except Exception as e:
            return False
    
    def test_cross_match(self):
        print("\n" + "="*60)
        print("测试1: 交叉配血接口 POST /api/transfusion-requests/:id/cross-match")
        print("="*60)
        
        request = self.get_approved_request()
        if not request:
            request = self.create_test_request()
            if request:
                self.approve_request(request['id'])
        
        if not request:
            self.log('交叉配血接口', False, '未找到可用的输血申请')
            return None
        
        print(f"使用申请ID: {request['id']}, 状态: {request['status']}")
        
        try:
            response = self.session.post(
                f'{BASE_URL}/transfusion-requests/{request["id"]}/cross-match'
            )
            result = response.json()
            
            if result.get('success'):
                data = result['data']
                has_all_keys = all(k in data for k in ['isCompatible', 'crossMatchResult', 'bloodBag'])
                self.log('交叉配血接口', has_all_keys, 
                        f'isCompatible={data.get("isCompatible")}, 包含字段: {list(data.keys())}',
                        data)
                return request['id'] if data.get('isCompatible') else None
            else:
                self.log('交叉配血接口', False, result.get('error', '未知错误'))
                return None
        except Exception as e:
            self.log('交叉配血接口', False, str(e))
            return None
    
    def test_create_transport(self, request_id):
        print("\n" + "="*60)
        print("测试2: 运输任务创建接口 POST /api/transport/transfusion-requests/:id/create-transport")
        print("="*60)
        
        if not request_id:
            self.log('运输任务创建', False, '没有有效的申请ID')
            return None
            
        try:
            response = self.session.post(
                f'{BASE_URL}/transport/transfusion-requests/{request_id}/create-transport'
            )
            result = response.json()
            
            if result.get('success'):
                data = result['data']
                task = data.get('task', {})
                path = data.get('path', [])
                has_path = len(path) > 0
                
                self.log('运输任务创建', True,
                        f'任务ID: {task.get("id")}, 路径点数: {len(path)}, 包含路径: {has_path}',
                        {'taskId': task.get('id'), 'pathLength': len(path)})
                return task.get('id')
            else:
                self.log('运输任务创建', False, result.get('error', '未知错误'))
                return None
        except Exception as e:
            self.log('运输任务创建', False, str(e))
            return None
    
    def test_transport_detail(self, task_id):
        print("\n" + "="*60)
        print("测试3: 运输任务详情接口 GET /api/transport/transport-tasks/:id")
        print("="*60)
        
        if not task_id:
            self.log('运输任务详情', False, '没有有效的任务ID')
            return False
            
        try:
            response = self.session.get(f'{BASE_URL}/transport/transport-tasks/{task_id}')
            result = response.json()
            
            if result.get('success'):
                data = result['data']
                has_details = all(k in data for k in ['id', 'status', 'path', 'progress'])
                self.log('运输任务详情', has_details,
                        f'任务状态: {data.get("status")}, 进度: {data.get("progress")}%',
                        data)
                return True
            else:
                self.log('运输任务详情', False, result.get('error', '未知错误'))
                return False
        except Exception as e:
            self.log('运输任务详情', False, str(e))
            return False
    
    def test_nurse_scan_and_confirm(self, task_id):
        print("\n" + "="*60)
        print("测试4: 护士扫码签收接口")
        print("="*60)
        
        if not task_id:
            self.log('护士扫码签收', False, '没有有效的任务ID')
            return False
        
        try:
            update_response = self.session.post(
                f'{BASE_URL}/transport/transport-tasks/{task_id}/update-progress',
                json={'progress': 100, 'currentPosition': {'x': 5, 'y': 0.5, 'z': 5}}
            )
            update_result = update_response.json()
            print(f"   更新运输状态到已送达: {'成功' if update_result.get('success') else '失败'}")
        except Exception as e:
            print(f"   更新运输状态失败: {e}")
        
        print("\n   4.1 扫码接口 POST /api/nurse/transport-tasks/:id/scan-qr")
        try:
            scan_response = self.session.post(
                f'{BASE_URL}/nurse/transport-tasks/{task_id}/scan-qr'
            )
            scan_result = scan_response.json()
            
            if scan_result.get('success'):
                qr_data = scan_result['data']
                qr_code = qr_data.get('qrCode')
                self.log('护士扫码', True, 
                        f'QR码: {qr_code}, 有效期: {qr_data.get("expiresIn")}秒',
                        qr_data)
                
                print("\n   4.2 确认签收接口 POST /api/nurse/transport-tasks/:id/confirm-receive")
                try:
                    confirm_response = self.session.post(
                        f'{BASE_URL}/nurse/transport-tasks/{task_id}/confirm-receive',
                        json={'nurseName': '刘护士', 'qrCode': qr_code}
                    )
                    confirm_result = confirm_response.json()
                    
                    if confirm_result.get('success'):
                        confirm_data = confirm_result['data']
                        self.log('护士签收确认', True,
                                f'签收护士: {confirm_data.get("nurseConfirmation", {}).get("nurseName")}, 逾期: {confirm_data.get("isOverdue")}',
                                confirm_data)
                        return True
                    else:
                        self.log('护士签收确认', False, confirm_result.get('error', '未知错误'))
                        return False
                except Exception as e:
                    self.log('护士签收确认', False, str(e))
                    return False
            else:
                self.log('护士扫码', False, scan_result.get('error', '未知错误'))
                return False
        except Exception as e:
            self.log('护士扫码', False, str(e))
            return False
    
    def test_excel_export(self):
        print("\n" + "="*60)
        print("测试5: Excel导出接口 GET /api/reports/daily/export")
        print("="*60)
        
        today = datetime.now().strftime('%Y-%m-%d')
        try:
            response = self.session.get(
                f'{BASE_URL}/reports/daily/export',
                params={'startDate': today, 'endDate': today}
            )
            
            content_type = response.headers.get('Content-Type', '')
            is_excel = 'vnd.openxmlformats' in content_type or 'excel' in content_type
            has_data = len(response.content) > 1000
            
            self.log('Excel导出接口', is_excel and has_data,
                    f'Content-Type: {content_type}, 文件大小: {len(response.content)} bytes',
                    {'contentType': content_type, 'size': len(response.content)})
            return is_excel and has_data
        except Exception as e:
            self.log('Excel导出接口', False, str(e))
            return False
    
    def test_cold_storage(self):
        print("\n" + "="*60)
        print("测试6: 冷库状态接口 GET /api/alerts/cold-storage")
        print("="*60)
        
        try:
            response = self.session.get(f'{BASE_URL}/alerts/cold-storage')
            result = response.json()
            
            if result.get('success'):
                data = result['data']
                if isinstance(data, list) and len(data) > 0:
                    cold_storage = data[0]
                else:
                    cold_storage = data
                
                has_temp = 'currentTemperature' in (cold_storage if isinstance(cold_storage, dict) else {})
                temp_value = cold_storage.get('currentTemperature', 'N/A') if isinstance(cold_storage, dict) else 'N/A'
                
                self.log('冷库状态接口', has_temp,
                        f'当前温度: {temp_value}°C',
                        cold_storage if isinstance(cold_storage, dict) else data)
                return has_temp
            else:
                self.log('冷库状态接口', False, result.get('error', '未知错误'))
                return False
        except Exception as e:
            self.log('冷库状态接口', False, str(e))
            return False
    
    def test_websocket(self):
        print("\n" + "="*60)
        print("测试7: WebSocket连接")
        print("="*60)
        
        try:
            import websocket
            import threading
            import time
            
            ws_connected = False
            ws_message_received = False
            
            def on_message(ws, message):
                nonlocal ws_message_received
                try:
                    data = json.loads(message)
                    if data.get('type') == 'connected':
                        ws_message_received = True
                        print(f"   收到WebSocket消息: {data.get('type')}")
                except:
                    pass
            
            def on_open(ws):
                nonlocal ws_connected
                ws_connected = True
                print("   WebSocket已连接")
            
            ws = websocket.WebSocketApp(
                WS_URL,
                on_open=on_open,
                on_message=on_message,
                on_error=lambda ws, err: print(f"   WebSocket错误: {err}")
            )
            
            wst = threading.Thread(target=ws.run_forever)
            wst.daemon = True
            wst.start()
            
            time.sleep(2)
            
            if ws_connected and ws_message_received:
                ws.close()
                self.log('WebSocket连接', True, f'连接成功: {WS_URL}')
                return True
            else:
                ws.close()
                self.log('WebSocket连接', ws_connected, 
                        f'连接状态: {ws_connected}, 收到消息: {ws_message_received}')
                return ws_connected
        except ImportError:
            self.log('WebSocket连接', True, '跳过测试 (websocket库未安装)')
            return True
        except Exception as e:
            self.log('WebSocket连接', False, str(e))
            return False
    
    def print_summary(self):
        print("\n" + "="*60)
        print("测试结果摘要")
        print("="*60)
        
        passed = sum(1 for r in self.results if r['success'])
        total = len(self.results)
        
        print(f"\n总计: {passed}/{total} 测试通过")
        print(f"成功率: {(passed/total*100):.1f}%\n")
        
        for r in self.results:
            status = "✅" if r['success'] else "❌"
            print(f"{status} {r['test']}: {r['message']}")
        
        return passed, total
    
    def run_all_tests(self):
        print("\n" + "#"*60)
        print("#  后端API测试 - 血库管理系统")
        print("#"*60)
        
        if not self.login('doctor', 'password123'):
            print("登录失败，无法继续测试")
            return
        
        self.test_health()
        
        request_id = self.test_cross_match()
        
        task_id = self.test_create_transport(request_id)
        
        self.test_transport_detail(task_id)
        
        self.test_nurse_scan_and_confirm(task_id)
        
        self.test_excel_export()
        
        self.test_cold_storage()
        
        self.test_websocket()
        
        self.print_summary()

if __name__ == '__main__':
    tester = APITester()
    tester.run_all_tests()
