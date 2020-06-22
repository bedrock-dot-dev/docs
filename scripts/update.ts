import { copySync, existsSync, readFileStrSync, writeFileStrSync } from 'https://deno.land/std@0.58.0/fs/mod.ts'
import * as path from 'https://deno.land/std@0.58.0/path/mod.ts'

import * as unzipit from 'https://cdn.pika.dev/unzipit@^1.1.5'

const betaUrls = {
  b: 'https://aka.ms/MinecraftBetaBehaviors',
  r: 'https://aka.ms/MinecraftBetaResources'
}
const retailUrls = {
  b: 'https://aka.ms/behaviorpacktemplate',
  r: 'https://aka.ms/resourcepacktemplate'
}

enum FileTypes {
  Beta = 'beta',
  Retail = 'retail',
}

const urls = {
  [FileTypes.Beta]: betaUrls,
  [FileTypes.Retail]: retailUrls,
}

// const isLocal = Deno.build.os === 'darwin'

const versionsPath = path.resolve('./tags.json')
const tmpDirectory = './scripts/tmp/'

type TagsType = {
  stable: string[]
  beta: string[]
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

const downloadFile = async (url: string, path: string) => {
  const res = await fetch(url)
  if (res.body) {
    const file = await Deno.open(path, { create: true, write: true })
    for await (const chunk of res.body) {
      await Deno.writeAll(file, chunk)
    }
    file.close()
  }
}

const downloadFiles = async (type: FileTypes, version: string) => {
  // download the file for storage
  try {
    Deno.mkdirSync('./scripts/cache/behaviours', { recursive: true })
    Deno.mkdirSync('./scripts/cache/resources', { recursive: true })
  } catch (e) {}

  const behavioursLocation = path.resolve(`./scripts/cache/behaviours/${version}.zip`)
  await downloadFile(urls[type].b, behavioursLocation)

  const resourcesLocation = path.resolve(`./scripts/cache/resources/${version}.zip`)
  await downloadFile(urls[type].r, resourcesLocation)
}

const unzip = async (url: string, type: FileTypes) => {
  const docsPath = path.resolve(tmpDirectory + type) + '/'
  try {
    Deno.mkdirSync(docsPath, { recursive: true })
  } catch (e) {}

  const { entries } = await unzipit.unzip(url)

  for (const [ name, entry ] of Object.entries(entries)) {
    if (name.startsWith('documentation/') && !(entry as any).isDirectory) {
      const localLocation =  path.resolve(docsPath + name.replace('documentation/', ''))
      const buffer = await (entry as any).arrayBuffer()
      const unit8arr = new Deno.Buffer(buffer).bytes()
      Deno.writeFileSync(localLocation, unit8arr)
    }
  }

  let minorVersion: string = ''
  let majorVersion: string = ''

  // read from the unused index file the version
  const indexFile = readFileStrSync(path.resolve(docsPath + '/Index.html'))
  let versionString = indexFile.match(/Version: (\d+\.\d+\.\d+\.\d+)/)
  if (versionString) {
    if (versionString.length > 1) {
      minorVersion = versionString[1]
  
      const versionParts = minorVersion.split('.')
      majorVersion = `${versionParts[0]}.${versionParts[1]}.0.0`
    }
  }

  // delete the index file
  Deno.removeSync(path.resolve(docsPath + '/Index.html'))

  return { minor: minorVersion, major: majorVersion, path: docsPath }
}

const main = async (force: boolean = false) => {
  const { minor: betaMinor, major: betaMajor, path: betaPath } = await unzip(betaUrls.b, FileTypes.Beta)
  const { minor: retailMinor, major: retailMajor, path: retailPath } = await unzip(retailUrls.b, FileTypes.Retail)

  const versions: TagsType = JSON.parse(readFileStrSync(versionsPath, { encoding: 'utf8' }))

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
  if (newBeta || newRetail || force) writeFileStrSync(versionsPath, JSON.stringify(versions, null, 2))

  // copy the files to the new directory
  if (newBeta || force) {
    const betaDirectory = path.resolve(`./scripts/out/${versions.beta.join('/')}`)
    if (!existsSync(betaDirectory)) copySync(betaPath, betaDirectory)
    await downloadFiles(FileTypes.Beta, betaMinor) // download the behaviours and resources files for the cache
  }
  if (newRetail || force) {
    const stableDirectory = path.resolve(`./scripts/out/${versions.stable.join('/')}`)
    if (!existsSync(stableDirectory)) copySync(retailPath, stableDirectory)
    await downloadFiles(FileTypes.Retail, retailMinor) // download the behaviours and resources files for the cache
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

  Deno.removeSync(path.resolve(tmpDirectory), { recursive: true })

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
