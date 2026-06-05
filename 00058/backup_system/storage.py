import os
import shutil
import tarfile
import hashlib
from pathlib import Path
from typing import Optional, Tuple, List
from abc import ABC, abstractmethod
from .config import ConfigManager, StorageConfig
from .logger import get_logger


class StorageBackend(ABC):
    @abstractmethod
    def upload(self, local_path: str, remote_path: str) -> bool:
        pass

    @abstractmethod
    def download(self, remote_path: str, local_path: str) -> bool:
        pass

    @abstractmethod
    def exists(self, remote_path: str) -> bool:
        pass

    @abstractmethod
    def delete(self, remote_path: str) -> bool:
        pass

    @abstractmethod
    def list_files(self, remote_path: str) -> List[str]:
        pass


class LocalStorage(StorageBackend):
    def __init__(self, config: StorageConfig):
        self._base_path = Path(config.local_path)
        self._base_path.mkdir(parents=True, exist_ok=True)
        self._logger = get_logger("storage.local")

    def upload(self, local_path: str, remote_path: str) -> bool:
        try:
            src = Path(local_path)
            dst = self._base_path / remote_path
            dst.parent.mkdir(parents=True, exist_ok=True)
            
            if src.is_dir():
                if dst.exists():
                    shutil.rmtree(dst)
                shutil.copytree(src, dst)
            else:
                shutil.copy2(src, dst)
            
            self._logger.info(f"Uploaded {local_path} to {dst}")
            return True
        except Exception as e:
            self._logger.error(f"Failed to upload {local_path}: {e}")
            return False

    def download(self, remote_path: str, local_path: str) -> bool:
        try:
            src = self._base_path / remote_path
            dst = Path(local_path)
            dst.parent.mkdir(parents=True, exist_ok=True)
            
            if src.is_dir():
                if dst.exists():
                    shutil.rmtree(dst)
                shutil.copytree(src, dst)
            else:
                shutil.copy2(src, dst)
            
            self._logger.info(f"Downloaded {src} to {local_path}")
            return True
        except Exception as e:
            self._logger.error(f"Failed to download {remote_path}: {e}")
            return False

    def exists(self, remote_path: str) -> bool:
        return (self._base_path / remote_path).exists()

    def delete(self, remote_path: str) -> bool:
        try:
            path = self._base_path / remote_path
            if path.exists():
                if path.is_dir():
                    shutil.rmtree(path)
                else:
                    path.unlink()
                self._logger.info(f"Deleted {path}")
            return True
        except Exception as e:
            self._logger.error(f"Failed to delete {remote_path}: {e}")
            return False

    def list_files(self, remote_path: str) -> List[str]:
        try:
            base = self._base_path / remote_path
            if not base.exists():
                return []
            return [str(p.relative_to(self._base_path)) for p in base.rglob("*")]
        except Exception as e:
            self._logger.error(f"Failed to list files in {remote_path}: {e}")
            return []


class SshStorage(StorageBackend):
    def __init__(self, config: StorageConfig):
        self._host = config.remote_host
        self._port = config.remote_port
        self._user = config.remote_user
        self._remote_path = config.remote_path
        self._logger = get_logger("storage.ssh")
        
        try:
            import paramiko
            self._paramiko = paramiko
        except ImportError:
            self._logger.error("paramiko library not installed. SSH storage unavailable.")
            self._paramiko = None

    def _get_client(self):
        if not self._paramiko:
            raise ImportError("paramiko library is required for SSH storage")
        
        client = self._paramiko.SSHClient()
        client.set_missing_host_key_policy(self._paramiko.AutoAddPolicy())
        client.connect(self._host, port=self._port, username=self._user, timeout=30)
        return client

    def upload(self, local_path: str, remote_path: str) -> bool:
        try:
            client = self._get_client()
            sftp = client.open_sftp()
            
            full_remote_path = f"{self._remote_path}/{remote_path}"
            
            self._ensure_remote_dir(sftp, str(Path(full_remote_path).parent))
            
            src = Path(local_path)
            if src.is_dir():
                for file_path in src.rglob("*"):
                    if file_path.is_file():
                        rel_path = file_path.relative_to(src)
                        remote_file = f"{full_remote_path}/{rel_path}"
                        self._ensure_remote_dir(sftp, str(Path(remote_file).parent))
                        sftp.put(str(file_path), remote_file)
            else:
                sftp.put(str(src), full_remote_path)
            
            sftp.close()
            client.close()
            
            self._logger.info(f"Uploaded {local_path} to {self._host}:{full_remote_path}")
            return True
        except Exception as e:
            self._logger.error(f"Failed to upload via SSH: {e}")
            return False

    def download(self, remote_path: str, local_path: str) -> bool:
        try:
            client = self._get_client()
            sftp = client.open_sftp()
            
            full_remote_path = f"{self._remote_path}/{remote_path}"
            dst = Path(local_path)
            dst.parent.mkdir(parents=True, exist_ok=True)
            
            sftp.get(full_remote_path, str(dst))
            
            sftp.close()
            client.close()
            
            self._logger.info(f"Downloaded {self._host}:{full_remote_path} to {local_path}")
            return True
        except Exception as e:
            self._logger.error(f"Failed to download via SSH: {e}")
            return False

    def exists(self, remote_path: str) -> bool:
        try:
            client = self._get_client()
            sftp = client.open_sftp()
            
            full_remote_path = f"{self._remote_path}/{remote_path}"
            try:
                sftp.stat(full_remote_path)
                exists = True
            except IOError:
                exists = False
            
            sftp.close()
            client.close()
            return exists
        except Exception as e:
            self._logger.error(f"Failed to check existence via SSH: {e}")
            return False

    def delete(self, remote_path: str) -> bool:
        try:
            client = self._get_client()
            sftp = client.open_sftp()
            
            full_remote_path = f"{self._remote_path}/{remote_path}"
            
            try:
                sftp.remove(full_remote_path)
            except IOError:
                stdin, stdout, stderr = client.exec_command(f"rm -rf {full_remote_path}")
                stdout.channel.recv_exit_status()
            
            sftp.close()
            client.close()
            
            self._logger.info(f"Deleted {self._host}:{full_remote_path}")
            return True
        except Exception as e:
            self._logger.error(f"Failed to delete via SSH: {e}")
            return False

    def list_files(self, remote_path: str) -> List[str]:
        try:
            client = self._get_client()
            sftp = client.open_sftp()
            
            full_remote_path = f"{self._remote_path}/{remote_path}"
            files = []
            
            stdin, stdout, stderr = client.exec_command(f"find {full_remote_path} -type f")
            for line in stdout:
                files.append(line.strip().replace(f"{self._remote_path}/", ""))
            
            sftp.close()
            client.close()
            return files
        except Exception as e:
            self._logger.error(f"Failed to list files via SSH: {e}")
            return []

    def _ensure_remote_dir(self, sftp, remote_dir: str):
        try:
            sftp.stat(remote_dir)
        except IOError:
            parent = str(Path(remote_dir).parent)
            if parent != remote_dir:
                self._ensure_remote_dir(sftp, parent)
            sftp.mkdir(remote_dir)


class S3Storage(StorageBackend):
    def __init__(self, config: StorageConfig):
        self._bucket = config.s3_bucket
        self._region = config.s3_region
        self._access_key = config.s3_access_key
        self._secret_key = config.s3_secret_key
        self._logger = get_logger("storage.s3")
        
        try:
            import boto3
            self._s3 = boto3.client(
                's3',
                region_name=self._region,
                aws_access_key_id=self._access_key,
                aws_secret_access_key=self._secret_key
            )
        except ImportError:
            self._logger.error("boto3 library not installed. S3 storage unavailable.")
            self._s3 = None

    def upload(self, local_path: str, remote_path: str) -> bool:
        if not self._s3:
            return False
        
        try:
            src = Path(local_path)
            if src.is_dir():
                for file_path in src.rglob("*"):
                    if file_path.is_file():
                        rel_path = file_path.relative_to(src)
                        key = f"{remote_path}/{rel_path}"
                        self._s3.upload_file(str(file_path), self._bucket, key)
            else:
                self._s3.upload_file(str(src), self._bucket, remote_path)
            
            self._logger.info(f"Uploaded {local_path} to s3://{self._bucket}/{remote_path}")
            return True
        except Exception as e:
            self._logger.error(f"Failed to upload to S3: {e}")
            return False

    def download(self, remote_path: str, local_path: str) -> bool:
        if not self._s3:
            return False
        
        try:
            dst = Path(local_path)
            dst.parent.mkdir(parents=True, exist_ok=True)
            
            self._s3.download_file(self._bucket, remote_path, str(dst))
            
            self._logger.info(f"Downloaded s3://{self._bucket}/{remote_path} to {local_path}")
            return True
        except Exception as e:
            self._logger.error(f"Failed to download from S3: {e}")
            return False

    def exists(self, remote_path: str) -> bool:
        if not self._s3:
            return False
        
        try:
            self._s3.head_object(Bucket=self._bucket, Key=remote_path)
            return True
        except Exception:
            return False

    def delete(self, remote_path: str) -> bool:
        if not self._s3:
            return False
        
        try:
            self._s3.delete_object(Bucket=self._bucket, Key=remote_path)
            self._logger.info(f"Deleted s3://{self._bucket}/{remote_path}")
            return True
        except Exception as e:
            self._logger.error(f"Failed to delete from S3: {e}")
            return False

    def list_files(self, remote_path: str) -> List[str]:
        if not self._s3:
            return []
        
        try:
            files = []
            paginator = self._s3.get_paginator('list_objects_v2')
            for page in paginator.paginate(Bucket=self._bucket, Prefix=remote_path):
                if 'Contents' in page:
                    for obj in page['Contents']:
                        files.append(obj['Key'])
            return files
        except Exception as e:
            self._logger.error(f"Failed to list S3 files: {e}")
            return []


class StorageManager:
    _instance = None
    _backend: Optional[StorageBackend] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._backend is None:
            self._config = ConfigManager().config
            self._logger = get_logger("storage")
            self._init_backend()

    def _init_backend(self):
        storage_config = self._config.storage
        
        if storage_config.type == "s3":
            self._backend = S3Storage(storage_config)
        elif storage_config.type == "ssh":
            self._backend = SshStorage(storage_config)
        else:
            self._backend = LocalStorage(storage_config)
        
        self._logger.info(f"Using storage backend: {storage_config.type}")

    @property
    def backend(self) -> StorageBackend:
        return self._backend

    def upload_backup(self, local_path: str, system_name: str, 
                     backup_version: str) -> Tuple[bool, str]:
        remote_path = f"{system_name}/{backup_version}"
        success = self._backend.upload(local_path, remote_path)
        return success, remote_path

    def download_backup(self, system_name: str, backup_path: str,
                       local_path: str) -> bool:
        if backup_path.startswith(f"{system_name}/"):
            remote_path = backup_path
        else:
            remote_path = f"{system_name}/{backup_path}"
        return self._backend.download(remote_path, local_path)

    def delete_backup(self, system_name: str, backup_path: str) -> bool:
        if backup_path.startswith(f"{system_name}/"):
            remote_path = backup_path
        else:
            remote_path = f"{system_name}/{backup_path}"
        return self._backend.delete(remote_path)

    def backup_exists(self, system_name: str, backup_version: str) -> bool:
        remote_path = f"{system_name}/{backup_version}"
        return self._backend.exists(remote_path)


def calculate_file_hash(file_path: str, algorithm: str = "sha256") -> str:
    hash_obj = hashlib.new(algorithm)
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            hash_obj.update(chunk)
    return hash_obj.hexdigest()


def calculate_directory_hash(dir_path: str, algorithm: str = "sha256") -> Tuple[str, List[Tuple[str, str, int]]]:
    hash_obj = hashlib.new(algorithm)
    file_hashes = []
    root = Path(dir_path)
    
    for file_path in sorted(root.rglob("*")):
        if file_path.is_file():
            rel_path = str(file_path.relative_to(root))
            file_hash = calculate_file_hash(str(file_path), algorithm)
            file_size = file_path.stat().st_size
            file_hashes.append((rel_path, file_hash, file_size))
            hash_obj.update(f"{rel_path}:{file_hash}".encode("utf-8"))
    
    return hash_obj.hexdigest(), file_hashes


def create_tarball(source_dir: str, output_path: str, 
                  excludes: Optional[List[str]] = None) -> Tuple[bool, int]:
    try:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        
        with tarfile.open(output_path, "w:gz") as tar:
            root = Path(source_dir)
            for item in root.rglob("*"):
                if item.is_file():
                    rel_path = item.relative_to(root)
                    
                    if excludes:
                        import fnmatch
                        skip = False
                        for pattern in excludes:
                            if fnmatch.fnmatch(str(rel_path), pattern):
                                skip = True
                                break
                        if skip:
                            continue
                    
                    tar.add(str(item), arcname=str(rel_path))
        
        total_size = Path(output_path).stat().st_size
        return True, total_size
    except Exception as e:
        get_logger("storage").error(f"Failed to create tarball: {e}")
        return False, 0


def extract_tarball(tar_path: str, output_dir: str) -> bool:
    try:
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        with tarfile.open(tar_path, "r:gz") as tar:
            tar.extractall(output_dir)
        
        return True
    except Exception as e:
        get_logger("storage").error(f"Failed to extract tarball: {e}")
        return False
