import fs from 'fs'
import path from 'path'

import fsExtra from 'fs-extra'

import unzipper from 'unzipper'
import request from 'request-promise-native'

const betaUrls = {
  b: 'https://aka.ms/MinecraftBetaBehaviors',
  r: 'https://aka.ms/MinecraftBetaResources'
}
const retailUrls = {
  b: 'https://aka.ms/behaviorpacktemplate',
  r: 'https://aka.ms/resourcepacktemplate'
}
const urls = {
  beta: betaUrls,
  retail: retailUrls,
}

type FileTypes = 'beta' | 'retail'

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

const downloadFiles = async (type: FileTypes, version: string) => {
  // download the file for storage
  fsExtra.ensureDirSync('./scripts/cache/behaviours')
  fsExtra.ensureDirSync('./scripts/cache/resources')

  let location = path.resolve(`./scripts/cache/behaviours/${version}.zip`)
  if (!fs.existsSync(location)) await request(urls[type].b).pipe(fs.createWriteStream(location))

  location = path.resolve(`./scripts/cache/resources/${version}.zip`)
  if (!fs.existsSync(location)) await request(urls[type].r).pipe(fs.createWriteStream(location))
}

const unzip = async (url: string, type: FileTypes) => {
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
  const { minor: betaMinor, major: betaMajor, path: betaPath } = await unzip(betaUrls.b, 'beta')
  const { minor: retailMinor, major: retailMajor, path: retailPath } = await unzip(retailUrls.b, 'retail')

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
    const betaDirectory = path.resolve(`./scripts/out/${versions.beta.join('/')}`)
    if (!fsExtra.pathExistsSync(betaDirectory)) fsExtra.copySync(betaPath, betaDirectory)
    await downloadFiles('beta', betaMinor) // download the files for the cache
  }
  if (newRetail || force) {
    const stableDirectory = path.resolve(`./scripts/out/${versions.stable.join('/')}`)
    if (!fsExtra.pathExistsSync(stableDirectory)) fsExtra.copySync(retailPath, stableDirectory)
    await downloadFiles('retail', retailMinor) // download the files for the cache
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
