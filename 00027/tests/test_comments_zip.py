#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import zipfile
import tempfile
import shutil
from app.converters.yaml_converter import YAMLConverter
from app.converters.ini_converter import INIConverter
from app.converters.xml_converter import XMLConverter
from app.converters.json_converter import JSONConverter
from app.utils.conversion_manager import ConversionManager
from app.utils.batch_converter import BatchConverter


def test_yaml_comment_preservation():
    """测试YAML注释保留"""
    print("=" * 60)
    print("测试: YAML注释保留")
    print("=" * 60)
    
    yaml_content = """# 应用配置
# 版本 1.0
name: 我的应用
version: "1.0"

# 数据库配置
database:
  # 主机地址
  host: localhost
  # 端口号
  port: 3306
  # 用户名
  username: admin
"""
    
    converter = YAMLConverter()
    data, comments = converter.load(yaml_content)
    print(f"提取到 {len(comments)} 条注释")
    for c in comments:
        print(f"  - path={c.get('path')}: {c.get('content')}")
    
    result = converter.dump(data, comments, preserve_comments=True)
    print("\n转换后的YAML (保留注释):")
    print(result)
    
    expected_comments = ["应用配置", "版本 1.0", "数据库配置", "主机地址", "端口号", "用户名"]
    found_comments = [c['content'] for c in comments]
    for expected in expected_comments:
        assert expected in found_comments, f"丢失注释: {expected}"
        assert expected in result, f"注释未在输出中: {expected}"
    
    print("\n✅ YAML注释保留测试通过\n")
    return True


def test_ini_comment_preservation():
    """测试INI注释保留"""
    print("=" * 60)
    print("测试: INI注释保留")
    print("=" * 60)
    
    ini_content = """; 全局配置
; 应用配置文件
[general]
; 应用名称
app_name = MyApp
; 应用版本
app_version = 1.0.0

[database]
; 数据库主机
host = localhost
; 数据库端口
port = 3306
"""
    
    converter = INIConverter()
    data, comments = converter.load(ini_content)
    print(f"提取到 {len(comments)} 条注释")
    for c in comments:
        print(f"  - path={c.get('path')}: {c.get('content')}")
    
    result = converter.dump(data, comments, preserve_comments=True)
    print("\n转换后的INI (保留注释):")
    print(result)
    
    expected_comments = ["全局配置", "应用配置文件", "应用名称", "应用版本", "数据库主机", "数据库端口"]
    found_comments = [c['content'] for c in comments]
    for expected in expected_comments:
        assert expected in found_comments, f"丢失注释: {expected}"
        assert expected in result, f"注释未在输出中: {expected}"
    
    print("\n✅ INI注释保留测试通过\n")
    return True


def test_xml_comment_preservation():
    """测试XML注释保留"""
    print("=" * 60)
    print("测试: XML注释保留")
    print("=" * 60)
    
    xml_content = """<?xml version="1.0" encoding="UTF-8"?>
<!-- 应用配置 -->
<!-- 版本 1.0 -->
<config>
  <name>MyApp</name>
  <!-- 数据库配置 -->
  <database>
    <host>localhost</host>
    <port>3306</port>
  </database>
</config>
"""
    
    converter = XMLConverter()
    data, comments = converter.load(xml_content)
    print(f"提取到 {len(comments)} 条注释")
    for c in comments:
        print(f"  - line={c.get('line')}: {c.get('content')}")
    
    result = converter.dump(data, comments, preserve_comments=True)
    print("\n转换后的XML (保留注释):")
    print(result)
    
    expected_comments = ["应用配置", "版本 1.0", "数据库配置"]
    found_comments = [c['content'] for c in comments]
    for expected in expected_comments:
        assert expected in found_comments, f"丢失注释: {expected}"
    
    print("\n✅ XML注释保留测试通过\n")
    return True


def test_comment_preservation_during_conversion():
    """测试跨格式转换时的注释保留"""
    print("=" * 60)
    print("测试: 跨格式转换时的注释保留")
    print("=" * 60)
    
    yaml_content = """# 应用配置
name: MyApp
version: "1.0"
# 数据库配置
database:
  # 主机地址
  host: localhost
  port: 3306
"""
    
    print("源YAML:")
    print(yaml_content)
    
    result = ConversionManager.convert(
        yaml_content, 'yaml', 'yaml', {'preserve_comments': True}
    )
    
    print("转换结果 (YAML -> YAML, 保留注释):")
    print(result['result'])
    
    assert "应用配置" in result['result'], "丢失注释: 应用配置"
    assert "数据库配置" in result['result'], "丢失注释: 数据库配置"
    assert "主机地址" in result['result'], "丢失注释: 主机地址"
    
    print("\n✅ 跨格式转换注释保留测试通过\n")
    return True


def test_zip_batch_conversion_directory_structure():
    """测试ZIP批量转换时目录结构保持完整"""
    print("=" * 60)
    print("测试: ZIP批量转换 - 目录结构保持")
    print("=" * 60)
    
    temp_dir = tempfile.mkdtemp()
    try:
        zip_path = os.path.join(temp_dir, "test_configs.zip")
        output_dir = os.path.join(temp_dir, "output")
        os.makedirs(output_dir)
        
        with zipfile.ZipFile(zip_path, 'w') as zf:
            zf.writestr("config.json", json.dumps({"name": "root", "value": 1}))
            zf.writestr("subdir1/config1.json", json.dumps({"name": "sub1"}))
            zf.writestr("subdir1/config2.yaml", "name: sub2\nvalue: 2")
            zf.writestr("subdir2/nested/config3.json", json.dumps({"name": "nested"}))
            zf.writestr("README.txt", "This is a readme file")
        
        print("创建测试ZIP包:")
        with zipfile.ZipFile(zip_path, 'r') as zf:
            for name in zf.namelist():
                print(f"  - {name}")
        
        print("\n执行批量转换 (JSON -> YAML)...")
        result = BatchConverter.convert_zip(zip_path, 'yaml', output_dir, {})
        
        print(f"\n转换结果:")
        print(f"  总文件数: {result['total_files']}")
        print(f"  转换成功: {result['converted_count']}")
        print(f"  失败: {len(result['failed_files'])}")
        print(f"  跳过: {len(result['skipped_files'])}")
        
        print("\n转换后的文件结构:")
        with zipfile.ZipFile(result['output_zip_path'], 'r') as zf:
            for name in zf.namelist():
                print(f"  - {name}")
        
        expected_files = [
            "config.yaml",
            "subdir1/config1.yaml",
            "subdir1/config2.yaml",
            "subdir2/nested/config3.yaml",
            "README.txt"
        ]
        
        with zipfile.ZipFile(result['output_zip_path'], 'r') as zf:
            output_files = zf.namelist()
            for expected in expected_files:
                assert expected in output_files, f"缺少文件: {expected}"
        
        assert result['total_files'] == 5, f"期望5个文件, 实际{result['total_files']}"
        assert result['converted_count'] == 3, f"期望转换3个文件, 实际{result['converted_count']}"
        assert result['success'], "转换失败"
        
        print("\n✅ ZIP批量转换目录结构测试通过\n")
        return True
        
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_zip_batch_conversion_with_subdirs():
    """测试更深层的目录结构"""
    print("=" * 60)
    print("测试: ZIP批量转换 - 深层目录结构")
    print("=" * 60)
    
    temp_dir = tempfile.mkdtemp()
    try:
        zip_path = os.path.join(temp_dir, "test_deep.zip")
        output_dir = os.path.join(temp_dir, "output")
        os.makedirs(output_dir)
        
        with zipfile.ZipFile(zip_path, 'w') as zf:
            zf.writestr("a/b/c/d/e/deep.json", json.dumps({"deep": True}))
            zf.writestr("root.yaml", "root: true")
            zf.writestr("level1/level2/level3/nested.ini", "[section]\nkey=value")
        
        print("创建深层目录测试ZIP包...")
        
        result = BatchConverter.convert_zip(zip_path, 'json', output_dir, {})
        
        print(f"转换结果: 成功={result['success']}, 转换数={result['converted_count']}")
        
        print("\n转换后的文件结构:")
        with zipfile.ZipFile(result['output_zip_path'], 'r') as zf:
            for name in sorted(zf.namelist()):
                print(f"  - {name}")
        
        expected_files = [
            "a/b/c/d/e/deep.json",
            "root.json",
            "level1/level2/level3/nested.json"
        ]
        
        with zipfile.ZipFile(result['output_zip_path'], 'r') as zf:
            output_files = zf.namelist()
            for expected in expected_files:
                assert expected in output_files, f"缺少文件: {expected}"
        
        print("\n✅ 深层目录结构测试通过\n")
        return True
        
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_file_upload_conversion():
    """测试文件上传转换 (模拟multipart/form-data)"""
    print("=" * 60)
    print("测试: 文件上传转换")
    print("=" * 60)
    
    from io import BytesIO
    
    json_content = json.dumps({
        "name": "TestApp",
        "version": "1.0.0",
        "database": {
            "host": "localhost",
            "port": 5432
        }
    })
    
    print("测试JSON文件内容:")
    print(json_content)
    
    result = ConversionManager.convert(
        json_content, 'json', 'yaml', {'pretty_print': True}
    )
    
    print("\n转换结果 (JSON -> YAML):")
    print(result['result'])
    
    assert result['success'], "转换失败"
    assert "name:" in result['result'], "缺少name字段"
    assert "database:" in result['result'], "缺少database字段"
    
    print("\n✅ 文件上传转换测试通过\n")
    return True


if __name__ == '__main__':
    tests = [
        test_yaml_comment_preservation,
        test_ini_comment_preservation,
        test_xml_comment_preservation,
        test_comment_preservation_during_conversion,
        test_zip_batch_conversion_directory_structure,
        test_zip_batch_conversion_with_subdirs,
        test_file_upload_conversion,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"\n❌ 测试失败: {test.__name__}")
            print(f"   错误: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print("=" * 60)
    print(f"测试总结: 通过 {passed}/{len(tests)}, 失败 {failed}")
    print("=" * 60)
    
    sys.exit(0 if failed == 0 else 1)
