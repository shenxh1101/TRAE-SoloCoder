import os
import re
import time
import json
import zipfile
import hashlib
import tempfile
import shutil
from urllib.parse import urljoin, urlparse, unquote
from datetime import datetime

import requests
from bs4 import BeautifulSoup


class ArchiverConfig:
    def __init__(
        self,
        max_depth=1,
        timeout=30,
        max_file_size=10 * 1024 * 1024,
        no_js=False,
        user_agent="WebArchiver/1.0",
        same_domain_only=True,
    ):
        self.max_depth = max_depth
        self.timeout = timeout
        self.max_file_size = max_file_size
        self.no_js = no_js
        self.user_agent = user_agent
        self.same_domain_only = same_domain_only


class ArchiveLogger:
    def __init__(self, log_path="archive_log.json"):
        self.log_path = log_path
        self._ensure_file()

    def _ensure_file(self):
        if not os.path.exists(self.log_path):
            with open(self.log_path, "w", encoding="utf-8") as f:
                json.dump([], f, ensure_ascii=False, indent=2)

    def _read_logs(self):
        with open(self.log_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_logs(self, logs):
        with open(self.log_path, "w", encoding="utf-8") as f:
            json.dump(logs, f, ensure_ascii=False, indent=2)

    def add_entry(self, url, status, archive_size, zip_path, error_msg=None):
        logs = self._read_logs()
        entry = {
            "id": hashlib.md5(f"{url}{time.time()}".encode()).hexdigest()[:12],
            "url": url,
            "timestamp": datetime.now().isoformat(),
            "status": status,
            "archive_size": archive_size,
            "zip_path": zip_path,
            "error_msg": error_msg or "",
        }
        logs.append(entry)
        self._write_logs(logs)
        return entry

    def get_all(self):
        return self._read_logs()

    def delete_entry(self, entry_id):
        logs = self._read_logs()
        logs = [l for l in logs if l["id"] != entry_id]
        self._write_logs(logs)

    def clear_all(self):
        self._write_logs([])


class WebArchiver:
    def __init__(self, config=None, logger=None):
        self.config = config or ArchiverConfig()
        self.logger = logger or ArchiveLogger()
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": self.config.user_agent})

    def _is_same_domain(self, base_url, target_url):
        if not self.config.same_domain_only:
            return True
        try:
            return urlparse(base_url).netloc == urlparse(target_url).netloc
        except Exception:
            return False

    def _safe_filename(self, url, content_type=None):
        parsed = urlparse(url)
        path = unquote(parsed.path)
        if path == "/" or path == "":
            path = "/index.html"
        name = path.strip("/").replace("/", os.sep)
        base, ext = os.path.splitext(name)
        if not ext:
            if content_type and "css" in content_type:
                ext = ".css"
            elif content_type and "javascript" in content_type:
                ext = ".js"
            elif content_type and "image" in content_type:
                ext = ".png"
            else:
                ext = ".bin"
            name = name + ext
        return name

    def _download_resource(self, url, base_url):
        if not self._is_same_domain(base_url, url):
            return None, None
        try:
            resp = self.session.get(url, timeout=self.config.timeout, stream=True)
            resp.raise_for_status()
            content_length = resp.headers.get("content-length")
            if content_length and int(content_length) > self.config.max_file_size:
                return None, None
            data = b""
            for chunk in resp.iter_content(chunk_size=8192):
                data += chunk
                if len(data) > self.config.max_file_size:
                    return None, None
            content_type = resp.headers.get("content-type", "")
            return data, content_type
        except Exception:
            return None, None

    def _extract_resources(self, soup, base_url):
        resources = {}

        for tag in soup.find_all("link", rel="stylesheet"):
            href = tag.get("href")
            if href:
                abs_url = urljoin(base_url, href)
                if self._is_same_domain(base_url, abs_url):
                    resources[abs_url] = ("href", tag)

        if not self.config.no_js:
            for tag in soup.find_all("script", src=True):
                src = tag.get("src")
                if src:
                    abs_url = urljoin(base_url, src)
                    if self._is_same_domain(base_url, abs_url):
                        resources[abs_url] = ("src", tag)

        for tag in soup.find_all("img", src=True):
            src = tag.get("src")
            if src:
                abs_url = urljoin(base_url, src)
                if self._is_same_domain(base_url, abs_url):
                    resources[abs_url] = ("src", tag)

        return resources

    def _rewrite_paths(self, soup, base_url, url_to_local):
        for tag in soup.find_all("link", rel="stylesheet"):
            href = tag.get("href")
            if href:
                abs_url = urljoin(base_url, href)
                if abs_url in url_to_local:
                    tag["href"] = url_to_local[abs_url]

        if not self.config.no_js:
            for tag in soup.find_all("script", src=True):
                src = tag.get("src")
                if src:
                    abs_url = urljoin(base_url, src)
                    if abs_url in url_to_local:
                        tag["src"] = url_to_local[abs_url]

        for tag in soup.find_all("img", src=True):
            src = tag.get("src")
            if src:
                abs_url = urljoin(base_url, src)
                if abs_url in url_to_local:
                    tag["src"] = url_to_local[abs_url]

    def archive_url(self, url, output_dir=None):
        work_dir = tempfile.mkdtemp(prefix="archive_")
        try:
            resp = self.session.get(url, timeout=self.config.timeout)
            resp.raise_for_status()
            html_content = resp.text
            content_type = resp.headers.get("content-type", "")

            soup = BeautifulSoup(html_content, "lxml")

            base_tag = soup.find("base")
            base_url = base_tag["href"] if base_tag and base_tag.get("href") else url

            resources = self._extract_resources(soup, base_url)
            url_to_local = {}

            for abs_url, (attr, tag) in resources.items():
                data, res_ct = self._download_resource(abs_url, base_url)
                if data is None:
                    continue
                local_name = self._safe_filename(abs_url, res_ct)
                local_path = os.path.join(work_dir, local_name)
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                with open(local_path, "wb") as f:
                    f.write(data)
                url_to_local[abs_url] = local_name

            self._rewrite_paths(soup, base_url, url_to_local)

            if self.config.no_js:
                for tag in soup.find_all("script"):
                    tag.decompose()

            final_html = str(soup)
            with open(os.path.join(work_dir, "index.html"), "w", encoding="utf-8") as f:
                f.write(final_html)

            zip_path = self._create_zip(work_dir, url, output_dir)

            archive_size = os.path.getsize(zip_path)
            self.logger.add_entry(
                url=url,
                status="success",
                archive_size=archive_size,
                zip_path=zip_path,
            )

            return zip_path
        except Exception as e:
            self.logger.add_entry(
                url=url,
                status="failed",
                archive_size=0,
                zip_path="",
                error_msg=str(e),
            )
            raise
        finally:
            shutil.rmtree(work_dir, ignore_errors=True)

    def _create_zip(self, work_dir, url, output_dir=None, suffix=""):
        if output_dir is None:
            output_dir = os.path.join(os.path.expanduser("~"), ".web_archiver", "archives")
        os.makedirs(output_dir, exist_ok=True)

        domain = urlparse(url).netloc.replace(":", "_")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if suffix:
            zip_name = f"{domain}_{timestamp}_{suffix}.zip"
        else:
            zip_name = f"{domain}_{timestamp}.zip"
        zip_path = os.path.join(output_dir, zip_name)
        counter = 1
        while os.path.exists(zip_path):
            zip_name = f"{domain}_{timestamp}_{counter}.zip"
            zip_path = os.path.join(output_dir, zip_name)
            counter += 1

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(work_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, work_dir)
                    zf.write(file_path, arcname)

        return zip_path

    def archive_batch(self, urls, output_dir=None):
        if output_dir is None:
            output_dir = os.path.join(os.path.expanduser("~"), ".web_archiver", "archives")
        os.makedirs(output_dir, exist_ok=True)

        zip_paths = []
        errors = []
        for idx, url in enumerate(urls):
            url = url.strip()
            if not url:
                continue
            try:
                zp = self.archive_url(url, output_dir)
                zip_paths.append(zp)
            except Exception as e:
                errors.append({"url": url, "error": str(e)})

        if not zip_paths:
            return None, errors

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        batch_zip_name = f"batch_{timestamp}.zip"
        batch_zip_path = os.path.join(output_dir, batch_zip_name)
        counter = 1
        while os.path.exists(batch_zip_path):
            batch_zip_name = f"batch_{timestamp}_{counter}.zip"
            batch_zip_path = os.path.join(output_dir, batch_zip_name)
            counter += 1

        seen_names = {}
        with zipfile.ZipFile(batch_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for zp in zip_paths:
                base_name = os.path.basename(zp)
                if base_name in seen_names:
                    seen_names[base_name] += 1
                    name, ext = os.path.splitext(base_name)
                    arcname = f"{name}_{seen_names[base_name]}{ext}"
                else:
                    seen_names[base_name] = 0
                    arcname = base_name
                zf.write(zp, arcname)

        total_size = sum(os.path.getsize(zp) for zp in zip_paths)
        self.logger.add_entry(
            url=f"[BATCH] {len(zip_paths)} URLs",
            status="success",
            archive_size=os.path.getsize(batch_zip_path),
            zip_path=batch_zip_path,
        )

        return batch_zip_path, errors
