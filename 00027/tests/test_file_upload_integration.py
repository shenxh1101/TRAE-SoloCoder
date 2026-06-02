#!/usr/bin/env python3
import sys
import os
import io
import json
import zipfile
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import unittest
from app import app


class TestFileUploadIntegration(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        app.config['DEBUG'] = False
        self.client = app.test_client()
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def create_test_file(self, filename, content):
        return (io.BytesIO(content.encode('utf-8')), filename)

    def test_health_check(self):
        """测试健康检查接口"""
        response = self.client.get('/api/health')
        data = response.get_json()
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(data['success'])
        self.assertEqual(data['status'], 'running')

    def test_get_formats(self):
        """测试获取支持的格式列表"""
        response = self.client.get('/api/formats')
        data = response.get_json()
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(data['success'])
        self.assertIn('json', data['formats'])
        self.assertIn('yaml', data['formats'])
        self.assertIn('xml', data['formats'])
        self.assertIn('ini', data['formats'])

    def test_file_upload_json_to_yaml(self):
        """测试上传JSON文件转换为YAML - 自动检测格式"""
        print("\n" + "="*60)
        print("测试: 上传JSON文件 -> YAML (自动检测格式)")
        print("="*60)
        
        json_content = json.dumps({
            "name": "TestApp",
            "version": "1.0.0",
            "database": {
                "host": "localhost",
                "port": 5432,
                "credentials": {
                    "username": "admin",
                    "password": "secret"
                }
            },
            "features": ["auth", "logging", "cache"]
        }, indent=2)
        
        data = {
            'file': self.create_test_file('config.json', json_content),
            'target_format': 'yaml',
            'include_content': 'true'
        }
        
        response = self.client.post(
            '/api/convert',
            data=data,
            content_type='multipart/form-data'
        )
        
        result = response.get_json()
        
        print(f"响应状态: {response.status_code}")
        print(f"成功: {result.get('success')}")
        print(f"源格式: {result.get('source_format')}")
        print(f"目标格式: {result.get('target_format')}")
        print(f"输出文件名: {result.get('filename')}")
        print(f"下载链接: {result.get('download_url')}")
        print("\n转换结果:")
        print(result.get('result')[:500])
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(result['success'])
        self.assertEqual(result['source_format'], 'json')
        self.assertEqual(result['target_format'], 'yaml')
        self.assertEqual(result['filename'], 'config.yaml')
        self.assertIn('name:', result['result'])
        self.assertIn('database:', result['result'])
        self.assertIn('TestApp', result['result'])
        
        print("\n✅ JSON文件上传转换测试通过")
        return True

    def test_file_upload_yaml_to_json(self):
        """测试上传YAML文件转换为JSON"""
        print("\n" + "="*60)
        print("测试: 上传YAML文件 -> JSON")
        print("="*60)
        
        yaml_content = """name: TestApp
version: "2.0"
database:
  host: localhost
  port: 3306
enabled: true
"""
        
        data = {
            'file': self.create_test_file('app_config.yaml', yaml_content),
            'target_format': 'json',
            'include_content': 'true'
        }
        
        response = self.client.post(
            '/api/convert',
            data=data,
            content_type='multipart/form-data'
        )
        
        result = response.get_json()
        
        print(f"响应状态: {response.status_code}")
        print(f"成功: {result.get('success')}")
        print(f"源格式: {result.get('source_format')}")
        print(f"输出文件名: {result.get('filename')}")
        print("\n转换结果:")
        print(result.get('result')[:300])
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(result['success'])
        self.assertEqual(result['source_format'], 'yaml')
        self.assertEqual(result['filename'], 'app_config.json')
        
        parsed_result = json.loads(result['result'])
        self.assertEqual(parsed_result['name'], 'TestApp')
        self.assertEqual(parsed_result['version'], '2.0')
        self.assertTrue(parsed_result['enabled'])
        
        print("\n✅ YAML文件上传转换测试通过")
        return True

    def test_file_upload_xml_to_yaml(self):
        """测试上传XML文件转换为YAML"""
        print("\n" + "="*60)
        print("测试: 上传XML文件 -> YAML")
        print("="*60)
        
        xml_content = """<?xml version="1.0" encoding="UTF-8"?>
<config>
  <app>
    <name>MyApp</name>
    <version>1.0.0</version>
  </app>
  <database>
    <host>localhost</host>
    <port>5432</port>
  </database>
</config>
"""
        
        data = {
            'file': self.create_test_file('config.xml', xml_content),
            'target_format': 'yaml',
            'include_content': 'true'
        }
        
        response = self.client.post(
            '/api/convert',
            data=data,
            content_type='multipart/form-data'
        )
        
        result = response.get_json()
        
        print(f"响应状态: {response.status_code}")
        print(f"成功: {result.get('success')}")
        print(f"源格式: {result.get('source_format')}")
        print(f"输出文件名: {result.get('filename')}")
        print("\n转换结果:")
        print(result.get('result')[:300])
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(result['success'])
        self.assertEqual(result['source_format'], 'xml')
        self.assertIn('MyApp', result['result'])
        
        print("\n✅ XML文件上传转换测试通过")
        return True

    def test_file_upload_ini_to_json(self):
        """测试上传INI文件转换为JSON"""
        print("\n" + "="*60)
        print("测试: 上传INI文件 -> JSON")
        print("="*60)
        
        ini_content = """[general]
app_name = MyApplication
version = 2.1.0
debug = true

[database]
host = localhost
port = 3306
username = admin
"""
        
        data = {
            'file': self.create_test_file('settings.ini', ini_content),
            'target_format': 'json',
            'include_content': 'true'
        }
        
        response = self.client.post(
            '/api/convert',
            data=data,
            content_type='multipart/form-data'
        )
        
        result = response.get_json()
        
        print(f"响应状态: {response.status_code}")
        print(f"成功: {result.get('success')}")
        print(f"源格式: {result.get('source_format')}")
        print(f"输出文件名: {result.get('filename')}")
        print("\n转换结果:")
        print(result.get('result')[:300])
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(result['success'])
        self.assertEqual(result['source_format'], 'ini')
        self.assertEqual(result['filename'], 'settings.json')
        
        parsed_result = json.loads(result['result'])
        self.assertEqual(parsed_result['general']['app_name'], 'MyApplication')
        self.assertEqual(parsed_result['database']['port'], 3306)
        self.assertTrue(parsed_result['general']['debug'])
        
        print("\n✅ INI文件上传转换测试通过")
        return True

    def test_file_upload_with_template(self):
        """测试上传文件时使用转换模板"""
        print("\n" + "="*60)
        print("测试: 上传文件并使用模板 (移除空字段)")
        print("="*60)
        
        json_content = json.dumps({
            "name": "TestApp",
            "empty_field": None,
            "config": {
                "a": 1,
                "b": None,
                "c": []
            }
        })
        
        data = {
            'file': self.create_test_file('app.json', json_content),
            'target_format': 'yaml',
            'template_id': 'default_json_to_yaml_remove_null',
            'include_content': 'true'
        }
        
        response = self.client.post(
            '/api/convert',
            data=data,
            content_type='multipart/form-data'
        )
        
        result = response.get_json()
        
        print(f"响应状态: {response.status_code}")
        print(f"成功: {result.get('success')}")
        print("\n转换结果 (已移除null):")
        print(result.get('result'))
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(result['success'])
        self.assertNotIn('empty_field', result['result'])
        self.assertNotIn('b:', result['result'])
        
        print("\n✅ 文件上传使用模板测试通过")
        return True

    def test_file_upload_with_structure_changes(self):
        """测试上传文件并获取结构变化说明"""
        print("\n" + "="*60)
        print("测试: 上传文件并获取结构变化说明")
        print("="*60)
        
        json_content = json.dumps({
            "name": "Test",
            "value": 123,
            "nested": {
                "level1": {
                    "level2": "deep"
                }
            }
        })
        
        data = {
            'file': self.create_test_file('nested.json', json_content),
            'target_format': 'ini',
            'include_structure': 'true',
            'include_content': 'true'
        }
        
        response = self.client.post(
            '/api/convert',
            data=data,
            content_type='multipart/form-data'
        )
        
        result = response.get_json()
        
        print(f"响应状态: {response.status_code}")
        print(f"成功: {result.get('success')}")
        print(f"是否包含结构变化: {'structure_changes' in result}")
        
        if 'structure_changes' in result:
            print("\n格式转换说明:")
            for note in result['structure_changes']['format_notes'][:3]:
                print(f"  - {note}")
            
            if result['structure_changes']['changes']:
                print("\n检测到的结构变化:")
                for change in result['structure_changes']['changes']:
                    print(f"  [{change['type']}] {change['path']}: {change['description']}")
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(result['success'])
        self.assertIn('structure_changes', result)
        self.assertIn('format_notes', result['structure_changes'])
        
        print("\n✅ 结构变化说明测试通过")
        return True

    def test_file_upload_validation(self):
        """测试上传文件的语法校验"""
        print("\n" + "="*60)
        print("测试: 上传文件的语法校验")
        print("="*60)
        
        invalid_json = '{"name": "test", "value": 123'
        
        data = {
            'file': self.create_test_file('invalid.json', invalid_json),
            'target_format': 'yaml'
        }
        
        response = self.client.post(
            '/api/convert',
            data=data,
            content_type='multipart/form-data'
        )
        
        result = response.get_json()
        
        print(f"响应状态: {response.status_code}")
        print(f"成功: {result.get('success')}")
        print(f"错误信息: {result.get('error')}")
        
        self.assertEqual(response.status_code, 400)
        self.assertFalse(result['success'])
        self.assertIn('源文件语法错误', result['error'])
        
        print("\n✅ 语法校验测试通过")
        return True

    def test_file_upload_preserve_comments(self):
        """测试上传带注释的文件并保留注释"""
        print("\n" + "="*60)
        print("测试: 上传带注释的YAML文件并保留注释")
        print("="*60)
        
        yaml_content = """# 应用配置
# 版本 1.0
name: TestApp
version: "1.0"

# 数据库配置
database:
  # 主机地址
  host: localhost
  port: 3306
"""
        
        data = {
            'file': self.create_test_file('config.yaml', yaml_content),
            'target_format': 'yaml',
            'preserve_comments': 'true',
            'include_content': 'true'
        }
        
        response = self.client.post(
            '/api/convert',
            data=data,
            content_type='multipart/form-data'
        )
        
        result = response.get_json()
        
        print(f"响应状态: {response.status_code}")
        print(f"成功: {result.get('success')}")
        print("\n转换结果 (保留注释):")
        print(result.get('result'))
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(result['success'])
        self.assertIn('应用配置', result['result'])
        self.assertIn('数据库配置', result['result'])
        self.assertIn('主机地址', result['result'])
        
        print("\n✅ 注释保留测试通过")
        return True

    def test_file_upload_manual_format(self):
        """测试手动指定源格式（无扩展名文件）"""
        print("\n" + "="*60)
        print("测试: 手动指定源格式 (无扩展名文件)")
        print("="*60)
        
        json_content = json.dumps({"name": "Test", "value": 123})
        
        data = {
            'file': self.create_test_file('config_file', json_content),
            'source_format': 'json',
            'target_format': 'yaml',
            'include_content': 'true'
        }
        
        response = self.client.post(
            '/api/convert',
            data=data,
            content_type='multipart/form-data'
        )
        
        result = response.get_json()
        
        print(f"响应状态: {response.status_code}")
        print(f"成功: {result.get('success')}")
        print(f"源格式: {result.get('source_format')}")
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(result['success'])
        self.assertEqual(result['source_format'], 'json')
        
        print("\n✅ 手动指定格式测试通过")
        return True

    def test_file_upload_no_file(self):
        """测试未上传文件的错误处理"""
        print("\n" + "="*60)
        print("测试: 未上传文件的错误处理")
        print("="*60)
        
        data = {
            'target_format': 'yaml'
        }
        
        response = self.client.post(
            '/api/convert',
            data=data,
            content_type='multipart/form-data'
        )
        
        result = response.get_json()
        
        print(f"响应状态: {response.status_code}")
        print(f"成功: {result.get('success')}")
        print(f"错误信息: {result.get('error')}")
        
        self.assertEqual(response.status_code, 400)
        self.assertFalse(result['success'])
        
        print("\n✅ 错误处理测试通过")
        return True

    def test_batch_convert_zip_upload(self):
        """测试批量转换 - 上传ZIP文件"""
        print("\n" + "="*60)
        print("测试: 批量转换 - 上传ZIP文件")
        print("="*60)
        
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w') as zf:
            zf.writestr("app.json", json.dumps({"name": "App1", "version": "1.0"}))
            zf.writestr("configs/settings.yaml", "name: Settings\nvalue: 123")
            zf.writestr("configs/database/creds.ini", "[db]\nhost = localhost")
            zf.writestr("README.txt", "This is readme")
        
        zip_buffer.seek(0)
        
        data = {
            'file': (zip_buffer, 'configs.zip'),
            'target_format': 'json'
        }
        
        response = self.client.post(
            '/api/batch-convert',
            data=data,
            content_type='multipart/form-data'
        )
        
        result = response.get_json()
        
        print(f"响应状态: {response.status_code}")
        print(f"成功: {result.get('success')}")
        print(f"总文件数: {result.get('total_files')}")
        print(f"转换成功: {result.get('converted_count')}")
        print(f"下载链接: {result.get('download_url')}")
        
        print("\n转换文件列表:")
        for f in result.get('converted_files', []):
            print(f"  {f.get('original_path')} -> {f.get('output_path')}")
        
        print("\n跳过的文件:")
        for f in result.get('skipped_files', []):
            print(f"  {f.get('original_path')}: {f.get('error')}")
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(result['success'])
        self.assertEqual(result['total_files'], 4)
        self.assertEqual(result['converted_count'], 2)
        self.assertIsNotNone(result.get('download_url'))
        
        output_paths = [f['output_path'] for f in result['converted_files']]
        self.assertIn('configs/settings.json', output_paths)
        self.assertIn('configs/database/creds.json', output_paths)
        
        skipped_paths = [f['original_path'] for f in result['skipped_files']]
        self.assertIn('app.json', skipped_paths)
        self.assertIn('README.txt', skipped_paths)
        
        print("\n✅ ZIP批量转换测试通过")
        return True

    def test_batch_convert_zip_directory_structure(self):
        """测试ZIP批量转换时目录结构保持完整"""
        print("\n" + "="*60)
        print("测试: ZIP批量转换 - 目录结构保持完整")
        print("="*60)
        
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w') as zf:
            zf.writestr("a/b/c/d/deep.json", json.dumps({"deep": True}))
            zf.writestr("root.yaml", "root: true")
            zf.writestr("level1/level2/level3/nested.ini", "[section]\nkey=value")
            zf.writestr("other/notes.txt", "some notes")
        
        zip_buffer.seek(0)
        
        data = {
            'file': (zip_buffer, 'deep_configs.zip'),
            'target_format': 'yaml'
        }
        
        response = self.client.post(
            '/api/batch-convert',
            data=data,
            content_type='multipart/form-data'
        )
        
        result = response.get_json()
        
        print(f"响应状态: {response.status_code}")
        print(f"成功: {result.get('success')}")
        
        print("\n转换后的文件结构:")
        all_files = result['converted_files'] + result['skipped_files']
        for f in sorted(all_files, key=lambda x: x['original_path']):
            status = "✓" if f['status'] == 'converted' else "○"
            print(f"  {status} {f.get('original_path')} -> {f.get('output_path')}")
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(result['success'])
        self.assertEqual(result['total_files'], 4)
        self.assertEqual(result['converted_count'], 2)
        
        output_paths = [f['output_path'] for f in result['converted_files']]
        self.assertIn('a/b/c/d/deep.yaml', output_paths)
        self.assertIn('level1/level2/level3/nested.yaml', output_paths)
        
        skipped_paths = [f['output_path'] for f in result['skipped_files']]
        self.assertIn('root.yaml', skipped_paths)
        self.assertIn('other/notes.txt', skipped_paths)
        
        print("\n✅ ZIP目录结构保持测试通过")
        return True

    def test_download_converted_file(self):
        """测试下载转换后的文件"""
        print("\n" + "="*60)
        print("测试: 下载转换后的文件")
        print("="*60)
        
        json_content = json.dumps({"name": "Test", "value": 123})
        
        data = {
            'file': self.create_test_file('test.json', json_content),
            'target_format': 'yaml',
            'include_content': 'true'
        }
        
        response = self.client.post(
            '/api/convert',
            data=data,
            content_type='multipart/form-data'
        )
        
        result = response.get_json()
        download_url = result.get('download_url')
        
        print(f"下载URL: {download_url}")
        
        self.assertIsNotNone(download_url)
        
        download_response = self.client.get(download_url)
        
        print(f"下载响应状态: {download_response.status_code}")
        print(f"内容长度: {len(download_response.data)}")
        
        self.assertEqual(download_response.status_code, 200)
        self.assertIn(b'name:', download_response.data)
        self.assertIn(b'Test', download_response.data)
        
        print("\n✅ 文件下载测试通过")
        return True


if __name__ == '__main__':
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestFileUploadIntegration)
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n" + "="*60)
    print(f"集成测试总结: 通过 {result.testsRun - len(result.failures) - len(result.errors)}/{result.testsRun}")
    print(f"  失败: {len(result.failures)}")
    print(f"  错误: {len(result.errors)}")
    print("="*60)
    
    sys.exit(0 if result.wasSuccessful() else 1)
