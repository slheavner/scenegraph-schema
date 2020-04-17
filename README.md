# SceneGraph Schema

A schema generator for SceneGraph xml projects

## What you get from a schema

- a project specific `.xsd` schema file
- validation on scenegraph component xml files
- `extends` completion, including base components
- component tag completion, including components in `<children>` tag
- `field` attribute completion

## Usage

### NPM

```
npm install scenegraph-schema
scenegraph-schema [options]
OR
sgschema [options]
```

### From Source

1. clone this repository
2. run `npm run compile`
3. run `npm link`
4. use the `sgschema` or `scenegraph-schema` commands

## Options

```
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
```

## VScode Setup

1. install the RedHat vscode extension: `redhat.vscode-xml`
1. update `settings.json` with:

```
 "xml.fileAssociations": [
     {
         "pattern": "**/*.xml",
         "systemId": "./app.xsd"
     }
 ],
```

2. (optional) replace `systemId` with your output file name
