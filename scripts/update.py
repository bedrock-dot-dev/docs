import json, shutil, subprocess

from github import Github

from releases import get_latest_releases, SAMPLES_REPO
from util import get_path_from_version_id, get_version_parts, write_to_github_output
from docs import get_docs_update

from constants import Version, LINE, ROOT, TMP_PATH, TAGS_PATH, TITLES, IS_ACTIONS

g = Github()

def do_versioned_commits(updates: list[tuple[str, str]], msg: str) -> None:
  """
  Performs two commits to show the git diff.
  :param updates: A list of tuples of the form (old_version, new_version)
  :param msg: The commit message
  """

  if not IS_ACTIONS:
    print('Not in GitHub Actions, skipping commit.')
    print(f'Updates: {updates}')
    print(f'Message: {msg}')
    return

  for prev, new in updates:
    print(f'Copying {prev} to {new} for versioning commit...')

    prev_path = ROOT / get_path_from_version_id(prev)
    new_path = ROOT / get_path_from_version_id(new)

    if not prev_path.exists():
      print(f'Previous version path {prev_path} does not exist')
      exit(1)

    shutil.copytree(prev_path, new_path, dirs_exist_ok=True)

    print(f'Copied documentation files from {prev_path} to {new_path}')

  copy_previous_version_msg = f'Copy previous version files for "{msg}"'
  print(f'Committing "{copy_previous_version_msg}"')

  # add previous files commit
  subprocess.run(['git', 'add', '--all'], cwd=ROOT)
  subprocess.run(['git', 'commit', '-m', copy_previous_version_msg], cwd=ROOT)

  # copy new files
  shutil.copytree(TMP_PATH, ROOT, dirs_exist_ok=True)

  final_msg = f'Docs update: {msg}'
  print(f'Committing "{final_msg}"')

  subprocess.run(['git', 'add', '--all'], cwd=ROOT)
  subprocess.run(['git', 'commit', '-m', final_msg], cwd=ROOT)

  subprocess.run(['git', 'push'], cwd=ROOT)

def main() -> None:
  repo = g.get_repo(SAMPLES_REPO)
  releases = repo.get_releases()

  latest_releases = get_latest_releases()
  tags = json.loads(TAGS_PATH.read_text())

  # mapping of version tag to current and latest release
  release_data: dict[Version, dict[str, str]] = {}
  for version in Version:
    latest_version_id = latest_releases[version.value]
    current_version_id = tags[version.value][1]
    release_data[version.value] = {
      'current': current_version_id,
      'latest': latest_version_id,
    }

  print('Release data:', json.dumps(release_data, indent=2))
  print(LINE)

  # write as a github actions output
  write_to_github_output('release_data', json.dumps(release_data))

  commit_msg_parts = []
  version_updates = []

  def check_update(version: Version) -> bool:
    current_version = release_data[version.value]['current']
    latest_version = release_data[version.value]['latest']

    if current_version != latest_version:
      # get the release with the latest version
      git_release = next(release for release in releases if release.title.startswith('v' + latest_version))
      print(f'New {version.name} version found: {latest_version}')
      # download and extract the release
      get_docs_update(latest_version, git_release)

      # add previous and new version to copy
      version_updates.append((current_version, latest_version))
      # add to commit message
      commit_msg_parts.append(f'{TITLES[version.value]} {latest_version}')

      tags[version.value] = get_version_parts(latest_version)
      return True

    return False

  new_stable = check_update(Version.STABLE)
  new_beta = check_update(Version.BETA)

  has_update = new_stable or new_beta
  write_to_github_output('update', str(has_update).lower())

  if has_update:
    print(LINE)

    commit_msg = ', '.join(commit_msg_parts)
    write_to_github_output('msg', commit_msg)

    print(f'Commit message `{commit_msg}`')

    TAGS_PATH.write_text(json.dumps(tags, indent=2))

    do_versioned_commits(version_updates, commit_msg)

    print(LINE)
    print('Done')
  else:
    print('No updates found')

if __name__ == '__main__':
  main()
