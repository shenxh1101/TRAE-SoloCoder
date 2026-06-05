import os
import tempfile
import unittest
import subprocess
import shutil

from git_batch_tool.executor import BatchExecutor
from git_batch_tool.reporter import Reporter


class TestBatchExecutor(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.repo_paths = []
        for i in range(3):
            repo_path = os.path.join(self.temp_dir, f"repo-{i}")
            os.makedirs(repo_path)
            self._init_git_repo(repo_path)
            self.repo_paths.append(repo_path)
        
        self.repos = [
            {"name": f"repo-{i}", "path": self.repo_paths[i]}
            for i in range(3)
        ]
        self.executor = BatchExecutor(max_workers=2)

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def _init_git_repo(self, path):
        subprocess.run(["git", "init"], cwd=path, capture_output=True)
        subprocess.run(["git", "config", "user.name", "Test User"], cwd=path, capture_output=True)
        subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=path, capture_output=True)
        
        with open(os.path.join(path, "README.md"), "w") as f:
            f.write("# Test Repo\n")
        
        subprocess.run(["git", "add", "."], cwd=path, capture_output=True)
        subprocess.run(["git", "commit", "-m", "Initial commit"], cwd=path, capture_output=True)

    def test_execute_status(self):
        reporter = self.executor.execute_status(self.repos)
        self.assertEqual(len(reporter.results), 3)
        
        success_count = sum(1 for r in reporter.results if r["success"])
        self.assertEqual(success_count, 3)

    def test_execute_checkout(self):
        reporter = self.executor.execute_checkout(self.repos, "feature-branch", create=True)
        self.assertEqual(len(reporter.results), 3)
        
        success_count = sum(1 for r in reporter.results if r["success"])
        self.assertEqual(success_count, 3)

    def test_execute_tag(self):
        reporter = self.executor.execute_tag(self.repos, "v1.0.0", "Release 1.0")
        self.assertEqual(len(reporter.results), 3)
        
        success_count = sum(1 for r in reporter.results if r["success"])
        self.assertEqual(success_count, 3)

    def test_execute_custom(self):
        reporter = self.executor.execute_custom(self.repos, "log --oneline -1")
        self.assertEqual(len(reporter.results), 3)
        
        success_count = sum(1 for r in reporter.results if r["success"])
        self.assertEqual(success_count, 3)

    def test_execute_fetch(self):
        reporter = self.executor.execute_fetch(self.repos)
        self.assertEqual(len(reporter.results), 3)

    def test_non_git_repo(self):
        non_git_repo = {"name": "non-git", "path": self.temp_dir}
        repos_with_invalid = self.repos + [non_git_repo]
        
        reporter = self.executor.execute_status(repos_with_invalid)
        self.assertEqual(len(reporter.results), 4)
        
        non_git_result = [r for r in reporter.results if r["repo_name"] == "non-git"][0]
        self.assertFalse(non_git_result["success"])
        self.assertIn("Not a valid Git repository", non_git_result["error"])

    def test_concurrent_execution(self):
        import time
        
        start_time = time.time()
        reporter = self.executor.execute_status(self.repos)
        elapsed = time.time() - start_time
        
        self.assertEqual(len(reporter.results), 3)

    def test_custom_operation(self):
        def custom_op(path):
            return (0, "custom output", "")
        
        reporter = self.executor.execute(
            self.repos,
            "custom operation",
            custom_op
        )
        
        self.assertEqual(len(reporter.results), 3)
        for result in reporter.results:
            self.assertTrue(result["success"])


if __name__ == "__main__":
    unittest.main()
