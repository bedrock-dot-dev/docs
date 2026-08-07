import json

import constants as Constants
from constants import Tags

def get_latest_versions() -> dict[str, str]:
  """
  Gets the latest versions from the checked out version files
  :return: A dict with the latest preview and stable versions
  """
  stable_version_map = json.loads((Constants.SOURCES[Tags.STABLE.value] / 'version.json').read_text())
  preview_version_map = json.loads((Constants.SOURCES[Tags.BETA.value] / 'version.json').read_text())

  return {
    Tags.STABLE.value: stable_version_map['latest']['version'],
    Tags.BETA.value: preview_version_map['latest']['version'],
  }
