import click
from colorama import init, Fore, Style

from .config import ConfigManager
from .executor import BatchExecutor
from .reporter import Reporter
from .scheduler import Scheduler

init(autoreset=True)

pass_config = click.make_pass_decorator(ConfigManager)


def get_config_manager(ctx):
    if not hasattr(ctx, 'config_manager'):
        config_path = ctx.params.get('config', 'repos.json')
        ctx.config_manager = ConfigManager(config_path)
    return ctx.config_manager


@click.group()
@click.option('--config', '-c', default='repos.json', help='Path to configuration file')
@click.option('--exclude-tags', '-e', multiple=True, help='Exclude repositories with these tags')
@click.option('--include-tags', '-i', multiple=True, help='Include only repositories with these tags')
@click.option('--exclude-repo', '-x', multiple=True, help='Exclude repositories by name or path')
@click.pass_context
def cli(ctx, config, exclude_tags, include_tags, exclude_repo):
    ctx.ensure_object(dict)
    ctx.obj['config_path'] = config
    ctx.obj['exclude_tags'] = list(exclude_tags) if exclude_tags else None
    ctx.obj['include_tags'] = list(include_tags) if include_tags else None
    ctx.obj['exclude_repos'] = list(exclude_repo) if exclude_repo else None
    ctx.obj['config_manager'] = ConfigManager(config)


@cli.command()
@click.argument('name')
@click.argument('path')
@click.option('--tags', '-t', multiple=True, help='Tags for this repository')
@click.option('--enabled/--disabled', default=True, help='Enable or disable this repository')
@click.pass_context
def add(ctx, name, path, tags, enabled):
    config = ctx.obj['config_manager']
    config.add_repo(name, path, list(tags), enabled)
    config.save_config()
    click.echo(f"{Fore.GREEN}✓ Added repository: {name}{Fore.RESET}")


@cli.command()
@click.argument('name')
@click.pass_context
def remove(ctx, name):
    config = ctx.obj['config_manager']
    if config.remove_repo(name):
        config.save_config()
        click.echo(f"{Fore.GREEN}✓ Removed repository: {name}{Fore.RESET}")
    else:
        click.echo(f"{Fore.RED}✗ Repository not found: {name}{Fore.RESET}")


@cli.command('list')
@click.pass_context
def list_repos(ctx):
    config = ctx.obj['config_manager']
    exclude_tags = ctx.obj['exclude_tags']
    include_tags = ctx.obj['include_tags']
    exclude_repos = ctx.obj['exclude_repos']
    
    repos = config.get_repos(exclude_tags, include_tags, exclude_repos)
    
    if not repos:
        click.echo(f"{Fore.YELLOW}No repositories found.{Fore.RESET}")
        return
    
    click.echo(f"\n{Style.BRIGHT}Configured repositories:{Style.RESET_ALL}\n")
    for repo in repos:
        status = f"{Fore.GREEN}enabled{Fore.RESET}" if repo.get("enabled", True) else f"{Fore.RED}disabled{Fore.RESET}"
        tags = ", ".join(repo.get("tags", []))
        tags_str = f" [{tags}]" if tags else ""
        click.echo(f"  {Style.BRIGHT}{repo['name']}{Style.RESET_ALL}{tags_str} - {status}")
        click.echo(f"    Path: {repo['path']}")
        click.echo()


@cli.command()
@click.argument('csv_path')
@click.pass_context
def import_csv(ctx, csv_path):
    config = ctx.obj['config_manager']
    count = config.import_from_csv(csv_path)
    config.save_config()
    click.echo(f"{Fore.GREEN}✓ Imported {count} repositories from {csv_path}{Fore.RESET}")


@cli.command()
@click.argument('csv_path')
@click.pass_context
def export_csv(ctx, csv_path):
    config = ctx.obj['config_manager']
    config.export_to_csv(csv_path)
    click.echo(f"{Fore.GREEN}✓ Exported {len(config.repos)} repositories to {csv_path}{Fore.RESET}")


def common_operation_options(func):
    func = click.option('--workers', '-w', default=4, type=int, help='Number of concurrent workers')(func)
    func = click.option('--dry-run', '-n', is_flag=True, help='Show what would be done without executing')(func)
    func = click.option('--show-output', is_flag=True, help='Show command output')(func)
    return func


@cli.command()
@common_operation_options
@click.option('--rebase', is_flag=True, help='Use pull --rebase')
@click.pass_context
def pull(ctx, workers, dry_run, show_output, rebase):
    config = ctx.obj['config_manager']
    exclude_tags = ctx.obj['exclude_tags']
    include_tags = ctx.obj['include_tags']
    exclude_repos = ctx.obj['exclude_repos']
    
    repos = config.get_repos(exclude_tags, include_tags, exclude_repos)
    
    if dry_run:
        reporter = Reporter()
        reporter.print_dry_run(repos, "git pull")
        return
    
    executor = BatchExecutor(max_workers=workers)
    reporter = executor.execute_pull(repos, rebase=rebase)
    reporter.print_summary(show_output=show_output)


@cli.command()
@common_operation_options
@click.pass_context
def status(ctx, workers, dry_run, show_output):
    config = ctx.obj['config_manager']
    exclude_tags = ctx.obj['exclude_tags']
    include_tags = ctx.obj['include_tags']
    exclude_repos = ctx.obj['exclude_repos']
    
    repos = config.get_repos(exclude_tags, include_tags, exclude_repos)
    
    if dry_run:
        reporter = Reporter()
        reporter.print_dry_run(repos, "git status")
        return
    
    executor = BatchExecutor(max_workers=workers)
    reporter = executor.execute_status(repos)
    reporter.print_summary(show_output=True)


@cli.command()
@common_operation_options
@click.argument('branch')
@click.option('--create', '-b', is_flag=True, help='Create new branch')
@click.pass_context
def checkout(ctx, workers, dry_run, show_output, branch, create):
    config = ctx.obj['config_manager']
    exclude_tags = ctx.obj['exclude_tags']
    include_tags = ctx.obj['include_tags']
    exclude_repos = ctx.obj['exclude_repos']
    
    repos = config.get_repos(exclude_tags, include_tags, exclude_repos)
    
    if dry_run:
        reporter = Reporter()
        reporter.print_dry_run(repos, f"git checkout {branch}")
        return
    
    executor = BatchExecutor(max_workers=workers)
    reporter = executor.execute_checkout(repos, branch, create=create)
    reporter.print_summary(show_output=show_output)


@cli.command()
@common_operation_options
@click.argument('tag_name')
@click.option('--message', '-m', help='Tag message')
@click.option('--push', is_flag=True, help='Push tag to remote')
@click.pass_context
def tag(ctx, workers, dry_run, show_output, tag_name, message, push):
    config = ctx.obj['config_manager']
    exclude_tags = ctx.obj['exclude_tags']
    include_tags = ctx.obj['include_tags']
    exclude_repos = ctx.obj['exclude_repos']
    
    repos = config.get_repos(exclude_tags, include_tags, exclude_repos)
    
    if dry_run:
        reporter = Reporter()
        reporter.print_dry_run(repos, f"git tag {tag_name}")
        return
    
    executor = BatchExecutor(max_workers=workers)
    reporter = executor.execute_tag(repos, tag_name, message=message, push=push)
    reporter.print_summary(show_output=show_output)


@cli.command()
@common_operation_options
@click.pass_context
def fetch(ctx, workers, dry_run, show_output):
    config = ctx.obj['config_manager']
    exclude_tags = ctx.obj['exclude_tags']
    include_tags = ctx.obj['include_tags']
    exclude_repos = ctx.obj['exclude_repos']
    
    repos = config.get_repos(exclude_tags, include_tags, exclude_repos)
    
    if dry_run:
        reporter = Reporter()
        reporter.print_dry_run(repos, "git fetch")
        return
    
    executor = BatchExecutor(max_workers=workers)
    reporter = executor.execute_fetch(repos)
    reporter.print_summary(show_output=show_output)


@cli.command('exec')
@common_operation_options
@click.argument('command')
@click.pass_context
def exec_cmd(ctx, workers, dry_run, show_output, command):
    config = ctx.obj['config_manager']
    exclude_tags = ctx.obj['exclude_tags']
    include_tags = ctx.obj['include_tags']
    exclude_repos = ctx.obj['exclude_repos']
    
    repos = config.get_repos(exclude_tags, include_tags, exclude_repos)
    
    if dry_run:
        reporter = Reporter()
        reporter.print_dry_run(repos, f"git {command}")
        return
    
    executor = BatchExecutor(max_workers=workers)
    reporter = executor.execute_custom(repos, command)
    reporter.print_summary(show_output=show_output)


@cli.command()
@click.argument('cron_expression')
@click.option('--workers', '-w', default=4, type=int, help='Number of concurrent workers')
@click.option('--log-dir', default='./logs', help='Directory for log files')
@click.option('--log-file', help='Specific log file path (overrides log-dir default)')
@click.option('--daemon', '-d', is_flag=True, help='Run as daemon (background)')
@click.option('--pid-file', help='PID file path when running as daemon')
@click.pass_context
def schedule(ctx, cron_expression, workers, log_dir, log_file, daemon, pid_file):
    config_path = ctx.obj['config_path']
    exclude_tags = ctx.obj['exclude_tags']
    include_tags = ctx.obj['include_tags']
    exclude_repos = ctx.obj['exclude_repos']
    
    scheduler = Scheduler(
        config_path=config_path,
        cron_expression=cron_expression,
        log_dir=log_dir,
        max_workers=workers,
        exclude_tags=exclude_tags,
        include_tags=include_tags,
        exclude_repos=exclude_repos,
        log_file=log_file,
        daemon=daemon,
        pid_file=pid_file
    )
    scheduler.start()


if __name__ == '__main__':
    cli()
