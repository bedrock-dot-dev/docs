import { readJsonSync, writeFileStrSync } from 'https://deno.land/std@0.61.0/fs/mod.ts'
import { resolve } from 'https://deno.land/std@0.61.0/path/mod.ts'

import { unzipDocumentationFiles } from './lib/unzip.ts'
import { copyDocumentationFiles } from './lib/download.ts'
import { versionsPath, tmpDirectory, FileTypes } from './lib/constants.ts'

type TagsType = {
  stable: [string, string]
  beta: [string, string]
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
  const { minor: betaMinor, major: betaMajor, path: betaPath } = await unzipDocumentationFiles(FileTypes.Beta)
  const { minor: retailMinor, major: retailMajor, path: retailPath } = await unzipDocumentationFiles(FileTypes.Retail)

  // parse the versions file
  const versions: TagsType = readJsonSync(versionsPath) as TagsType

  let newBeta = false
  let newRetail = false

  if (versions.beta[1] !== betaMinor) {
    newBeta = true
    versions.beta = [ betaMajor, betaMinor ]
  }
  if (versions.stable[1] !== retailMinor) {
    newRetail = true
    versions.stable = [ retailMajor, retailMinor ]
  }

  if (newBeta || newRetail || force) {
    // update the file containing the mapping
    writeFileStrSync(versionsPath, JSON.stringify(versions, null, 2))

    if (newBeta || force) copyDocumentationFiles(FileTypes.Beta, betaPath, versions.beta)
    if (newRetail || force) copyDocumentationFiles(FileTypes.Retail, retailPath, versions.stable)
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
    if (newBeta) {
      result.update.beta = {
        updated: true,
        name: betaMinor,
        path: [betaMajor, betaMinor].join('/')
      }
    }
    if (newRetail) {
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
    output = { error: e }
  }
  console.log(JSON.stringify(output))
})()
