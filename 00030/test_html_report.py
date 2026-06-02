import io
import json
from app import app

app.config['TESTING'] = True
app.config['SECRET_KEY'] = 'test-secret-key'

def test_html_report_session():
    with app.test_client() as client:
        en_json = json.dumps({
            "greeting": "Hello {name}!",
            "buttons": {
                "submit": "Submit",
                "cancel": "Cancel"
            }
        }, ensure_ascii=False, indent=2)

        zh_json = json.dumps({
            "greeting": "你好 {name}！",
            "buttons": {
                "submit": "提交"
            }
        }, ensure_ascii=False, indent=2)

        data = {
            'files[]': [
                (io.BytesIO(en_json.encode('utf-8')), 'en.json'),
                (io.BytesIO(zh_json.encode('utf-8')), 'zh-CN.json')
            ],
            'base_language': 'en',
            'config': ''
        }

        print("1. 上传文件...")
        upload_resp = client.post('/api/upload', data=data, content_type='multipart/form-data')
        print(f"   上传响应: {upload_resp.status_code}")
        upload_data = upload_resp.get_json()
        print(f"   Session Cookies: {upload_resp.headers.get('Set-Cookie', 'None')}")

        print("\n2. 请求HTML报告...")
        report_resp = client.get('/api/report/html')
        print(f"   报告响应: {report_resp.status_code}")
        print(f"   Content-Type: {report_resp.headers.get('Content-Type', 'None')}")
        print(f"   Content-Disposition: {report_resp.headers.get('Content-Disposition', 'None')}")

        if report_resp.status_code == 200:
            try:
                json_data = report_resp.get_json()
                if json_data and 'error' in json_data:
                    print(f"   错误信息: {json_data['error']}")
            except:
                content = report_resp.data.decode('utf-8')
                print(f"   内容长度: {len(content)}")
                print(f"   前200字符: {content[:200]}")

        print("\n3. 再次检查上传后的session...")
        with client.session_transaction() as sess:
            print(f"   Session 中的 validation_result: {'validation_result' in sess}")
            print(f"   Session 中的 language_files: {'language_files' in sess}")

if __name__ == '__main__':
    test_html_report_session()
