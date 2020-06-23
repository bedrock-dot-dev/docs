import { readFileStrSync } from 'https://deno.land/std@0.58.0/fs/mod.ts'
import { resolve } from 'https://deno.land/std@0.58.0/path/mod.ts'

import { unzip } from 'https://cdn.pika.dev/unzipit@^1.1.5'

import { FileTypes, urls, tmpDirectory } from './constants.ts'

export const unzipDocumentationFiles = async (type: FileTypes) => {
  const url = urls[type].b

  const docsPath = resolve(tmpDirectory + type) + '/'
  try {
    Deno.mkdirSync(docsPath, { recursive: true })
  } catch (e) {}

  const { entries } = await unzip(url)

  for (const [ name, entry ] of Object.entries(entries)) {
    if (name.startsWith('documentation/') && !(entry as any).isDirectory) {
      const localLocation = resolve(docsPath + name.replace('documentation/', ''))
      const buffer = await (entry as any).arrayBuffer()
      const unit8arr = new Deno.Buffer(buffer).bytes()
      Deno.writeFileSync(localLocation, unit8arr)
    }
  }

  let minorVersion: string = ''
  let majorVersion: string = ''

  // read from the unused index file the version
  const indexFile = readFileStrSync(resolve(docsPath + '/Index.html'))
  let versionString = indexFile.match(/Version: (\d+\.\d+\.\d+\.\d+)/)
  if (versionString) {
    if (versionString.length > 1) {
      minorVersion = versionString[1]
  
      const versionParts = minorVersion.split('.')
      majorVersion = `${versionParts[0]}.${versionParts[1]}.0.0`
    }
  }

  // delete the index file
  Deno.removeSync(resolve(docsPath + '/Index.html'))

  return { minor: minorVersion, major: majorVersion, path: docsPath }
}