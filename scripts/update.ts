import fs from 'fs'
import path from 'path'

import fsExtra from 'fs-extra'

import unzipper from 'unzipper'
import request from 'request-promise-native'

const betaUrl = 'https://aka.ms/MinecraftBetaBehaviors'
const retailUrl = 'https://aka.ms/behaviorpacktemplate'

const isLocal = process.platform !== 'linux'

const versionsPath = path.resolve('./tags.json')
const tmpDirectory = './scripts/tmp/'

type TagsType = {
  stable: string[]
  beta: string[]
}

type ResultType = {
  versions?: TagsType
  update?: string | false
  error: boolean
}

const unzip = async (url: string, type: 'beta' | 'retail') => {
  // @ts-ignore
  const directory = await unzipper.Open.url(request, url)

  const docsPath = path.resolve(tmpDirectory + type) + '/'

  if (!fs.existsSync(docsPath)) fs.mkdirSync(path.resolve(docsPath), { recursive: true })

  const unzipFilesPromises = directory.files
    .filter((f: unzipper.File) => f.path.startsWith('documentation/') && f.path !== 'documentation/')
    .map((f: unzipper.File) => 
      new Promise((resolve) => {
        f.stream().pipe(fs.createWriteStream(
            path.resolve(
              docsPath + f.path.replace('documentation/', '')
            )
          ))
          .on('error', (e) => console.log(e))
          .on('finish', resolve)
      })
    )

  // unzip everything
  await Promise.all(unzipFilesPromises)

  let minorVersion: string = ''
  let majorVersion: string = ''

  // read from the unused index file the version
  const indexFile = fs.readFileSync(path.resolve(docsPath + '/Index.html'), 'utf8')
  let versionString = indexFile.match(/Version: (\d+\.\d+\.\d+\.\d+)/)
  if (versionString && versionString.length > 1) {
    minorVersion = versionString[1]

    const versionParts = minorVersion.split('.')
    majorVersion = `${versionParts[0]}.${versionParts[1]}.0.0`
  }

  // delete the index file
  fs.unlinkSync(path.resolve(docsPath + '/Index.html'))

  return { minor: minorVersion, major: majorVersion, path: docsPath }
}

const main = async (force: boolean = false) => {
  const { minor: betaMinor, major: betaMajor, path: betaPath } = await unzip(betaUrl, 'beta')
  const { minor: retailMinor, major: retailMajor, path: retailPath } = await unzip(retailUrl, 'retail')

  const versions: TagsType = JSON.parse(fs.readFileSync(versionsPath, 'utf8'))

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

  // update tags if beta
  if (newBeta || newRetail || force) fs.writeFileSync(versionsPath, JSON.stringify(versions, null, 2))

  // copy the files to the new directory
  if (newBeta || force) {
    const betaDirectory = path.resolve(`./${versions.beta.join('/')}`)
    if (!fsExtra.pathExistsSync(betaDirectory)) fsExtra.copySync(betaPath, betaDirectory)
  }
  if (newRetail || force) {
    const stableDirectory = path.resolve(`./${versions.stable.join('/')}`)
    if (!fsExtra.pathExistsSync(stableDirectory)) fsExtra.copySync(retailPath, stableDirectory)
  }

  let commitTitleParts = []
  if (newBeta) commitTitleParts.push(`Beta ${betaMinor}`)
  if (newRetail) commitTitleParts.push(`Release ${retailMinor}`)

  let result: ResultType = { versions, update: false, error: false }

  // talk to github actions
  if (newBeta || newRetail) {
    result['update'] = commitTitleParts.join(', ')
  }

  fsExtra.removeSync(path.resolve(tmpDirectory))

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
