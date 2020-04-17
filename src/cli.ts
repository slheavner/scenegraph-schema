#!/usr/bin/env node
import * as minimist from 'minimist'
import { Processor } from './app/processor'
const p = require('../package.json')
const help = `
  Usage:
    scenegraph-schema [options]
    sgschema [options]

  Options:
    -c, --components DIR,DIR      comma separated list of component directories, default: components
    -s, --scripts DIR,DIR         comma separated list of script directories, default: components,source
    -o, --output FILENAME         filename for output, defaults do {dirName}.xsd
    -w, --watch                   watch all directories for changes, experimental
    -r, --root                    root directory for project files, used to create package paths
                                    (https://devtools.web.roku.com/schema/RokuSceneGraph.xsd)
    -d, --defineScripts           turn on script.uri attribute enumeration, will limit script.uri to
                                    brs files detected in the project, and support autocomplete
    -h, --help                    this thing
    -v, --version                 version duh
`

interface RawArgs {
  components?: string
  scripts?: string
  output?: string
  root?: string
  watch: boolean
  version: boolean
  defineScripts: boolean
}

interface ProperArgs {
  components?: string[]
  scripts?: string[]
  output?: string
  root?: string
  watch: boolean
  version: boolean
  defineScripts: boolean
}

function main(...args: string[]) {
  const options = parseOptions(...args)
  if (options.version) {
    console.log(p.version)
    process.exit()
  }
  run(options)
}

function parseOptions(...args: string[]): ProperArgs {
  const input: RawArgs = (minimist(args, {
    string: ['components', 'scripts', 'output', 'root'],
    boolean: ['watch', 'version', 'defineScripts'],
    default: {
      watch: false,
      version: false,
      defineScripts: false
    },
    alias: {
      components: 'c',
      scripts: 's',
      output: 'o',
      root: 'r',
      watch: 'w',
      version: 'v',
      defineScripts: 'd'
    },
    unknown: (arg: string) => {
      if (arg !== '-h' && arg !== '--help') {
        console.error('unknown option: ' + arg)
      }
      console.log(help)
      process.exit(-1)
    }
  }) as unknown) as RawArgs
  const {
    components,
    scripts,
    watch,
    output,
    root,
    version,
    defineScripts
  } = input
  const options: ProperArgs = {
    components: components?.split(','),
    scripts: scripts?.split(','),
    root,
    output,
    watch,
    version,
    defineScripts
  }
  return options
}

function run(options: ProperArgs) {
  const processor = new Processor(options)
  processor
    .init()
    .then(v => processor.start().then(() => { }))
}

main(...process.argv.slice(2))
