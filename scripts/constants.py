import os
from enum import Enum
from pathlib import Path

SAMPLES_REPO = 'Mojang/bedrock-samples'

LINE = '-' * 20

ROOT = Path('../')
TAGS_PATH = Path('../tags.json')

CACHE_PATH = Path('./cache')
CACHE_PATH.mkdir(exist_ok=True, parents=True)

TMP_PATH = Path('./tmp')
TMP_PATH.mkdir(exist_ok=True, parents=True)

IS_ACTIONS = 'GITHUB_ACTIONS' in os.environ

class Version(Enum):
  STABLE = 'stable'
  BETA = 'beta'

TITLES = {
  Version.STABLE.value: 'Stable',
  Version.BETA.value: 'Preview',
}
