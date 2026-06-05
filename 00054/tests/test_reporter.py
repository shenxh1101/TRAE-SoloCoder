import os
import tempfile
import unittest
import json

from git_batch_tool.reporter import Reporter


class TestReporter(unittest.TestCase):
    def setUp(self):
        self.reporter = Reporter()

    def test_start(self):
        self.reporter.start()
        self.assertIsNotNone(self.reporter.start_time)
        self.assertEqual(len(self.reporter.results), 0)

    def test_add_result(self):
        self.reporter.start()
        self.reporter.add_result(
            repo_name="test-repo",
            operation="git pull",
            success=True,
            output="Already up to date",
            error="",
            duration=0.5
        )
        self.assertEqual(len(self.reporter.results), 1)
        self.assertEqual(self.reporter.results[0]["repo_name"], "test-repo")
        self.assertTrue(self.reporter.results[0]["success"])

    def test_finish(self):
        self.reporter.start()
        self.reporter.finish()
        self.assertIsNotNone(self.reporter.end_time)

    def test_print_summary(self):
        self.reporter.start()
        self.reporter.add_result("repo1", "pull", True, "OK", "", 0.1)
        self.reporter.add_result("repo2", "pull", False, "", "Error", 0.2)
        self.reporter.finish()
        
        import io
        import sys
        captured_output = io.StringIO()
        sys.stdout = captured_output
        self.reporter.print_summary()
        sys.stdout = sys.__stdout__
        
        output = captured_output.getvalue()
        self.assertIn("Operation Summary", output)
        self.assertIn("Success: 1", output)
        self.assertIn("Failed: 1", output)
        self.assertIn("repo1", output)
        self.assertIn("repo2", output)

    def test_print_dry_run(self):
        repos = [
            {"name": "repo1", "path": "/tmp/1", "tags": ["tag1"]},
            {"name": "repo2", "path": "/tmp/2", "tags": []}
        ]
        
        import io
        import sys
        captured_output = io.StringIO()
        sys.stdout = captured_output
        self.reporter.print_dry_run(repos, "git pull")
        sys.stdout = sys.__stdout__
        
        output = captured_output.getvalue()
        self.assertIn("Dry Run Preview", output)
        self.assertIn("git pull", output)
        self.assertIn("repo1", output)
        self.assertIn("repo2", output)
        self.assertIn("2 repositories", output)

    def test_export_report(self):
        self.reporter.start()
        self.reporter.add_result("repo1", "pull", True, "OK", "", 0.1)
        self.reporter.add_result("repo2", "pull", False, "", "Error", 0.2)
        self.reporter.finish()
        
        temp_dir = tempfile.mkdtemp()
        report_path = os.path.join(temp_dir, "report.json")
        
        self.reporter.export_report(report_path)
        
        self.assertTrue(os.path.exists(report_path))
        
        with open(report_path, "r") as f:
            report = json.load(f)
        
        self.assertEqual(report["total_repos"], 2)
        self.assertEqual(report["success_count"], 1)
        self.assertEqual(report["fail_count"], 1)
        self.assertEqual(len(report["results"]), 2)
        
        os.remove(report_path)
        os.rmdir(temp_dir)


if __name__ == "__main__":
    unittest.main()
