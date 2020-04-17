import { Schema } from './schema'
import { readFileSync } from 'fs'
import { SchemaParser } from './parsers'
import { Component } from './component.types'
const parser = new SchemaParser()

describe('schema', () => {
  let schema: Schema | undefined
  let parsedSchema = null
  const testComponent = {
    component: {
      name: 'mycomponent',
      extends: 'Group',
      interface: {
        field: [
          {
            id: 'myfield',
            type: 'string'
          }
        ]
      }
    }
  }
  beforeEach(async () => {
    if (!parsedSchema) {
      const rawData = readFileSync('./assets/RokuSceneGraph.xsd').toString()
      parsedSchema = await parser.parse(
        rawData
          .replace(/default="internal instance default"/g, '') // invalid schema values
          .replace(/"&quot;(On|Off)&quot;"/g, '"$1"') // bad qoute serialization
          .replace(/xs:sequence/g, 'xs:choice') // childern|interface|scipt are not required duh
      )
    }
    schema = new Schema(parsedSchema)
  })

  it('removes components', () => {
    expect(
      schema
        .getSchema()
        .schema.group.choice.choice.element.find(e => e.name === 'Group')
    ).toBeDefined()
    schema.removeComponent('Group')
    expect(
      schema
        .getSchema()
        .schema.group.choice.choice.element.find(e => e.name === 'Group')
    ).toBeUndefined()
  })

  it('adds components', () => {
    expect(
      schema
        .getSchema()
        .schema.group.choice.choice.element.find(e => e.name === 'mycomponent')
    ).toBeUndefined()
    schema.addOrUpdateComponent(testComponent)
    expect(
      schema
        .getSchema()
        .schema.group.choice.choice.element.find(e => e.name === 'mycomponent')
    ).toBeDefined()
    expect(
      schema
        .getExtendsAttribute()
        .simpleType.restriction.enumeration.find(e => e.value === 'mycomponent')
    ).toBeDefined()
  })

  it('updates components', () => {
    schema.addOrUpdateComponent(testComponent)
    expect(
      schema
        .getSchema()
        .schema.group.choice.choice.element.find(e => e.name === 'mycomponent')
        .complexType.attribute.find(n => n.name === 'newField')
    ).toBeUndefined()

    const updated: Component = JSON.parse(JSON.stringify(testComponent))
    updated.component.interface.field.push({
      id: 'newField',
      type: 'string'
    })
    schema.addOrUpdateComponent(updated)
    expect(
      schema
        .getSchema()
        .schema.group.choice.choice.element.find(e => e.name === 'mycomponent')
        .complexType.attribute.find(a => a.name === 'newField')
    ).toBeDefined()
  })

  it('adds field types', () => {
    schema.addFieldType('firstType', 'secondType')
    const fieldTypes = schema
      .getFieldType('field')
      .complexType.attribute.find(a => a.name === 'type')
      .simpleType.restriction.enumeration.map(a => a.value)
    expect(fieldTypes).toContain('firstType')
    expect(fieldTypes).toContain('secondType')
  })

  it('modifies field attributes', () => {
    const before = schema.getFieldType('field').complexType.attribute[0]
    const result = schema.modifyFieldAttribute('type', a => ({
      ...a,
      use: 'testValue'
    }))
    expect(result).toBe(true)
    expect(
      schema.getAttribute(
        'type',
        schema.getFieldType('field').complexType.attribute
      ).use
    ).toBe('testValue')
    expect(schema.getFieldType('field').complexType.attribute[0]).toStrictEqual(
      before
    )
  })

  it('returns false if didnt modify attribute', () => {
    const result = schema.modifyFieldAttribute('asdf', a => ({
      ...a,
      use: 'testValue'
    }))
    expect(result).toBe(false)
  })
})
