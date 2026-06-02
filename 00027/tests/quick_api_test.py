import requests
import json

BASE_URL = 'http://localhost:5001'

print('1. 健康检查:')
response = requests.get(f'{BASE_URL}/api/health')
print(f'   {response.json()}')

print('\n2. 支持的格式:')
response = requests.get(f'{BASE_URL}/api/formats')
data = response.json()
print(f'   {list(data["formats"].keys())}')

print('\n3. JSON转YAML:')
json_content = json.dumps({
    'name': '测试应用',
    'version': '1.0.0',
    'database': {
        'host': 'localhost',
        'port': 3306
    }
})
response = requests.post(f'{BASE_URL}/api/convert', data={
    'content': json_content,
    'source_format': 'json',
    'target_format': 'yaml'
})
data = response.json()
if data['success']:
    print('   转换成功!')
    print('   结果:')
    for line in data['result'].split('\n')[:8]:
        print(f'      {line}')
    print(f'   下载链接: {data["download_url"]}')
else:
    print(f'   失败: {data.get("error")}')

print('\n4. 使用模板 (JSON转YAML且移除空字段):')
json_content = json.dumps({
    'name': '测试',
    'empty_value': None,
    'config': {
        'a': 1,
        'b': None
    }
})
response = requests.post(f'{BASE_URL}/api/convert', data={
    'content': json_content,
    'source_format': 'json',
    'target_format': 'yaml',
    'template_id': 'default_json_to_yaml_remove_null',
    'include_structure': 'true'
})
data = response.json()
if data['success']:
    print('   转换成功!')
    if 'structure_changes' in data and data['structure_changes']['changes']:
        print('   结构变化:')
        for change in data['structure_changes']['changes']:
            print(f'     - {change["description"]}')
else:
    print(f'   失败: {data.get("error")}')

print('\n5. 模板列表:')
response = requests.get(f'{BASE_URL}/api/templates')
data = response.json()
for t in data['templates'][:3]:
    default_marker = " [默认]" if t.get('is_default') else ""
    print(f'   {t["id"]}{default_marker}: {t["name"]}')

print('\n✅ API测试完成!')
