import os
from pathlib import Path

from constants import IS_ACTIONS

def get_major_version(version: str) -> str:
  """
  Gets the major version from the given version
  """
  return '.'.join(version.split('.')[:2] + ['0', '0'])

def get_version_parts(version_id: str) -> list[str]:
  """
  Gets the path to the given version ID
  """
  return [get_major_version(version_id), version_id]

def get_path_from_version_id(version_id: str) -> Path:
  """
  Gets the path to the given version ID
  """
  return Path(*get_version_parts(version_id))

def write_to_github_output(key: str, value: str) -> None:
  """
  Writes the given string to the GitHub Actions output
  """

  if not IS_ACTIONS:
    print(f'Not in GitHub Actions, skipping output: {key}={value}')
    return

  output_file = os.getenv('GITHUB_OUTPUT')

  with open(output_file, 'a') as file:
    file.write(f'{key}={value}\n')
