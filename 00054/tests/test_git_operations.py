import os
import tempfile
import unittest
import subprocess

from git_batch_tool.git_operations import GitOperations


class TestGitOperations(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.repo_path = os.path.join(self.temp_dir, "test-repo")
        os.makedirs(self.repo_path)
        self._init_git_repo()
        self.git_ops = GitOperations()

    def tearDown(self):
        import shutil
        shutil.rmtree(self.temp_dir)

    def _init_git_repo(self):
        subprocess.run(["git", "init"], cwd=self.repo_path, capture_output=True)
        subprocess.run(["git", "config", "user.name", "Test User"], cwd=self.repo_path, capture_output=True)
        subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=self.repo_path, capture_output=True)
        
        readme_path = os.path.join(self.repo_path, "README.md")
        with open(readme_path, "w") as f:
            f.write("# Test Repo\n")
        
        subprocess.run(["git", "add", "."], cwd=self.repo_path, capture_output=True)
        subprocess.run(["git", "commit", "-m", "Initial commit"], cwd=self.repo_path, capture_output=True)

    def test_is_git_repo_true(self):
        self.assertTrue(self.git_ops.is_git_repo(self.repo_path))

    def test_is_git_repo_false(self):
        non_git_dir = os.path.join(self.temp_dir, "non-git")
        os.makedirs(non_git_dir)
        self.assertFalse(self.git_ops.is_git_repo(non_git_dir))

    def test_get_current_branch(self):
        code, branch, _ = self.git_ops.get_current_branch(self.repo_path)
        self.assertEqual(code, 0)
        self.assertIn(branch, ["main", "master"])

    def test_status_clean(self):
        code, status, _ = self.git_ops.status(self.repo_path)
        self.assertEqual(code, 0)
        self.assertEqual(status, "")

    def test_status_dirty(self):
        new_file = os.path.join(self.repo_path, "new_file.txt")
        with open(new_file, "w") as f:
            f.write("test\n")
        
        code, status, _ = self.git_ops.status(self.repo_path)
        self.assertEqual(code, 0)
        self.assertIn("new_file.txt", status)

    def test_checkout_and_create_branch(self):
        code, _, _ = self.git_ops.checkout(self.repo_path, "feature-branch", create=True)
        self.assertEqual(code, 0)
        
        code, branch, _ = self.git_ops.get_current_branch(self.repo_path)
        self.assertEqual(branch, "feature-branch")

    def test_checkout_existing_branch(self):
        self.git_ops.checkout(self.repo_path, "feature-branch", create=True)
        self.git_ops.checkout(self.repo_path, "main")
        
        code, branch, _ = self.git_ops.get_current_branch(self.repo_path)
        self.assertEqual(code, 0)
        self.assertIn(branch, ["main", "master"])

    def test_create_tag(self):
        code, _, _ = self.git_ops.create_tag(self.repo_path, "v1.0.0", "Release 1.0")
        self.assertEqual(code, 0)

    def test_custom_command(self):
        code, output, _ = self.git_ops.custom_command(self.repo_path, "log --oneline -1")
        self.assertEqual(code, 0)
        self.assertIn("Initial commit", output)

    def test_fetch(self):
        code, _, _ = self.git_ops.fetch(self.repo_path)
        self.assertEqual(code, 0)

    def test_get_repo_info(self):
        info = self.git_ops.get_repo_info(self.repo_path)
        self.assertTrue(info["is_git_repo"])
        self.assertIn(info["branch"], ["main", "master"])

    def test_get_repo_info_not_git(self):
        non_git_dir = os.path.join(self.temp_dir, "non-git")
        os.makedirs(non_git_dir)
        info = self.git_ops.get_repo_info(non_git_dir)
        self.assertFalse(info["is_git_repo"])


if __name__ == "__main__":
    unittest.main()
