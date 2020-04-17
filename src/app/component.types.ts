export interface Component {
  component: {
    name: string
    extends: string
    interface?: {
      field?: Field[]
    }
    script?: Script[]
    children?: any[]
  }
}

export interface Field {
  id: string
  type: string
  value?: string
}

export interface Script {
  uri: string
}
