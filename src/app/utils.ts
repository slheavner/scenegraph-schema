import { Field, Component } from './component.types'
import { Schema } from './schema'
import { readFileSync } from 'fs'
import { join } from 'path'
import { SchemaParser } from './parsers'

/**
 * Dedupes a string array
 * @param arr array to dedupe
 */
export function dedupe(arr: string[]): string[] {
  const result = arr.reduce((p: { [key: string]: boolean }, n) => {
    p[n] = true
    return p
  }, {})
  return Object.keys(result)
}

export function fslash(input: string): string {
  return input.replace(/\\/g, '/')
}

export const BASE_NODE_SCHEMA: Component = {
  component: {
    name: 'Node',
    extends: '',
    interface: {
      field: [
        {
          id: 'id',
          type: 'string'
        },
        {
          id: 'focusedChild',
          value: 'NA'
        },
        {
          id: 'focusable',
          type: 'boolean'
        },
        {
          id: 'change',
          type: 'assocarray'
        }
      ] as Field[]
    }
  }
}

export async function fetchSchema(
  local: boolean,
  localPath = undefined
): Promise<Schema> {
  let rawData: string
  if (!local) {
    rawData = 'not implemented'
  } else {
    if (!localPath) {
      localPath = join(__dirname, '../../assets/RokuSceneGraph.xsd')
    }
    rawData = readFileSync(localPath).toString()
  }
  const parsedSchema = await new SchemaParser().parse(
    rawData
      .replace(
        /default="(internal instance default| |read-only|system default)"/g,
        ''
      ) // invalid schema values
      .replace(/"&quot;(On|Off)&quot;"/g, '"$1"') // bad qoute serialization
      .replace(/xs:sequence/g, 'xs:choice') // childern|interface|scipt are not required duh
      .replace('"string, str"', '"string"')
      .replace('"integer, int"', '"integer"')
      .replace('"Boolean, bool"', '"Boolean"')
  )
  return new Schema(parsedSchema)
}
