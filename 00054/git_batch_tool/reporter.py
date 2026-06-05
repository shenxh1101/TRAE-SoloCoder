import time
from typing import List, Dict
from colorama import init, Fore, Style

init(autoreset=True)


class Reporter:
    def __init__(self):
        self.results: List[Dict] = []
        self.start_time = None
        self.end_time = None

    def start(self):
        self.start_time = time.time()
        self.results = []

    def add_result(self, repo_name: str, operation: str, success: bool, 
                   output: str = "", error: str = "", duration: float = 0):
        self.results.append({
            "repo_name": repo_name,
            "operation": operation,
            "success": success,
            "output": output,
            "error": error,
            "duration": duration
        })

    def finish(self):
        self.end_time = time.time()

    def print_summary(self, show_output: bool = False, show_error: bool = True):
        if not self.start_time:
            return
        
        total_time = (self.end_time or time.time()) - self.start_time
        success_count = sum(1 for r in self.results if r["success"])
        fail_count = len(self.results) - success_count

        print(f"\n{'=' * 60}")
        print(f"{Style.BRIGHT}Operation Summary{Style.RESET_ALL}")
        print(f"{'=' * 60}")
        print(f"Total repositories: {len(self.results)}")
        print(f"{Fore.GREEN}Success: {success_count}{Fore.RESET}")
        print(f"{Fore.RED}Failed: {fail_count}{Fore.RESET}")
        print(f"Total time: {total_time:.2f}s")
        print(f"{'=' * 60}\n")

        for result in self.results:
            status_icon = f"{Fore.GREEN}✓{Fore.RESET}" if result["success"] else f"{Fore.RED}✗{Fore.RESET}"
            status_text = f"{Fore.GREEN}SUCCESS{Fore.RESET}" if result["success"] else f"{Fore.RED}FAILED{Fore.RESET}"
            
            print(f"{status_icon} {Style.BRIGHT}{result['repo_name']}{Style.RESET_ALL} "
                  f"- {result['operation']} - {status_text} ({result['duration']:.2f}s)")
            
            if show_output and result["output"]:
                print(f"  Output: {result['output']}")
            
            if show_error and result["error"]:
                print(f"  {Fore.RED}Error: {result['error']}{Fore.RESET}")
            
            print()

    def print_dry_run(self, repos: List[Dict], operation: str):
        print(f"\n{Fore.CYAN}{'=' * 60}{Fore.RESET}")
        print(f"{Style.BRIGHT}{Fore.CYAN}Dry Run Preview - {operation}{Fore.RESET}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'=' * 60}{Fore.RESET}")
        print(f"\nThe following {len(repos)} repositories will be affected:\n")
        
        for repo in repos:
            tags = ", ".join(repo.get("tags", []))
            tags_str = f" [{tags}]" if tags else ""
            print(f"  • {Style.BRIGHT}{repo['name']}{Style.RESET_ALL}{tags_str}")
            print(f"    Path: {repo['path']}")
        
        print(f"\n{Fore.CYAN}Total: {len(repos)} repositories{Fore.RESET}")
        print(f"{Fore.CYAN}{'=' * 60}{Fore.RESET}\n")

    def export_report(self, output_path: str):
        import json
        report = {
            "total_time": (self.end_time or time.time()) - self.start_time,
            "total_repos": len(self.results),
            "success_count": sum(1 for r in self.results if r["success"]),
            "fail_count": sum(1 for r in self.results if not r["success"]),
            "results": self.results
        }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
