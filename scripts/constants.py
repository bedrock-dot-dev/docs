import os
from enum import Enum
from pathlib import Path

LINE = '-' * 20

SCRIPTS_PATH = Path(__file__).resolve().parent
ROOT = SCRIPTS_PATH.parent
TAGS_PATH = ROOT / 'tags.json'

CACHE_PATH = SCRIPTS_PATH / 'cache'

TMP_PATH = SCRIPTS_PATH / 'tmp'

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
