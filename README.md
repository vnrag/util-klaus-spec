# klaus-spec

This repository describes the specification of a Klaus module and includes a parser for JSON data.

## Example

````json
{
  "moduleId": "f34hz9fh",
  "version": "1.0.0",
  "title": "Staplerfahrer Klaus",
  "minScore": 60,
  "estimatedTime": 30,
  "allowedAttempts": 3,
  "format": "16_9",
  "steps": [
    {
      "id": "f43g7hh4",
      "type": "text",
      "title": "Überschrift",
      "content": "&lt;h1&gt;{{ title }}&lt;/h1&gt;&lt;p&gt;Hallo {{ userId }},&lt;/p&gt;&lt;p&gt;l&ouml;rem &uuml;psum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor."
    },
    {
      "id": "a8w15",
      "type": "image",
      "title": "Bild",
      "content": "nn8y7nlws5k"
    }
  ],
  "assets": [
    {
      "id": "nn8y7nlws5k",
      "type": "image",
      "url": "https://klaus.vnrdev.de/uploads/e1accf72ad88a108.jpg"
    }
  ]
}
````

## Usage of Javascript Module

Install:

````
npm i --save git+ssh://git@github.com:vnrag/util-klaus-spec.git
````

Import into project:

````js
import { Model } from 'klaus-spec';

const model = Model.fromJSON(json);

model.getStepById('f43g7hh4'); // ModelStep Object
````

## Development

### `npm run build`

Builds the app for use in the `dist` folder.

### `npm run watch`

Watch for changes and rebuild

### `npm run type-check`

Check Typescript source files for type errors
