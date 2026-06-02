from setuptools import setup, find_packages

from depalyzer import __version__

setup(
    name="depalyzer",
    version=__version__,
    description="代码仓库依赖分析工具",
    author="Depalyzer Team",
    packages=find_packages(),
    install_requires=[
        "PyYAML>=6.0",
        "toml>=0.10.2",
    ],
    entry_points={
        "console_scripts": [
            "depalyzer=depalyzer.cli:main",
        ],
    },
    python_requires=">=3.8",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)
