/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('_pb_users_auth_')

  collection.fields.addAt(9, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "number1907500142",
    "max": null,
    "min": 0,
    "name": "failedLoginAttempts",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "date1922873041",
    "max": "",
    "min": "",
    "name": "lockedUntil",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('_pb_users_auth_')

  collection.fields.removeById('number1907500142')
  collection.fields.removeById('date1922873041')

  return app.save(collection)
})