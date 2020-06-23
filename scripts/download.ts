import { copySync, existsSync } from 'https://deno.land/std@0.58.0/fs/mod.ts'
import { resolve } from 'https://deno.land/std@0.58.0/path/mod.ts'

import { urls, FileTypes } from './constants.ts'

export const downloadFile = async (url: string, path: string) => {
  const res = await fetch(url)
  if (res.body) {
    const file = await Deno.open(path, { create: true, write: true })
    for await (const chunk of res.body) {
      await Deno.writeAll(file, chunk)
    }
    file.close()
  }
}

export const downloadFiles = async (type: FileTypes, version: string) => {
  // download the file for storage
  try {
    Deno.mkdirSync('./scripts/cache/behaviours', { recursive: true })
    Deno.mkdirSync('./scripts/cache/resources', { recursive: true })
  } catch (e) {}

  const behavioursLocation = resolve(`./scripts/cache/behaviours/${version}.zip`)
  await downloadFile(urls[type].b, behavioursLocation)

  const resourcesLocation = resolve(`./scripts/cache/resources/${version}.zip`)
  await downloadFile(urls[type].r, resourcesLocation)
}

export const copyDocumentationFiles = async (type: FileTypes, currentPath: string, version: [string, string]) => {
  const directory = resolve(`./scripts/out/${version.join('/')}`)
  if (!existsSync(directory)) copySync(currentPath, directory)
  await downloadFiles(type, version[1]) // download the behaviours and resources files for the cache
}
