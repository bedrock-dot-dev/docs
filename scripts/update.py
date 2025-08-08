import json, shutil, subprocess, shlex

from github import Github

from releases import get_latest_releases
from util import MinecraftVersion, write_to_github_output, ensure_required_paths
from docs import get_docs_update

import constants as Constants
from constants import Tags

def do_versioned_commits(updates: list[tuple[MinecraftVersion, MinecraftVersion]], msg: str) -> None:
  """
  Performs two commits to show the git diff.
  :param updates: A list of tuples of the form (old_version, new_version)
  :param msg: The commit message
  """

  if not Constants.IS_ACTIONS:
    print('Not in GitHub Actions, skipping commit.')
    print(f'Updates: {updates}')
    print(f'Message: {msg}')
    return

  for prev, new in updates:
    print(f'Copying {prev} to {new} for versioning commit...')

    prev_path = Constants.ROOT / prev.as_path()
    new_path = Constants.ROOT / new.as_path()

    if not prev_path.exists():
      print(f'Previous version path {prev_path} does not exist')
      exit(1)

    shutil.copytree(prev_path, new_path, dirs_exist_ok=True)

    print(f'Copied documentation files from {prev_path} to {new_path}')

  copy_previous_version_msg = f'Copy previous version files for "{msg}"'
  print(f'Committing "{copy_previous_version_msg}"')

  # add previous files commit
  subprocess.run(shlex.split('git add --all'), cwd=Constants.ROOT)
  subprocess.run(shlex.split(f'git commit -m \'{copy_previous_version_msg}\''), cwd=Constants.ROOT)

  # copy new files
  shutil.copytree(Constants.TMP_PATH, Constants.ROOT, dirs_exist_ok=True)

  final_msg = f'Docs update: {msg}'
  print(f'Committing "{final_msg}"')

  subprocess.run(shlex.split('git add --all'), cwd=Constants.ROOT)
  subprocess.run(shlex.split(f'git commit -m \'{final_msg}\''), cwd=Constants.ROOT)

  subprocess.run(shlex.split('git push'), cwd=Constants.ROOT)

def main() -> None:
  ensure_required_paths()

  if not Constants.GITHUB_TOKEN:
    print('GITHUB_TOKEN not set, subject to stricter rate limits.')

  repo = Github(login_or_token=Constants.GITHUB_TOKEN, per_page=100).get_repo(Constants.SAMPLES_REPO)
  releases = repo.get_releases()

  latest_releases = get_latest_releases()
  tags = json.loads(Constants.TAGS_PATH.read_text())

  # mapping of version tag to current and latest release
  release_data: dict[Tags, dict[str, str]] = {}
  for tag in Tags:
    latest_version_id = latest_releases[tag.value]
    current_version_id = tags[tag.value][1]
    release_data[tag.value] = {
      'current': current_version_id,
      'latest': latest_version_id,
    }

  print('Release data:', json.dumps(release_data, indent=2))
  print(Constants.LINE)

  # write as a github actions output
  write_to_github_output('release_data', json.dumps(release_data))

  commit_msg_parts = []
  version_updates = []

  def check_update(tag: Tags) -> bool:
    """
    Checks if the given tag has an update and performs the update process if so
    :param tag: The version tag to check
    :return: True if there is an update, False otherwise
    """

    current_version = MinecraftVersion(release_data[tag.value]['current'])
    latest_version = MinecraftVersion(release_data[tag.value]['latest'])

    prereleases = [r for r in releases if r.prerelease]
    regular_releases = [r for r in releases if not r.prerelease]
    
    if prereleases:
      print(f'Latest pre-release: {prereleases[0].title}')
    if regular_releases:
      print(f'Latest regular release: {regular_releases[0].title}')

    if latest_version > current_version:
      # get the release with the latest version
      try:
        git_release = next(release for release in releases if release.title.startswith(f'v{latest_version}'))
      except StopIteration:
        print(f'Available releases: {[release.title for release in releases]}')
        
        raise Exception(f'No release found for {latest_version}.')

      print(f'New {tag.name} version found: {latest_version}')
      # download and extract the release
      get_docs_update(latest_version, git_release)

      # add previous and new version to copy
      version_updates.append((current_version, latest_version))
      # add to commit message
      commit_msg_parts.append(f'{Constants.TITLES[tag.value]} {latest_version}')

      tags[tag.value] = latest_version.parts()
      return True
    elif latest_version < current_version:
      error_msg = f'ERROR: Latest {tag.name} version {latest_version} is older than current version {current_version}.'
      print(error_msg)
      raise Exception(error_msg)
    else:
      # Versions are equal, no update needed
      print(f'{tag.name} version {current_version} is up to date')
      return False

  new_stable = check_update(Tags.STABLE)
  new_beta = check_update(Tags.BETA)

  has_update = new_stable or new_beta
  write_to_github_output('update', str(has_update).lower())

  if has_update:
    print(Constants.LINE)

    commit_msg = ', '.join(commit_msg_parts)
    write_to_github_output('msg', commit_msg)

    print(f'Commit message `{commit_msg}`')

    Constants.TAGS_PATH.write_text(json.dumps(tags, indent=2))

    do_versioned_commits(version_updates, commit_msg)

    print(Constants.LINE)
    print('Done')
  else:
    print('No updates found')

if __name__ == '__main__':
  main()
