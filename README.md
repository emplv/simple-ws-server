# Simple WebSockets chat

- TypeScript
- single room
- username per each connection
- inactivity timer
- string messages only (currently)
- file logging
- no echo on own message
- connect/disconnect notice
- gracefull shutdown

## Launch

1. `npm i`
2. `npm run start`
3. `npm run client`

## Commands

`npm run build` - compiles ts to js  
`npm run start` - compiles ts to js, starts server  
`npm run watch` - compiles ts to js, starts server, watches for changes  
`npm run client` - install client dependencies and creates bundles

### Optionally can pass config params to `start`/`watch`:

`port={number}` - changes default port to provided
`timeout={number}` - changes socket inactivity timeout to provided

### Usage:

`port=3010 npm run start`

## Usefull things to add

- origin validation
- add close reason for user
- add complexity to user auth

## Client

Client is implemented sperately, should go along the origin validation and user auth rules
