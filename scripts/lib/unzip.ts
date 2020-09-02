import { readFileStrSync, writeFileStrSync } from 'https://deno.land/std@0.61.0/fs/mod.ts'
import { resolve } from 'https://deno.land/std@0.61.0/path/mod.ts'

import { unzip } from 'https://unpkg.com/unzipit@1.3.1/dist/unzipit.module.js'

import { FileTypes, urls, tmpDirectory } from './constants.ts'
import { formatSchemas } from './clean.ts'

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

  const schemasFilePath = resolve(docsPath + '/Schemas.html')
  const schemasFile = readFileStrSync(schemasFilePath)
  const formattedSchemas = formatSchemas(schemasFile)
  writeFileStrSync(schemasFilePath, formattedSchemas)

  return { minor: minorVersion, major: majorVersion, path: docsPath }
}