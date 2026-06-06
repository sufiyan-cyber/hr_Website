"""
AWS S3 Upload Utility — Phase 2

Handles uploading resume files and other documents to S3.
Returns public (or pre-signed) URLs.
"""

import os
import uuid
from datetime import datetime
from typing import Literal

import boto3
from botocore.exceptions import BotoCoreError, ClientError


# ---------------------------------------------------------------------------
# S3 client (lazy-loaded)
# ---------------------------------------------------------------------------

_s3_client = None


def _get_s3():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
            region_name=os.environ.get("AWS_REGION", "us-east-1"),
        )
    return _s3_client


def _get_bucket() -> str:
    bucket = os.environ.get("AWS_S3_BUCKET")
    if not bucket:
        raise RuntimeError("AWS_S3_BUCKET environment variable is not set.")
    return bucket


# ---------------------------------------------------------------------------
# Upload helpers
# ---------------------------------------------------------------------------

FileCategory = Literal["resumes", "job_descriptions", "other"]


def upload_file(
    file_bytes: bytes,
    original_filename: str,
    content_type: str,
    category: FileCategory = "resumes",
) -> str:
    """
    Upload a file to S3 and return its public URL.

    The file is stored at:
      {category}/{YYYY}/{MM}/{uuid}_{original_filename}

    Args:
        file_bytes:         Raw file bytes.
        original_filename:  Original uploaded filename (for key suffix).
        content_type:       MIME type (e.g., 'application/pdf').
        category:           S3 'folder' prefix.

    Returns:
        Public S3 URL string.
    """
    s3 = _get_s3()
    bucket = _get_bucket()

    now = datetime.utcnow()
    unique_id = str(uuid.uuid4())[:8]
    safe_name = _sanitize_filename(original_filename)
    key = f"{category}/{now.year}/{now.month:02d}/{unique_id}_{safe_name}"

    try:
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
    except (BotoCoreError, ClientError) as exc:
        raise RuntimeError(f"S3 upload failed for '{original_filename}': {exc}") from exc

    region = os.environ.get("AWS_REGION", "us-east-1")
    url = f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
    return url


def upload_text(
    text_content: str,
    filename: str,
    category: FileCategory = "job_descriptions",
) -> str:
    """
    Upload plain text content (e.g., a job description) as a .txt file to S3.
    Returns the S3 URL.
    """
    text_bytes = text_content.encode("utf-8")
    return upload_file(
        file_bytes=text_bytes,
        original_filename=filename,
        content_type="text/plain; charset=utf-8",
        category=category,
    )


def _sanitize_filename(name: str) -> str:
    """Make filename S3-key-safe."""
    import re
    name = re.sub(r"[^\w.\-]", "_", name)
    return name[:80]  # cap length


def _extract_key_from_url(url: str) -> str | None:
    """Extract S3 object key from a full S3 URL."""
    # Format: https://{bucket}.s3.{region}.amazonaws.com/{key}
    bucket = _get_bucket()
    region = os.environ.get("AWS_REGION", "us-east-1")
    prefix = f"https://{bucket}.s3.{region}.amazonaws.com/"
    if url.startswith(prefix):
        return url[len(prefix):]
    return None


def generate_presigned_url(url: str, expiration: int = 3600) -> str:
    """
    Generate a short-lived presigned URL for a given S3 URL.
    Returns the original URL if it's not an S3 URL or generation fails.
    """
    key = _extract_key_from_url(url)
    if not key:
        return url
        
    s3 = _get_s3()
    bucket = _get_bucket()
    
    try:
        presigned = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=expiration,
        )
        return presigned
    except Exception:
        return url


def download_file_bytes(url: str) -> bytes | None:
    """
    Download file bytes directly using boto3 using the file URL.
    Used for backend processing without needing public bucket access.
    """
    key = _extract_key_from_url(url)
    if not key:
        return None
        
    s3 = _get_s3()
    bucket = _get_bucket()
    
    try:
        resp = s3.get_object(Bucket=bucket, Key=key)
        return resp["Body"].read()
    except Exception as e:
        raise RuntimeError(f"Failed to download from S3: {e}")

