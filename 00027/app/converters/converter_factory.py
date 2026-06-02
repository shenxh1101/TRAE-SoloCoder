from typing import Dict, Type, Optional
from .base_converter import BaseConverter
from .json_converter import JSONConverter
from .yaml_converter import YAMLConverter
from .xml_converter import XMLConverter
from .ini_converter import INIConverter


class ConverterFactory:
    _converters: Dict[str, Type[BaseConverter]] = {}
    _extension_map: Dict[str, str] = {}

    @classmethod
    def register(cls, converter_class: Type[BaseConverter]):
        cls._converters[converter_class.format_name] = converter_class
        for ext in converter_class.file_extensions:
            cls._extension_map[ext] = converter_class.format_name

    @classmethod
    def get_converter(cls, format_name: str) -> Optional[BaseConverter]:
        format_name = format_name.lower()
        converter_class = cls._converters.get(format_name)
        if converter_class:
            return converter_class()
        return None

    @classmethod
    def get_format_by_extension(cls, extension: str) -> Optional[str]:
        return cls._extension_map.get(extension.lower())

    @classmethod
    def get_supported_formats(cls) -> Dict[str, Dict]:
        formats = {}
        for name, converter_class in cls._converters.items():
            formats[name] = {
                'name': name,
                'extensions': converter_class.file_extensions,
                'supports_comments': converter_class.supports_comments
            }
        return formats


ConverterFactory.register(JSONConverter)
ConverterFactory.register(YAMLConverter)
ConverterFactory.register(XMLConverter)
ConverterFactory.register(INIConverter)
