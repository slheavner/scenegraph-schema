import { SchemaParser, ComponentParser } from './parsers'
import { readFileSync, writeFileSync } from 'fs'
import * as glob from 'globby'
import * as path from 'path'
import { Component } from './component.types'
import * as chokidar from 'chokidar'
import { Schema } from './schema'
import { ScriptSchema, Attribute } from './schema.types'
import { dedupe, BASE_NODE_SCHEMA, fslash, fetchSchema } from './utils'

export interface ProcessorOptions {
  scripts?: string[]
  components?: string[]
  output?: string
  root?: string
  watch?: boolean
  defineScripts?: boolean
}

interface ProcessorOptionsInternal {
  scripts: string[]
  components: string[]
  output: string
  src: string
  watch: boolean
  defineScripts: boolean
}

export class Processor {
  private componentParser = new ComponentParser()
  private schemaParser = new SchemaParser()
  private options: ProcessorOptionsInternal
  private schema?: Schema
  private componentFileMap: Map<string, string> = new Map()
  constructor(options: ProcessorOptions) {
    const root = options.root ?? './'

    this.options = {
      scripts: options.scripts?.map(fslash) ?? [
        path.join(root, 'source'),
        path.join(root, 'components')
      ],
      components: options.components?.map(fslash) ?? [
        path.join(root, 'components')
      ],
      src: root,
      output: options.output
        ? fslash(options.output)
        : `./${path.parse(process.cwd()).name}.xsd`,
      watch: !!options.watch,
      defineScripts: !!options.defineScripts
    }
    console.log(`Using base directory: ${this.options.src}`)
    console.log(`Searching for xml components in: ${this.options.components}`)
    console.log(`Searching for brs scripts in: ${this.options.scripts}`)
  }

  public async init(): Promise<void> {
    this.schema = await fetchSchema(true)
  }

  public async start() {
    await this.applyFixes()

    if (this.options.defineScripts) {
      await this.addScriptsToScriptUriAttribute()
    }

    const sorted = await this.findComponents()
    this.schema?.addOrUpdateAll(sorted)

    this.write()

    const onAddOrChange = async fpath => {
      try {
        if (path.parse(fpath).ext === '.xml') {
          const c = await this.componentParser.parse(
            readFileSync(fpath).toString()
          )
          this.schema?.addOrUpdateComponent(c)
          console.log('writing update for component: ' + c.component.name)
          this.write()
        }
      } catch (err) {
        console.error(err)
      }
    }

    const onDelete = async fpath => {
      try {
        const name = this.componentFileMap.get(fpath)
        if (path.parse(fpath).ext === '.xml' && name) {
          this.schema?.removeComponent(name)
          this.componentFileMap.delete(fpath)
        }
      } catch (err) {
        console.error(err)
      }
    }

    if (this.options.watch) {
      const watcher = chokidar
        .watch(this.options.components, {
          awaitWriteFinish: true,
          ignoreInitial: true,
          persistent: true
        })
        .on('add', onAddOrChange)
        .on('change', onAddOrChange)
        .on('unlink', onDelete)
    }
  }

  private async write() {
    this.schema
      ? writeFileSync(
        this.options.output,
        await this.schemaParser.build(this.schema?.getSchema())
      )
      : console.log('uh oh')
  }

  private parseGlob(input: string, ext = 'xml'): string {
    let result
    if (input.endsWith('/')) {
      result = input + '{**/,*}*.' + ext
    } else {
      result = input + '/{**/,*}*.' + ext
    }
    return result
  }

  private async findComponents(): Promise<Component[]> {
    const { components } = this.options
    const parsedComponents: string[] = await glob(components.map(c => this.parseGlob(c)))
    const componentList = await this.all<string, Component>(parsedComponents, async f => {
      const xml = readFileSync(f)
      const c = await this.componentParser.parse(xml.toString())
      this.componentFileMap.set(f, c.component.name)
      return c
    })
    const sorted = this.componentParser.sortComponents(componentList)
    return sorted
  }

  private async all<A, B>(arr: A[], f: (e: A) => Promise<B>): Promise<B[]> {
    return await Promise.all(arr.map(f))
  }

  /**
   * experimental, need to add options and better logic for finding root
   * @param input
   */
  private formatScriptToPkg(input: string) {
    const abs = path.resolve(input).replace(/\\/g, '/')
    if (abs.includes('/source/')) {
      return 'pkg:' + abs.substring(abs.indexOf('/source/'))
    } else if (abs.includes('/components/')) {
      return 'pkg:' + abs.substring(abs.indexOf('/components/'))
    }
  }

  private async findScripts(): Promise<string[]> {
    const scripts: string[][] = await this.all(this.options.scripts, s => {
      return glob(this.parseGlob(s, 'brs'))
    })
    return dedupe(scripts.reduce((p, n) => p.concat(n), []))
      .map(this.formatScriptToPkg)
      .filter(s => !!s)
  }

  protected async applyFixes() {
    // fix component children options
    this.schema.getComponentType().complexType.choice.maxOccurs = 'unbounded'
    this.schema.getInterfaceType().complexType.choice.maxOccurs = 'unbounded'

    // add a lowercase option for alwaysnotify
    this.schema?.addFieldAttribute({
      name: 'alwaysnotify'
    })

    // make this not required
    this.schema?.modifyFieldAttribute('type', a => ({ ...a, use: undefined }))

    // add missing <field type={value}
    this.schema?.addFieldType(
      'boolean',
      'bool',
      'associativearray',
      'str',
      'int'
    )

    // add the base node
    this.schema?.addOrUpdateComponent(BASE_NODE_SCHEMA)

    // do any last minute modifications to base components
    this.schema?.getComponentDefinitions().forEach(e => {
      // add the role attribute to all elements
      if (!e.complexType.attribute?.find(a => a.name === 'role')) {
        if (!e.complexType.attribute) {
          e.complexType.attribute = []
        }
        e.complexType.attribute.push({
          name: 'role',
          type: 'xs:string'
        })
      }
    })
  }

  protected async addScriptsToScriptUriAttribute() {
    // add the script files to src in script schema
    const scripts = await this.findScripts()
    const scriptType: ScriptSchema = this.schema
      .getComponentType()
      .complexType.choice.element.find(e => e.name === 'script') as ScriptSchema
    const uriAttr: Attribute = scriptType.complexType.attribute.find(
      a => a.name === 'uri'
    )
    uriAttr.simpleType = {
      restriction: {
        base: 'xs:string',
        enumeration: [
          ...scripts.map(s => {
            return { value: s }
          })
        ]
      }
    }
  }
}
