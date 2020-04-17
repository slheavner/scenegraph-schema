import {
  SceneGraphRootSchema,
  ComponentSchema,
  InterfaceSchema,
  InstanceSchema as ComponentDefinition,
  FieldType,
  Attribute
} from './schema.types'
import { Component } from './component.types'
import { ComponentParser } from './parsers'

export type AttributeModifier = (attr: Attribute) => Attribute

export class Schema {
  componentParser = new ComponentParser()
  constructor(private schema: SceneGraphRootSchema) {}

  public getComponentType(): ComponentSchema {
    return this.schema.schema.element
  }

  public getInterfaceType(): InterfaceSchema {
    return this.getComponentType().complexType.choice
      .element[0] as InterfaceSchema
  }

  public getScriptType(): InterfaceSchema {
    return this.getComponentType().complexType.choice
      .element[1] as InterfaceSchema
  }

  public getChildrenType(): InterfaceSchema {
    return this.getComponentType().complexType.choice
      .element[2] as InterfaceSchema
  }

  public getComponentDefinitions(): ComponentDefinition[] {
    return this.schema.schema.group.choice.choice.element
  }

  public getComponentByName(name: string): ComponentDefinition | undefined {
    return this.getComponentDefinitions().find(c => c.name === name)
  }

  public getFieldType(name: string): FieldType {
    return this.getInterfaceType().complexType.choice.element.find(
      f => f.name === name
    )
  }

  public getAttribute(name: string, attributes: Attribute[]) {
    return attributes.find(a => a.name === name)
  }

  public getExtendsAttribute() {
    return this.getComponentType().complexType.attribute.find(
      a => a.name === 'extends'
    )
  }

  public addOrUpdateComponent(sgnode: Component) {
    const found = this.getComponentDefinitions().findIndex(
      v => v.name === sgnode.component.name
    )
    if (found >= 0) {
      this.getComponentDefinitions()[
        found
      ] = this.componentParser.toNodeElement(sgnode, this.schema)
    } else {
      this.getComponentDefinitions().push(
        this.componentParser.toNodeElement(sgnode, this.schema)
      )
      this.getExtendsAttribute().simpleType?.restriction.enumeration.push({
        value: sgnode.component.name
      })
    }
  }

  public removeComponent(name: string) {
    const simpletype: any = this.getExtendsAttribute().simpleType
    simpletype.restriction.enumeration = this.getExtendsAttribute().simpleType?.restriction.enumeration.filter(
      e => e.value !== name
    )
    this.schema.schema.group.choice.choice.element = this.getComponentDefinitions().filter(
      e => e.name !== name
    )
  }

  public addOrUpdateAll(sgnodes: Component[]) {
    sgnodes.forEach(n => {
      this.addOrUpdateComponent(n)
    })
  }

  public addFieldAttribute(attr: Attribute) {
    this.getFieldType('field').complexType.attribute.push(attr)
  }

  public addFieldType(...name: string[]) {
    const typeAttr = this.getFieldType('field').complexType.attribute.find(
      a => a.name === 'type'
    )
    if (typeAttr) {
      name.forEach(n => {
        typeAttr.simpleType?.restriction.enumeration.push({
          value: n
        })
      })
    }
  }

  public modifyFieldAttribute(
    name: string,
    modifier: AttributeModifier
  ): boolean {
    const fieldAttributes = this.getFieldType('field').complexType.attribute
    const attr = fieldAttributes.findIndex(a => a.name === name)
    if (attr >= 0) {
      fieldAttributes[attr] = modifier(fieldAttributes[attr])
    }
    return attr >= 0
  }

  public getSchema() {
    return this.schema
  }
}
