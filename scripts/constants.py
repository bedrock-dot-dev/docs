import os
from enum import Enum
from pathlib import Path

SAMPLES_REPO = 'Mojang/bedrock-samples'

LINE = '-' * 20

ROOT = Path('../')
TAGS_PATH = Path('../tags.json')

CACHE_PATH = Path('./cache')

TMP_PATH = Path('./tmp')

IS_ACTIONS = 'GITHUB_ACTIONS' in os.environ

GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')

class Tags(Enum):
  STABLE = 'stable'
  BETA = 'beta'

TITLES = {
  Tags.STABLE.value: 'Stable',
  Tags.BETA.value: 'Preview',
}
