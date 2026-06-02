#!/usr/bin/env python3
import requests
import json
import os

BASE_URL = "http://localhost:5000"


def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def example_1_get_formats():
    """示例1: 获取支持的格式列表"""
    print_section("示例1: 获取支持的格式列表")
    
    response = requests.get(f"{BASE_URL}/api/formats")
    data = response.json()
    
    print(f"支持的格式: {list(data['formats'].keys())}")
    for fmt, info in data['formats'].items():
        print(f"  - {fmt}: 扩展名={info['extensions']}, 支持注释={info['supports_comments']}")


def example_2_get_conversion_matrix():
    """示例2: 获取转换矩阵"""
    print_section("示例2: 获取转换矩阵")
    
    response = requests.get(f"{BASE_URL}/api/conversion-matrix")
    data = response.json()
    
    for src, targets in data['matrix'].items():
        print(f"  {src} -> {', '.join(targets)}")


def example_3_convert_json_to_yaml():
    """示例3: JSON转YAML"""
    print_section("示例3: JSON转YAML")
    
    json_content = json.dumps({
        "name": "我的应用",
        "version": "1.0.0",
        "database": {
            "host": "localhost",
            "port": 3306,
            "username": "admin",
            "password": "secret"
        },
        "features": ["auth", "logging", "cache"],
        "debug": True
    }, indent=2)
    
    print("输入JSON:")
    print(json_content)
    print()
    
    response = requests.post(
        f"{BASE_URL}/api/convert",
        data={
            'content': json_content,
            'source_format': 'json',
            'target_format': 'yaml',
            'pretty_print': 'true',
            'include_structure': 'true'
        }
    )
    
    data = response.json()
    
    if data['success']:
        print("转换后的YAML:")
        print(data['result'])
        print()
        print("下载链接:", data['download_url'])
        print()
        
        if 'structure_changes' in data:
            print("结构变化说明:")
            for note in data['structure_changes']['format_notes']:
                print(f"  - {note}")
    else:
        print("转换失败:", data.get('error'))


def example_4_convert_with_template():
    """示例4: 使用模板转换 - JSON转YAML且移除空字段"""
    print_section("示例4: 使用模板转换 (JSON转YAML且移除空字段)")
    
    json_content = json.dumps({
        "name": "测试应用",
        "version": "1.0",
        "description": None,
        "config": {
            "a": 1,
            "b": None,
            "c": []
        },
        "empty_list": [],
        "empty_obj": {}
    }, indent=2)
    
    print("输入JSON (包含空值):")
    print(json_content)
    print()
    
    response = requests.post(
        f"{BASE_URL}/api/convert",
        data={
            'content': json_content,
            'source_format': 'json',
            'target_format': 'yaml',
            'template_id': 'default_json_to_yaml_remove_null',
            'include_structure': 'true'
        }
    )
    
    data = response.json()
    
    if data['success']:
        print("转换后的YAML (已移除null):")
        print(data['result'])
        print()
        if 'structure_changes' in data:
            changes = data['structure_changes']['changes']
            if changes:
                print("检测到的结构变化:")
                for change in changes:
                    print(f"  [{change['type']}] {change['path']}: {change['description']}")
    else:
        print("转换失败:", data.get('error'))


def example_5_convert_with_mapping_script():
    """示例5: 使用自定义映射脚本转换"""
    print_section("示例5: 使用自定义映射脚本")
    
    json_content = json.dumps({
        "app_name": "MyApp",
        "app_version": "2.0",
        "db_host": "localhost",
        "db_port": 5432,
        "features": "auth,logging,cache"
    }, indent=2)
    
    mapping_script = """
# 将扁平结构转换为嵌套结构
result = {
    'name': data['app_name'],
    'version': data['app_version'],
    'database': {
        'host': data['db_host'],
        'port': data['db_port']
    },
    'features': split(data['features'], ',')
}

# 将名称转为大写
result['name'] = upper(result['name'])
"""
    
    print("输入JSON:")
    print(json_content)
    print()
    print("映射脚本:")
    print(mapping_script)
    print()
    
    # 先验证脚本
    validate_response = requests.post(
        f"{BASE_URL}/api/validate-script",
        data={'script': mapping_script}
    )
    
    if not validate_response.json()['valid']:
        print("脚本验证失败:", validate_response.json()['error'])
        return
    
    response = requests.post(
        f"{BASE_URL}/api/convert",
        data={
            'content': json_content,
            'source_format': 'json',
            'target_format': 'yaml',
            'mapping_script': mapping_script,
            'include_structure': 'true'
        }
    )
    
    data = response.json()
    
    if data['success']:
        print("转换后的YAML:")
        print(data['result'])
    else:
        print("转换失败:", data.get('error'))


def example_6_validate_syntax():
    """示例6: 语法校验"""
    print_section("示例6: 语法校验")
    
    invalid_json = '{"name": "test", "value": 123'
    
    print("无效的JSON:")
    print(invalid_json)
    print()
    
    response = requests.post(
        f"{BASE_URL}/api/validate",
        data={
            'content': invalid_json,
            'format': 'json'
        }
    )
    
    data = response.json()
    
    if not data['valid']:
        print("检测到错误:")
        for error in data['errors']:
            print(f"  第{error['line']}行, 第{error['column']}列: {error['message']}")
            if error.get('content'):
                print(f"    内容: {error['content']}")


def example_7_list_templates():
    """示例7: 列出所有转换模板"""
    print_section("示例7: 列出所有转换模板")
    
    response = requests.get(f"{BASE_URL}/api/templates")
    data = response.json()
    
    for template in data['templates']:
        default_marker = " [默认]" if template.get('is_default') else ""
        src = template['source_format'] or '任意'
        tgt = template['target_format'] or '任意'
        print(f"  {template['id']}{default_marker}")
        print(f"    名称: {template['name']}")
        print(f"    描述: {template['description']}")
        print(f"    转换: {src} -> {tgt}")
        print()


def example_8_create_template():
    """示例8: 创建自定义转换模板"""
    print_section("示例8: 创建自定义模板")
    
    template_data = {
        'name': 'YAML转JSON压缩模式',
        'description': '将YAML转换为压缩的JSON格式，无空格缩进',
        'source_format': 'yaml',
        'target_format': 'json',
        'options': {
            'pretty_print': False,
            'indent': 0,
            'ensure_ascii': True
        }
    }
    
    response = requests.post(
        f"{BASE_URL}/api/templates",
        json=template_data
    )
    
    data = response.json()
    
    if data['success']:
        print("创建的模板:")
        print(json.dumps(data['template'], indent=2, ensure_ascii=False))
        return data['template']['id']
    else:
        print("创建失败:", data.get('error'))
        return None


def example_9_convert_yaml_to_xml_with_comments():
    """示例9: YAML转XML并保留注释"""
    print_section("示例9: YAML转XML保留注释")
    
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
    
    print("输入YAML (包含注释):")
    print(yaml_content)
    print()
    
    response = requests.post(
        f"{BASE_URL}/api/convert",
        data={
            'content': yaml_content,
            'source_format': 'yaml',
            'target_format': 'xml',
            'preserve_comments': 'true',
            'root_name': 'config'
        }
    )
    
    data = response.json()
    
    if data['success']:
        print("转换后的XML (保留注释):")
        print(data['result'])
    else:
        print("转换失败:", data.get('error'))


def example_10_get_mapping_functions():
    """示例10: 获取可用的映射函数"""
    print_section("示例10: 获取可用的映射函数")
    
    response = requests.get(f"{BASE_URL}/api/mapping-functions")
    data = response.json()
    
    print("可用的映射函数:")
    for func in data['functions']:
        print(f"  {func['signature']}")
        print(f"    {func['description']}")
        print()


def example_11_convert_with_field_mappings():
    """示例11: 使用字段映射列表转换"""
    print_section("示例11: 使用字段映射列表")
    
    json_content = json.dumps({
        "old_name": "app",
        "old_version": "1.0",
        "data": {
            "old_host": "localhost"
        }
    })
    
    field_mappings = json.dumps([
        {"action": "rename", "source": "old_name", "target": "name"},
        {"action": "rename", "source": "old_version", "target": "version"},
        {"action": "rename", "source": "data.old_host", "target": "database.host"},
        {"action": "delete", "source": "data"},
        {"action": "add", "target": "status", "value": "active"}
    ])
    
    print("输入JSON:")
    print(json_content)
    print()
    
    response = requests.post(
        f"{BASE_URL}/api/convert",
        data={
            'content': json_content,
            'source_format': 'json',
            'target_format': 'yaml',
            'field_mappings': field_mappings
        }
    )
    
    data = response.json()
    
    if data['success']:
        print("转换后的YAML:")
        print(data['result'])
    else:
        print("转换失败:", data.get('error'))


if __name__ == '__main__':
    import sys
    
    examples = [
        ('1', example_1_get_formats, '获取格式列表'),
        ('2', example_2_get_conversion_matrix, '获取转换矩阵'),
        ('3', example_3_convert_json_to_yaml, 'JSON转YAML'),
        ('4', example_4_convert_with_template, '使用模板转换'),
        ('5', example_5_convert_with_mapping_script, '使用映射脚本'),
        ('6', example_6_validate_syntax, '语法校验'),
        ('7', example_7_list_templates, '列出模板'),
        ('8', example_8_create_template, '创建模板'),
        ('9', example_9_convert_yaml_to_xml_with_comments, 'YAML转XML保留注释'),
        ('10', example_10_get_mapping_functions, '获取映射函数'),
        ('11', example_11_convert_with_field_mappings, '使用字段映射'),
    ]
    
    if len(sys.argv) > 1:
        target = sys.argv[1]
        for num, func, desc in examples:
            if num == target:
                func()
                break
    else:
        print("配置文件转换服务 - API使用示例")
        print("请确保服务已启动: python run.py")
        print()
        print("可用示例:")
        for num, func, desc in examples:
            print(f"  {num}. {desc}")
        print()
        print("运行方式: python test_api_examples.py <示例编号>")
        print("例如: python test_api_examples.py 3")
        
        print("\n" + "="*60)
        print("运行所有示例...")
        print("="*60)
        
        for num, func, desc in examples:
            try:
                func()
            except Exception as e:
                print(f"\n示例 {num} 执行失败: {e}")
