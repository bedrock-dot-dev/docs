from pathlib import Path

import requests
from github.GitRelease import GitRelease

from constants import Version, SAMPLES_REPO

def get_latest_releases() -> dict[str, str]:
  """
  Gets the latest releases from the tags.json file
  :return: A dict with the latest preview and stable versions
  """
  stable_version_map = requests.get(f'https://github.com/{SAMPLES_REPO}/raw/main/version.json').json()
  preview_version_map = requests.get(f'https://github.com/{SAMPLES_REPO}/raw/preview/version.json').json()

  return {
    Version.STABLE.value: stable_version_map['latest']['version'],
    Version.BETA.value: preview_version_map['latest']['version'],
  }

def download_release(release: GitRelease, cache_path: Path) -> None:
  """
  Downloads the given release to the given path
  """
  req = requests.get(release.zipball_url, stream=True)
  with open(cache_path, 'wb') as file:
    for chunk in req.iter_content(chunk_size=1024):
      file.write(chunk)
