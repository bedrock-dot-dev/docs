import { readJsonSync, writeFileStrSync } from 'https://deno.land/std@0.61.0/fs/mod.ts'
import { resolve } from 'https://deno.land/std@0.61.0/path/mod.ts'

import { unzipDocumentationFiles } from './lib/unzip.ts'
import { copyDocumentationFiles } from './lib/download.ts'
import { versionsPath, tmpDirectory, FileTypes } from './lib/constants.ts'

type TagsType = {
  stable: [string, string]
  beta: [string, string]
  notes: string;
}

type UpdateVersionType = {
  name?: string
  path?: string
  updated: boolean
}

type ResultType = {
  versions?: TagsType
  update?: {
    beta: UpdateVersionType
    stable: UpdateVersionType
  }
  error: boolean
}

const main = async (force: boolean = false) => {
  //Get repo name from args, fallback to hardcoded value
  const repoName = Deno.args[0] || "stirante/docs";
  //Get last commit date for notes folder from GH API
  const lastNotes = await fetch("https://api.github.com/repos/" + repoName + "/commits?path=notes")
      .then(value => value.text())
      .then(value => JSON.parse(value)[0].commit.committer.date);
  const { minor: betaMinor, major: betaMajor, path: betaPath } = await unzipDocumentationFiles(FileTypes.Beta)
  const { minor: retailMinor, major: retailMajor, path: retailPath } = await unzipDocumentationFiles(FileTypes.Retail)

  // parse the versions file
  const versions: TagsType = readJsonSync(versionsPath) as TagsType

  let newBeta = false
  let newRetail = false
  let newNotes = false

  if (versions.beta[1] !== betaMinor) {
    newBeta = true
    versions.beta = [ betaMajor, betaMinor ]
  }
  if (versions.stable[1] !== retailMinor) {
    newRetail = true
    versions.stable = [ retailMajor, retailMinor ]
  }
  if (versions.notes !== lastNotes) {
    newNotes = true
    versions.notes = lastNotes
  }

  if (newBeta || newRetail || force || newNotes) {
    // update the file containing the mapping
    writeFileStrSync(versionsPath, JSON.stringify(versions, null, 2))

    if (newBeta || force || newNotes) copyDocumentationFiles(FileTypes.Beta, betaPath, versions.beta)
    if (newRetail || force || newNotes) copyDocumentationFiles(FileTypes.Retail, retailPath, versions.stable)
  }

  let result: ResultType = {
    versions,
    update: {
      stable: { updated: false },
      beta: { updated: false },
    },
    error: false
  }

  // talk to github actions
  if (result.update) {
    if (newBeta || newNotes) {
      result.update.beta = {
        updated: true,
        name: betaMinor,
        path: [betaMajor, betaMinor].join('/')
      }
    }
    if (newRetail || newNotes) {
      result.update.stable = {
        updated: true,
        name: retailMinor,
        path: [retailMajor, retailMinor].join('/')
      }
    }
  }

  Deno.removeSync(resolve(tmpDirectory), { recursive: true })

  return result
}

(async () => {
  let output: ResultType = { error: true }
  try {
    output = await main()
  } catch (e) {
    //Use toString, because some errors are blank
    output = { error: e.toString() }
  }
  console.log(JSON.stringify(output))
})()
