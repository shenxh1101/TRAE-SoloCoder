import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import unittest
from app.converters.converter_factory import ConverterFactory
from app.utils.conversion_manager import ConversionManager
from app.utils.validator import SyntaxValidator
from app.utils.mapping_engine import MappingEngine
from app.utils.structure_mapper import StructureMapper


class TestConverters(unittest.TestCase):
    def test_json_converter(self):
        converter = ConverterFactory.get_converter('json')
        self.assertIsNotNone(converter)
        
        test_data = {"name": "test", "value": 123, "nested": {"a": 1}}
        content = json.dumps(test_data, indent=2)
        
        data, comments = converter.load(content)
        self.assertEqual(data['name'], 'test')
        self.assertEqual(data['value'], 123)
        self.assertEqual(data['nested']['a'], 1)
        
        result = converter.dump(data)
        self.assertIn('"name"', result)
        self.assertIn('"test"', result)

    def test_yaml_converter(self):
        converter = ConverterFactory.get_converter('yaml')
        self.assertIsNotNone(converter)
        
        content = """name: test
value: 123
nested:
  a: 1
"""
        data, comments = converter.load(content)
        self.assertEqual(data['name'], 'test')
        self.assertEqual(data['value'], 123)

    def test_xml_converter(self):
        converter = ConverterFactory.get_converter('xml')
        self.assertIsNotNone(converter)
        
        content = """<?xml version="1.0" encoding="UTF-8"?>
<root>
  <name>test</name>
  <value>123</value>
</root>
"""
        data, comments = converter.load(content)
        self.assertIsNotNone(data)

    def test_ini_converter(self):
        converter = ConverterFactory.get_converter('ini')
        self.assertIsNotNone(converter)
        
        content = """[general]
name = test
value = 123

[database]
host = localhost
port = 3306
"""
        data, comments = converter.load(content)
        self.assertEqual(data['general']['name'], 'test')
        self.assertEqual(data['database']['port'], 3306)


class TestConversionManager(unittest.TestCase):
    def test_json_to_yaml(self):
        json_content = '{"name": "test", "value": 123, "nested": {"a": 1}}'
        
        result = ConversionManager.convert(
            json_content, 'json', 'yaml'
        )
        
        self.assertTrue(result['success'])
        self.assertIn('name:', result['result'])
        self.assertIn('test', result['result'])
        self.assertIn('value:', result['result'])

    def test_json_to_xml(self):
        json_content = '{"name": "test", "items": [1, 2, 3]}'
        
        result = ConversionManager.convert(
            json_content, 'json', 'xml'
        )
        
        self.assertTrue(result['success'])
        self.assertIn('<name>', result['result'])

    def test_json_to_ini(self):
        json_content = '{"general": {"name": "test", "value": 123}}'
        
        result = ConversionManager.convert(
            json_content, 'json', 'ini'
        )
        
        self.assertTrue(result['success'])
        self.assertIn('[general]', result['result'])

    def test_yaml_to_json(self):
        yaml_content = """name: test
value: 123
items:
  - 1
  - 2
"""
        
        result = ConversionManager.convert(
            yaml_content, 'yaml', 'json'
        )
        
        self.assertTrue(result['success'])
        data = json.loads(result['result'])
        self.assertEqual(data['name'], 'test')

    def test_remove_null_values(self):
        json_content = '{"a": 1, "b": null, "c": {"d": 2, "e": null}}'
        
        result = ConversionManager.convert(
            json_content, 'json', 'yaml', {'remove_null': True}
        )
        
        self.assertTrue(result['success'])
        self.assertNotIn('b', result['result'])
        self.assertNotIn('e', result['result'])

    def test_structure_changes(self):
        json_content = '{"a": 1, "b": "hello", "nested": {"x": 10}}'
        
        result = ConversionManager.convert(
            json_content, 'json', 'ini'
        )
        
        self.assertIn('structure_changes', result)
        self.assertIsNotNone(result['structure_changes'])


class TestMappingEngine(unittest.TestCase):
    def test_apply_field_mapping(self):
        data = {"old_name": "value", "other": 123}
        
        mappings = [
            {"action": "rename", "source": "old_name", "target": "new_name"}
        ]
        
        result = MappingEngine.apply_field_mapping(data, mappings)
        
        self.assertIn('new_name', result)
        self.assertNotIn('old_name', result)
        self.assertEqual(result['new_name'], 'value')

    def test_execute_script(self):
        data = {"name": "Test", "value": None, "items": [1, 2, None]}
        
        script = """
result = remove_null(data)
result['name'] = upper(result['name'])
"""
        
        result = MappingEngine.execute_script(data, script)
        
        self.assertEqual(result['name'], 'TEST')
        self.assertNotIn('value', result)

    def test_validate_script_valid(self):
        script = "result = upper(data['name'])"
        valid, error = MappingEngine.validate_script(script)
        self.assertTrue(valid)

    def test_validate_script_invalid(self):
        script = "import os\nresult = os.listdir()"
        valid, error = MappingEngine.validate_script(script)
        self.assertFalse(valid)


class TestValidator(unittest.TestCase):
    def test_validate_valid_json(self):
        content = '{"name": "test", "value": 123}'
        valid, errors = SyntaxValidator.validate(content, 'json')
        self.assertTrue(valid)
        self.assertEqual(len(errors), 0)

    def test_validate_invalid_json(self):
        content = '{"name": "test", "value": 123'
        valid, errors = SyntaxValidator.validate(content, 'json')
        self.assertFalse(valid)
        self.assertGreater(len(errors), 0)

    def test_validate_valid_yaml(self):
        content = "name: test\nvalue: 123"
        valid, errors = SyntaxValidator.validate(content, 'yaml')
        self.assertTrue(valid)

    def test_format_detection(self):
        content = '{"name": "test"}'
        fmt = ConversionManager.detect_format('test.json', content)
        self.assertEqual(fmt, 'json')


class TestStructureMapper(unittest.TestCase):
    def test_analyze_structure(self):
        data = {"a": 1, "b": {"c": [1, 2, 3]}}
        structure = StructureMapper.analyze_structure(data)
        self.assertGreater(len(structure), 0)

    def test_compare_structures(self):
        source = {"a": 1, "b": 2}
        target = {"a": 1, "c": 3}
        
        result = StructureMapper.compare_structures(source, target, 'json', 'yaml')
        self.assertIn('changes', result)
        
        changes = result['changes']
        self.assertTrue(any(c['type'] == 'removed' for c in changes))
        self.assertTrue(any(c['type'] == 'added' for c in changes))

    def test_apply_path_mapping(self):
        data = {"old": {"path": "value"}}
        rules = {"old.path": "new.path"}
        
        result = StructureMapper.apply_mapping(data, rules)
        self.assertIn('new', result)
        self.assertNotIn('old', result)


if __name__ == '__main__':
    unittest.main()
