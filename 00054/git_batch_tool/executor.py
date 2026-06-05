import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Callable, Any, Tuple

from .git_operations import GitOperations
from .reporter import Reporter


class BatchExecutor:
    def __init__(self, max_workers: int = 4, reporter: Reporter = None):
        self.max_workers = max_workers
        self.reporter = reporter or Reporter()
        self.git_ops = GitOperations()

    def execute(self, repos: List[Dict], operation_name: str, 
                operation_func: Callable[[str], Tuple[int, str, str]],
                skip_git_check: bool = False) -> Reporter:
        self.reporter.start()
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_repo = {}
            for repo in repos:
                if not skip_git_check and not self.git_ops.is_git_repo(repo["path"]):
                    self.reporter.add_result(
                        repo_name=repo["name"],
                        operation=operation_name,
                        success=False,
                        error="Not a valid Git repository",
                        duration=0
                    )
                    continue
                
                future = executor.submit(
                    self._execute_operation,
                    repo["name"],
                    repo["path"],
                    operation_func
                )
                future_to_repo[future] = repo["name"]

            for future in as_completed(future_to_repo):
                repo_name = future_to_repo[future]
                try:
                    success, output, error, duration = future.result()
                    self.reporter.add_result(
                        repo_name=repo_name,
                        operation=operation_name,
                        success=success,
                        output=output,
                        error=error,
                        duration=duration
                    )
                except Exception as e:
                    self.reporter.add_result(
                        repo_name=repo_name,
                        operation=operation_name,
                        success=False,
                        error=str(e),
                        duration=0
                    )
        
        self.reporter.finish()
        return self.reporter

    def _execute_operation(self, repo_name: str, repo_path: str, 
                          operation_func: Callable[[str], Tuple[int, str, str]]) -> Tuple[bool, str, str, float]:
        start_time = time.time()
        try:
            returncode, stdout, stderr = operation_func(repo_path)
            duration = time.time() - start_time
            success = returncode == 0
            output = stdout if success else ""
            error = stderr if not success else ""
            return success, output, error, duration
        except Exception as e:
            duration = time.time() - start_time
            return False, "", str(e), duration

    def execute_pull(self, repos: List[Dict], rebase: bool = False) -> Reporter:
        def op(path):
            return self.git_ops.pull(path, rebase=rebase)
        return self.execute(repos, "git pull", op)

    def execute_status(self, repos: List[Dict]) -> Reporter:
        return self.execute(repos, "git status", self.git_ops.status)

    def execute_checkout(self, repos: List[Dict], branch: str, create: bool = False) -> Reporter:
        def op(path):
            return self.git_ops.checkout(path, branch, create=create)
        return self.execute(repos, f"git checkout {branch}", op)

    def execute_tag(self, repos: List[Dict], tag_name: str, message: str = None, push: bool = False) -> Reporter:
        def op(path):
            code, out, err = self.git_ops.create_tag(path, tag_name, message)
            if code == 0 and push:
                code, out2, err2 = self.git_ops.push_tag(path, tag_name)
                out = out + "\n" + out2 if out else out2
                err = err + "\n" + err2 if err else err2
            return code, out, err
        return self.execute(repos, f"git tag {tag_name}", op)

    def execute_custom(self, repos: List[Dict], command: str) -> Reporter:
        def op(path):
            return self.git_ops.custom_command(path, command)
        return self.execute(repos, f"git {command}", op)

    def execute_fetch(self, repos: List[Dict]) -> Reporter:
        return self.execute(repos, "git fetch", self.git_ops.fetch)
