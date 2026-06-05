import os
import tempfile
import unittest
import logging

from git_batch_tool.scheduler import Scheduler


class TestScheduler(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.log_dir = os.path.join(self.temp_dir, "logs")
        self.config_path = os.path.join(self.temp_dir, "repos.json")

    def tearDown(self):
        import shutil
        shutil.rmtree(self.temp_dir)
        
        logger = logging.getLogger("git_batch_scheduler")
        logger.handlers = []

    def test_parse_cron_valid(self):
        scheduler = Scheduler(
            config_path=self.config_path,
            cron_expression="0 2 * * *",
            log_dir=self.log_dir
        )
        
        parts = scheduler._parse_cron("0 2 * * *")
        self.assertEqual(len(parts), 5)
        self.assertEqual(parts[0], "0")
        self.assertEqual(parts[1], "2")

    def test_parse_cron_invalid(self):
        scheduler = Scheduler(
            config_path=self.config_path,
            cron_expression="0 2 * *",
            log_dir=self.log_dir
        )
        
        with self.assertRaises(ValueError):
            scheduler._parse_cron("0 2 * *")

    def test_log_file_creation(self):
        scheduler = Scheduler(
            config_path=self.config_path,
            cron_expression="0 2 * * *",
            log_dir=self.log_dir
        )
        
        self.assertTrue(os.path.exists(self.log_dir))
        self.assertIsNotNone(scheduler.log_file)
        self.assertTrue(os.path.exists(os.path.dirname(scheduler.log_file)))

    def test_custom_log_file(self):
        custom_log_file = os.path.join(self.temp_dir, "custom.log")
        
        scheduler = Scheduler(
            config_path=self.config_path,
            cron_expression="0 2 * * *",
            log_file=custom_log_file,
            log_dir=self.log_dir
        )
        
        self.assertEqual(scheduler.log_file, custom_log_file)

    def test_pid_file_creation(self):
        pid_file = os.path.join(self.temp_dir, "scheduler.pid")
        
        scheduler = Scheduler(
            config_path=self.config_path,
            cron_expression="0 2 * * *",
            log_dir=self.log_dir,
            pid_file=pid_file
        )
        
        self.assertTrue(os.path.exists(pid_file))
        
        with open(pid_file, "r") as f:
            pid = int(f.read())
            self.assertEqual(pid, os.getpid())

    def test_pid_file_cleanup(self):
        pid_file = os.path.join(self.temp_dir, "scheduler.pid")
        
        scheduler = Scheduler(
            config_path=self.config_path,
            cron_expression="0 2 * * *",
            log_dir=self.log_dir,
            pid_file=pid_file
        )
        
        self.assertTrue(os.path.exists(pid_file))
        
        scheduler._cleanup_pid_file()
        
        self.assertFalse(os.path.exists(pid_file))

    def test_exclude_repos_parameter(self):
        scheduler = Scheduler(
            config_path=self.config_path,
            cron_expression="0 2 * * *",
            log_dir=self.log_dir,
            exclude_repos=["repo1", "repo2"]
        )
        
        self.assertEqual(scheduler.exclude_repos, ["repo1", "repo2"])

    def test_logging_setup(self):
        scheduler = Scheduler(
            config_path=self.config_path,
            cron_expression="0 2 * * *",
            log_dir=self.log_dir
        )
        
        self.assertIsNotNone(scheduler.logger)
        self.assertEqual(scheduler.logger.name, "git_batch_scheduler")
        self.assertTrue(len(scheduler.logger.handlers) >= 1)


if __name__ == "__main__":
    unittest.main()
