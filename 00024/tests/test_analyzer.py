import unittest
from pathlib import Path

from depalyzer.analyzer import DependencyAnalyzer
from depalyzer.conflict_detector import ConflictDetector
from depalyzer.license_analyzer import LicenseAnalyzer
from depalyzer.parsers.npm_parser import NpmParser
from depalyzer.parsers.pip_parser import PipParser


class TestDependencyAnalyzer(unittest.TestCase):
    def setUp(self):
        self.test_repo = Path(__file__).parent.parent / "test_repo"

    def test_npm_parser(self):
        parser = NpmParser()
        result = parser.parse(self.test_repo)
        self.assertIn("package.json", result["files_found"][0])
        self.assertGreater(len(result["direct_dependencies"]), 0)

    def test_pip_parser(self):
        parser = PipParser()
        result = parser.parse(self.test_repo)
        self.assertIn("requirements.txt", result["files_found"][0])
        self.assertGreater(len(result["direct_dependencies"]), 0)

    def test_dependency_analyzer(self):
        analyzer = DependencyAnalyzer(self.test_repo)
        result = analyzer.analyze()
        self.assertIn("npm", result)
        self.assertIn("pip", result)

    def test_conflict_detector(self):
        analyzer = DependencyAnalyzer(self.test_repo)
        result = analyzer.analyze()
        detector = ConflictDetector(result)
        conflicts = detector.detect()
        self.assertIsInstance(conflicts, list)

    def test_license_analyzer(self):
        analyzer = DependencyAnalyzer(self.test_repo)
        result = analyzer.analyze()
        license_analyzer = LicenseAnalyzer(result)
        summary = license_analyzer.analyze()
        self.assertIn("npm", summary)
        self.assertIn("pip", summary)


if __name__ == "__main__":
    unittest.main()
