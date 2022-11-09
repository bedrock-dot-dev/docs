import os
from pathlib import Path

import constants as Constants

class MinecraftVersion():
  def __init__(self, version_id: str):
    """
    Creates a new MinecraftVersion instance
    :param version_id: The version id
    """

    self.version_id = version_id
    elements = version_id.split('.')

    self.major = '.'.join(elements[:2] + ['0', '0'])

  def __str__(self) -> str:
    return self.version_id

  def __repr__(self) -> str:
    return f'MinecraftVersion({self.__str__()})'

  def __eq__(self, other) -> bool:
    if not isinstance(other, MinecraftVersion):
      return False
    return self.version_id == other.version_id

  def parts(self) -> list[str]:
    """
    Gets the parts of the version id
    :return: A list of the parts
    """
    return [self.major, self.version_id]

  def as_path(self) -> Path:
    """
    Gets the version id as a path for storage
    :return: The version id as a path
    """
    return Path(*self.parts())

def ensure_required_paths() -> None:
  """
  Ensures that the required paths exist
  """
  Constants.TMP_PATH.mkdir(exist_ok=True, parents=True)
  Constants.CACHE_PATH.mkdir(exist_ok=True, parents=True)

def write_to_github_output(key: str, value: str) -> None:
  """
  Writes the given string to the GitHub Actions output
  """

  if not Constants.IS_ACTIONS:
    print(f'Not in GitHub Actions, skipping output: {key}={value}')
    return

  output_file = os.getenv('GITHUB_OUTPUT')

  with open(output_file, 'a') as file:
    file.write(f'{key}={value}\n')
