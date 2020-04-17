import { SceneGraphRootSchema, InstanceSchema, Attribute } from './schema.types'
import { toJson, toXml, JsonOptions, XmlOptions } from 'xml2json'
import { Component } from './component.types'

abstract class Parser<T> {
  protected formatOptions: XmlOptions
  protected parseOptions: JsonOptions
  abstract async parse(input: string): Promise<T>
  abstract async build(input: T): Promise<string>
}

/**
 * Parses the base SceneGraphSchema.xsd
 */
export class SchemaParser extends Parser<SceneGraphRootSchema> {
  protected parseOptions: JsonOptions = {
    arrayNotation: ['attribute', 'enumration'],
    reversible: true,
    sanitize: false
  }
  protected formatOptions: XmlOptions = {
    sanitize: true
  }

  async parse(input: string): Promise<SceneGraphRootSchema> {
    input = input.replace(/<(\/?)xs:([a-zA-Z])/g, '<$1$2')
    const result = JSON.parse(toJson(input, this.parseOptions))
    return result
  }

  async build(xmlObject: SceneGraphRootSchema): Promise<string> {
    const result = toXml(xmlObject, this.formatOptions)
    return result.replace(/<(\/?)(.*?)>/g, '<$1xs:$2>')
  }
}

/**
 * Parses project defined SGNode components
 */
export class ComponentParser extends Parser<Component> {
  protected parseOptions: JsonOptions = {
    arrayNotation: ['field', 'script'],
    reversible: true,
    sanitize: false
  }
  protected formatOptions: XmlOptions = {
    sanitize: true
  }
  /**
   * Recursive search for a components parents
   * @see sortComponents
   * @param component base componet to find parents
   * @param components list of all components to search for the parent in
   */
  getParentComponents(
    component: Component,
    components: Component[]
  ): Component[] {
    const parent = components.find(
      c => c.component.name === component.component.extends
    )
    if (parent) {
      return [component, ...this.getParentComponents(parent, components)]
    } else {
      return []
    }
  }
  /**
   * Parse SGNode component xml data
   * @param input string of xml data
   */
  async parse(input: string): Promise<Component> {
    const result = JSON.parse(toJson(input, this.parseOptions))
    return result
  }

  /**
   * @deprecated
   * to xml, unused
   * @param xmlObject
   */
  async build(xmlObject: Component): Promise<string> {
    const result = toXml(xmlObject, this.formatOptions)
    return result
  }

  /**
   * Sort components based on their parent node (extends attribute)
   * @param components to sort
   */
  sortComponents(components: Component[]) {
    return components.sort((prev, next) => {
      return (
        this.getParentComponents(prev, components).length -
        this.getParentComponents(next, components).length
      )
    })
  }

  /**
   * Finds the base attributes from the parent node if it exists in the schema.
   *
   * Make sure the components you are adding are sorted
   * @param name name of the componet to find
   * @param schema root schema to search in
   */
  private getBaseAttributes(
    name: string,
    schema: SceneGraphRootSchema
  ): Attribute[] {
    const node = schema.schema.group.choice.choice.element.find(
      e => e.name === name
    )
    return node ? node.complexType.attribute : []
  }

  /**
   * Convert an SGNode to a component schema
   * @param root the SGNode to conver
   * @param schema the root schema object (used to find base fields i.e. from Group )
   */
  toNodeElement(root: Component, schema: SceneGraphRootSchema): InstanceSchema {
    const { component } = root
    const attributes = [
      ...this.getBaseAttributes(component.extends, schema),
      ...(component.interface?.field
        ?.map(f => {
          const attr: Attribute = {
            name: f.id,
            default: f.value,
            type: 'xs:string' // TODO: use actual xs:type?
          }
          return attr
        })
        .filter(f => !!f.name) ?? [])
    ].reduce((prev: { [key: string]: Attribute }, next: Attribute) => {
      if (!prev[next.name]) {
        prev[next.name] = next
      } else {
        console.warn(
          `duplicate field "${next.name}" in component "${component.name}"`
        )
      }
      return prev
    }, {})
    return {
      name: component.name,
      complexType: {
        group: {
          ref: 'allNodes'
        },
        attribute: Object.values(attributes)
      }
    }
  }
}
