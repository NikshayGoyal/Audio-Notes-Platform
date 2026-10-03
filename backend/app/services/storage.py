from functools import lru_cache
from pathlib import Path
import shutil
from typing import BinaryIO

import boto3
from botocore.config import Config

from app.config import get_settings


class ObjectStorage:
    def __init__(self) -> None:
        settings = get_settings()
        self.local_root = (
            Path(settings.local_storage_path).resolve()
            if settings.local_development_mode
            else None
        )
        if self.local_root is not None:
            self.local_root.mkdir(parents=True, exist_ok=True)
            self.bucket = settings.storage_bucket
            self.client = None
            return
        self.bucket = settings.storage_bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.storage_endpoint_url,
            region_name=settings.storage_region,
            aws_access_key_id=settings.storage_access_key,
            aws_secret_access_key=settings.storage_secret_key,
            config=Config(s3={"addressing_style": "path" if settings.storage_force_path_style else "auto"}),
        )

    def _local_path(self, key: str) -> Path:
        if self.local_root is None:
            raise RuntimeError("Local storage is not enabled")
        candidate = (self.local_root / key).resolve()
        if self.local_root not in candidate.parents:
            raise ValueError("Invalid storage key")
        return candidate

    def upload(self, stream: BinaryIO, key: str, content_type: str) -> None:
        if self.local_root is not None:
            destination = self._local_path(key)
            destination.parent.mkdir(parents=True, exist_ok=True)
            with destination.open("wb") as output:
                shutil.copyfileobj(stream, output)
            return
        assert self.client is not None
        self.client.upload_fileobj(stream, self.bucket, key, ExtraArgs={"ContentType": content_type})

    def download(self, key: str, destination: BinaryIO) -> None:
        if self.local_root is not None:
            with self._local_path(key).open("rb") as source:
                shutil.copyfileobj(source, destination)
            return
        assert self.client is not None
        self.client.download_fileobj(self.bucket, key, destination)

    def delete(self, key: str) -> None:
        if self.local_root is not None:
            self._local_path(key).unlink(missing_ok=True)
            return
        assert self.client is not None
        self.client.delete_object(Bucket=self.bucket, Key=key)


@lru_cache
def get_storage() -> ObjectStorage:
    return ObjectStorage()
