import { resolve } from 'https://deno.land/std@0.58.0/path/mod.ts'

export enum FileTypes {
  Beta = 'beta',
  Retail = 'retail',
}

const betaUrls = {
  b: 'https://aka.ms/MinecraftBetaBehaviors',
  r: 'https://aka.ms/MinecraftBetaResources'
}

const retailUrls = {
  b: 'https://aka.ms/behaviorpacktemplate',
  r: 'https://aka.ms/resourcepacktemplate'
}

export const urls = {
  [FileTypes.Beta]: betaUrls,
  [FileTypes.Retail]: retailUrls,
}

export const versionsPath = resolve('./tags.json')
export const tmpDirectory = './scripts/tmp/'
