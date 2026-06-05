import subprocess
import threading
import platform
import os
from queue import Queue
from netaddr import IPNetwork
from .config import DEFAULT_PING_TIMEOUT, DEFAULT_PING_COUNT, DEFAULT_PING_THREADS


def check_root_privileges():
    try:
        if platform.system().lower() == 'windows':
            try:
                import ctypes
                return ctypes.windll.shell32.IsUserAnAdmin() != 0
            except Exception:
                return False
        else:
            return os.geteuid() == 0
    except Exception:
        return False


class ICMPScanner:
    def __init__(self, timeout=DEFAULT_PING_TIMEOUT, count=DEFAULT_PING_COUNT, max_threads=DEFAULT_PING_THREADS):
        self.timeout = timeout
        self.count = count
        self.max_threads = max_threads
        self.alive_hosts = []
        self.lock = threading.Lock()
        self.system = platform.system().lower()
        self.has_root = check_root_privileges()
        
        if not self.has_root and self.system != 'windows':
            print("WARNING: Running without root privileges. Using system ping command instead of raw sockets.")
            print("         For best results, run with sudo or as administrator.")

    def _ping(self, ip):
        try:
            if self.system == 'windows':
                command = ['ping', '-n', str(self.count), '-w', str(self.timeout * 1000), str(ip)]
            else:
                command = ['ping', '-c', str(self.count), '-W', str(self.timeout), str(ip)]

            result = subprocess.run(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            if result.returncode == 0:
                with self.lock:
                    self.alive_hosts.append(str(ip))
        except Exception:
            pass

    def _worker(self, queue):
        while True:
            ip = queue.get()
            if ip is None:
                break
            self._ping(ip)
            queue.task_done()

    def scan_range(self, ip_range):
        self.alive_hosts = []
        
        try:
            network = IPNetwork(ip_range)
            ips = list(network)
        except Exception as e:
            print(f"Error parsing IP range: {e}")
            return []

        queue = Queue()
        threads = []

        for _ in range(min(self.max_threads, len(ips))):
            t = threading.Thread(target=self._worker, args=(queue,))
            t.start()
            threads.append(t)

        for ip in ips:
            queue.put(ip)

        queue.join()

        for _ in range(self.max_threads):
            queue.put(None)
        for t in threads:
            t.join()

        return sorted(set(self.alive_hosts))

    def scan_list(self, ip_list):
        self.alive_hosts = []

        queue = Queue()
        threads = []

        for _ in range(min(self.max_threads, len(ip_list))):
            t = threading.Thread(target=self._worker, args=(queue,))
            t.start()
            threads.append(t)

        for ip in ip_list:
            queue.put(ip)

        queue.join()

        for _ in range(self.max_threads):
            queue.put(None)
        for t in threads:
            t.join()

        return sorted(set(self.alive_hosts))
