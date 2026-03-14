/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('_pb_users_auth_')

  collection.fields.addAt(11, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text886152001",
    "max": 0,
    "min": 0,
    "name": "currentSessionId",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  collection.fields.addAt(12, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text886152002",
    "max": 0,
    "min": 0,
    "name": "refreshTokenHash",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  collection.fields.addAt(13, new Field({
    "hidden": false,
    "id": "date886152003",
    "max": "",
    "min": "",
    "name": "refreshTokenExpiresAt",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('_pb_users_auth_')

  collection.fields.removeById('text886152001')
  collection.fields.removeById('text886152002')
  collection.fields.removeById('date886152003')

  return app.save(collection)
})
