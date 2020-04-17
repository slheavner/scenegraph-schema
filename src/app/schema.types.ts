export interface SceneGraphRootSchema {
  schema: {
    element: ComponentSchema
    group: {
      choice: {
        choice: {
          element: InstanceSchema[]
        }
      }
    }
    simpleType: SimpleType[]
  }
}

export interface Attribute {
  name: string
  type?: string
  default?: string
  use?: string
  simpleType?: {
    restriction: {
      base: string
      enumeration: {
        value: string
      }[]
    }
  }
}

export interface FieldType {
  name: string
  complexType: {
    attribute: Attribute[]
  }
}

export interface InterfaceSchema {
  name: string
  complexType: {
    choice: {
      minOccurs: string
      maxOccurs: string
      element: FieldType[]
    }
  }
}

export interface ScriptSchema {
  name: string
  complexType: {
    attribute: Attribute[]
  }
}

export interface ChildrenSchema {
  name: string
  complexType: {
    group: {
      ref: string
    }
  }
}

export interface ComponentSchemaRaw {
  name: string
  complexType: {
    annotation: any
    attribute: Attribute[]
    sequence: {
      element: (InterfaceSchema | ChildrenSchema | ScriptSchema)[]
    }
  }
}

export interface ComponentSchema {
  name: string
  complexType: {
    annotation: any
    attribute: Attribute[]
    choice: {
      minOccurs: string
      maxOccurs: string
      element: (InterfaceSchema | ChildrenSchema | ScriptSchema)[]
    }
  }
}

export interface InstanceSchema {
  name: string
  complexType: {
    attribute: Attribute[]
    group: {
      ref: string
    }
  }
}

export interface SimpleType {
  name: string
  restriction: {
    base: string
  }
}
