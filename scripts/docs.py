import zipfile, re
from pathlib import Path

from github.GitRelease import GitRelease

from constants import CACHE_PATH, TMP_PATH
from releases import download_release
from util import get_path_from_version_id

def get_docs_update(version_id: str, release: GitRelease) -> None:
  documentation_cache_path = CACHE_PATH / (version_id + '.zip')
  download_release(release, documentation_cache_path)
  print(f'Downloaded {version_id}')

  doc_version = unzip_documentation_from_release(TMP_PATH / get_path_from_version_id(version_id), documentation_cache_path)

  if version_id != doc_version:
    print(f'Got version {doc_version} (from documentation) instead of expected {version_id}')
    version_id = doc_version

def unzip_documentation_from_release(documentation_path: Path, cache_path: Path) -> str:
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

  index_path = documentation_path / 'Index.html'
  doc_version = _read_version_from_index(index_path)
  # delete the index file
  index_path.unlink()

  # fix the schemas file formatting
  _fix_schemas_file(documentation_path / 'Schemas.html')

  return doc_version

def _read_version_from_index(index_path: Path) -> str:
  """
  Reads the version from the given index path
  """
  with open(index_path, 'r') as file:
    index_content = file.read()
    version_match = re.search(r'Version: (\d+\.\d+\.\d+\.\d+)', index_content)
    if version_match:
      return version_match.group(1)
  return ''

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

  schemas_content = re.sub(r'(?<=```)(.*?)(?=```)', replace_in_markdown, schemas_content, flags=re.S)
  path.write_text(schemas_content)
