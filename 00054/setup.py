from setuptools import setup, find_packages

setup(
    name="git-batch-tool",
    version="1.0.0",
    description="Multi-repository Git batch operation command line tool",
    author="Your Name",
    packages=find_packages(),
    install_requires=[
        "click>=8.0.0",
        "colorama>=0.4.4",
        "schedule>=1.2.0",
    ],
    entry_points={
        "console_scripts": [
            "git-batch=git_batch_tool.cli:cli",
        ],
    },
    python_requires=">=3.7",
)
