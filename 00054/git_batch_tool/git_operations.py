import os
import subprocess
from pathlib import Path
from typing import Dict, Tuple, List


class GitOperations:
    @staticmethod
    def _run_git_command(repo_path: str, command: List[str]) -> Tuple[int, str, str]:
        try:
            result = subprocess.run(
                ["git"] + command,
                cwd=repo_path,
                capture_output=True,
                text=True,
                timeout=300
            )
            return result.returncode, result.stdout.strip(), result.stderr.strip()
        except subprocess.TimeoutExpired:
            return -1, "", "Command timed out after 300 seconds"
        except Exception as e:
            return -1, "", str(e)

    @staticmethod
    def is_git_repo(repo_path: str) -> bool:
        return os.path.isdir(os.path.join(repo_path, ".git"))

    @staticmethod
    def get_current_branch(repo_path: str) -> Tuple[int, str, str]:
        return GitOperations._run_git_command(repo_path, ["rev-parse", "--abbrev-ref", "HEAD"])

    @staticmethod
    def pull(repo_path: str, rebase: bool = False) -> Tuple[int, str, str]:
        cmd = ["pull", "--rebase"] if rebase else ["pull"]
        return GitOperations._run_git_command(repo_path, cmd)

    @staticmethod
    def status(repo_path: str) -> Tuple[int, str, str]:
        return GitOperations._run_git_command(repo_path, ["status", "-s"])

    @staticmethod
    def checkout(repo_path: str, branch: str, create: bool = False) -> Tuple[int, str, str]:
        cmd = ["checkout", "-b", branch] if create else ["checkout", branch]
        return GitOperations._run_git_command(repo_path, cmd)

    @staticmethod
    def create_tag(repo_path: str, tag_name: str, message: str = None) -> Tuple[int, str, str]:
        cmd = ["tag", tag_name]
        if message:
            cmd.extend(["-a", "-m", message])
        return GitOperations._run_git_command(repo_path, cmd)

    @staticmethod
    def push_tag(repo_path: str, tag_name: str) -> Tuple[int, str, str]:
        return GitOperations._run_git_command(repo_path, ["push", "origin", tag_name])

    @staticmethod
    def fetch(repo_path: str) -> Tuple[int, str, str]:
        return GitOperations._run_git_command(repo_path, ["fetch", "--all"])

    @staticmethod
    def custom_command(repo_path: str, command: str) -> Tuple[int, str, str]:
        import shlex
        parts = shlex.split(command)
        if parts and parts[0] == "git":
            parts = parts[1:]
        return GitOperations._run_git_command(repo_path, parts)

    @staticmethod
    def get_repo_info(repo_path: str) -> Dict:
        info = {"path": repo_path, "is_git_repo": False, "branch": "", "status": "", "remote": ""}
        if not GitOperations.is_git_repo(repo_path):
            return info
        
        info["is_git_repo"] = True
        code, branch, _ = GitOperations.get_current_branch(repo_path)
        if code == 0:
            info["branch"] = branch
        
        code, status, _ = GitOperations.status(repo_path)
        if code == 0:
            info["status"] = status
        
        code, remote, _ = GitOperations._run_git_command(repo_path, ["remote", "get-url", "origin"])
        if code == 0:
            info["remote"] = remote
        
        return info
