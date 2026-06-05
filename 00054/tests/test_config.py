import os
import json
import tempfile
import unittest
from pathlib import Path

from git_batch_tool.config import ConfigManager


class TestConfigManager(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.config_path = os.path.join(self.temp_dir, "repos.json")
        self.manager = ConfigManager(self.config_path)

    def tearDown(self):
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    def test_init_empty_config(self):
        self.assertEqual(len(self.manager.repos), 0)

    def test_add_repo(self):
        self.manager.add_repo("test-repo", "/tmp/test", ["tag1", "tag2"])
        self.assertEqual(len(self.manager.repos), 1)
        self.assertEqual(self.manager.repos[0]["name"], "test-repo")
        self.assertEqual(self.manager.repos[0]["tags"], ["tag1", "tag2"])
        self.assertTrue(self.manager.repos[0]["enabled"])

    def test_add_repo_disabled(self):
        self.manager.add_repo("test-repo", "/tmp/test", enabled=False)
        self.assertFalse(self.manager.repos[0]["enabled"])

    def test_remove_repo(self):
        self.manager.add_repo("repo1", "/tmp/1")
        self.manager.add_repo("repo2", "/tmp/2")
        self.assertEqual(len(self.manager.repos), 2)
        
        result = self.manager.remove_repo("repo1")
        self.assertTrue(result)
        self.assertEqual(len(self.manager.repos), 1)
        self.assertEqual(self.manager.repos[0]["name"], "repo2")

    def test_remove_nonexistent_repo(self):
        result = self.manager.remove_repo("nonexistent")
        self.assertFalse(result)

    def test_save_and_load_config(self):
        self.manager.add_repo("repo1", "/tmp/1", ["tag1"])
        self.manager.add_repo("repo2", "/tmp/2", ["tag2"], enabled=False)
        self.manager.save_config()
        
        new_manager = ConfigManager(self.config_path)
        self.assertEqual(len(new_manager.repos), 2)
        self.assertEqual(new_manager.repos[0]["name"], "repo1")
        self.assertEqual(new_manager.repos[1]["name"], "repo2")
        self.assertFalse(new_manager.repos[1]["enabled"])

    def test_get_repos_no_filters(self):
        self.manager.add_repo("repo1", "/tmp/1", ["tag1"])
        self.manager.add_repo("repo2", "/tmp/2", ["tag2"])
        self.manager.add_repo("repo3", "/tmp/3", ["tag3"], enabled=False)
        
        repos = self.manager.get_repos()
        self.assertEqual(len(repos), 2)

    def test_get_repos_exclude_tags(self):
        self.manager.add_repo("repo1", "/tmp/1", ["frontend", "web"])
        self.manager.add_repo("repo2", "/tmp/2", ["backend", "api"])
        self.manager.add_repo("repo3", "/tmp/3", ["mobile", "app"])
        
        repos = self.manager.get_repos(exclude_tags=["frontend"])
        self.assertEqual(len(repos), 2)
        names = [r["name"] for r in repos]
        self.assertIn("repo2", names)
        self.assertIn("repo3", names)

    def test_get_repos_include_tags(self):
        self.manager.add_repo("repo1", "/tmp/1", ["frontend", "web"])
        self.manager.add_repo("repo2", "/tmp/2", ["backend", "api"])
        self.manager.add_repo("repo3", "/tmp/3", ["mobile", "app"])
        
        repos = self.manager.get_repos(include_tags=["backend"])
        self.assertEqual(len(repos), 1)
        self.assertEqual(repos[0]["name"], "repo2")

    def test_get_repos_exclude_repos_by_name(self):
        self.manager.add_repo("repo1", "/tmp/1", ["tag1"])
        self.manager.add_repo("repo2", "/tmp/2", ["tag2"])
        self.manager.add_repo("repo3", "/tmp/3", ["tag3"])
        
        repos = self.manager.get_repos(exclude_repos=["repo2"])
        self.assertEqual(len(repos), 2)
        names = [r["name"] for r in repos]
        self.assertNotIn("repo2", names)

    def test_get_repos_exclude_multiple_repos(self):
        self.manager.add_repo("repo1", "/tmp/1", ["tag1"])
        self.manager.add_repo("repo2", "/tmp/2", ["tag2"])
        self.manager.add_repo("repo3", "/tmp/3", ["tag3"])
        
        repos = self.manager.get_repos(exclude_repos=["repo1", "repo2"])
        self.assertEqual(len(repos), 1)
        self.assertEqual(repos[0]["name"], "repo3")

    def test_import_from_csv(self):
        csv_content = """name,path,tags,enabled
repo1,/tmp/1,"tag1;tag2",true
repo2,/tmp/2,"tag3",false
"""
        csv_path = os.path.join(self.temp_dir, "test.csv")
        with open(csv_path, "w") as f:
            f.write(csv_content)
        
        count = self.manager.import_from_csv(csv_path)
        self.assertEqual(count, 2)
        self.assertEqual(len(self.manager.repos), 2)
        self.assertEqual(self.manager.repos[0]["name"], "repo1")
        self.assertEqual(self.manager.repos[0]["tags"], ["tag1", "tag2"])
        self.assertFalse(self.manager.repos[1]["enabled"])

    def test_export_to_csv(self):
        self.manager.add_repo("repo1", "/tmp/1", ["tag1", "tag2"])
        self.manager.add_repo("repo2", "/tmp/2", ["tag3"], enabled=False)
        
        csv_path = os.path.join(self.temp_dir, "export.csv")
        self.manager.export_to_csv(csv_path)
        
        self.assertTrue(os.path.exists(csv_path))
        
        with open(csv_path, "r") as f:
            lines = f.readlines()
        
        self.assertEqual(len(lines), 3)
        self.assertIn("name,path,tags,enabled", lines[0])
        self.assertIn("repo1", lines[1])
        self.assertIn("tag1;tag2", lines[1])


if __name__ == "__main__":
    unittest.main()
