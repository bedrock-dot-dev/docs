import os
from enum import Enum
from pathlib import Path

LINE = '-' * 20

ROOT = Path('../')
TAGS_PATH = Path('../tags.json')

CACHE_PATH = Path('./cache')

TMP_PATH = Path('./tmp')

IS_ACTIONS = 'GITHUB_ACTIONS' in os.environ
DRY_RUN = os.environ.get('DRY_RUN') == 'true'

class Tags(Enum):
  STABLE = 'stable'
  BETA = 'beta'

SOURCES = {
  Tags.STABLE.value: CACHE_PATH / 'stable',
  Tags.BETA.value: CACHE_PATH / 'preview',
}

TITLES = {
  Tags.STABLE.value: 'Stable',
  Tags.BETA.value: 'Preview',
}
