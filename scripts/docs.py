import zipfile, re
from pathlib import Path

from github.GitRelease import GitRelease

import constants as Constants
from releases import download_release
from util import MinecraftVersion

def get_docs_update(version: MinecraftVersion, release: GitRelease) -> None:
  documentation_cache_path = Constants.CACHE_PATH / f'{version}.zip'
  download_release(release, documentation_cache_path)
  print(f'Downloaded {version}')

  doc_version = unzip_documentation_from_release(Constants.TMP_PATH / version.as_path(), documentation_cache_path)

  if doc_version == None:
    print('Unable to find version in documentation')

  if doc_version != None and doc_version != version:
    print(f'Got version {doc_version} (from documentation) instead of expected {version}')
    exit(1)

def unzip_documentation_from_release(documentation_path: Path, cache_path: Path) -> MinecraftVersion | None:
  """
  Unzips the documentation from the given release
  :param documentation_path: The path to extract the documentation to
  :param cache_path: The path to the cached release zip
  :return: The version of the documentation
  """
  documentation_path.mkdir(exist_ok=True, parents=True)

  with zipfile.ZipFile(cache_path, 'r') as archive:
    for file in archive.namelist():
      if file.endswith('.html'):
        file_path = Path(file)
        if file_path.parent.name == 'documentation':
          data = archive.read(file)
          (documentation_path / file_path.name).write_bytes(data)

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

def _read_version_from_doc_file(index_path: Path) -> MinecraftVersion | None:
  """
  Reads the version from the given doc path
  """
  with open(index_path, 'r') as file:
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
