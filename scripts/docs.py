import shutil, re
from pathlib import Path

import constants as Constants
from util import MinecraftVersion

def get_docs_update(version: MinecraftVersion, source_path: Path) -> None:
  documentation_path = Constants.TMP_PATH / version.as_path()
  shutil.copytree(source_path, documentation_path, dirs_exist_ok=True)
  print(f'Copied {version}')

  doc_version = prepare_documentation(documentation_path)

  if doc_version == None:
    print('Unable to find version in documentation')

  if doc_version != None and doc_version != version:
    print(f'Warning: Got version {doc_version} (from documentation) instead of expected {version}. Continuing process.')

def prepare_documentation(documentation_path: Path) -> MinecraftVersion | None:
  """
  Prepares the documentation for storage
  :param documentation_path: The path containing the documentation
  :return: The version of the documentation
  """
  doc_version = None

  possible_index_file = ['Index.html', 'index.html']
  for index_file_name in possible_index_file:
    possible_file_path = documentation_path / index_file_name
    if possible_file_path.exists():
      doc_version = _read_version_from_doc_file(possible_file_path)
      # delete the index file
      possible_file_path.unlink()

  # fix the schemas file formatting
  _fix_schemas_file(documentation_path / 'Schemas.html')

  return doc_version

def _read_version_from_doc_file(file_path: Path) -> MinecraftVersion | None:
  """
  Reads the version from the given doc path
  """
  with open(file_path, 'r') as file:
    index_content = file.read()
    # gets the version number from the index file
    version_match = re.search(r'Version: (\d+\.\d+\.\d+\.\d+)', index_content)
    if version_match:
      return MinecraftVersion(version_match.group(1))
  return None

def _fix_schemas_file(path: Path) -> None:
  """
  Fixes the schemas file formatting
  """
  schemas_content = path.read_text()

  def replace_in_markdown(match):
    content = match.group(1)
    # remove the lines
    content = re.sub(r'<\/br>-+<\/br>', '\n', content)
    # remove the br tags
    content = re.sub(r'<\/?br ?\/?>', '\n', content)
    return content

  # replace the content surrounded with markdown code blocks using the function above
  schemas_content = re.sub(r'(?<=```)(.*?)(?=```)', replace_in_markdown, schemas_content, flags=re.S)
  path.write_text(schemas_content)
