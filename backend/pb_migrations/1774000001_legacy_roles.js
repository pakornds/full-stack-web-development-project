/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    let records = app.findAllRecords('users');
    for (let record of records) {
      let role = record.get('role');
      if (role === 'dev') {
        record.set('role', 'manager');
        app.saveNoValidate(record);
      } else if (role === 'user') {
        record.set('role', 'employee');
        app.saveNoValidate(record);
      }
    }
  },
  (app) => {
    let records = app.findAllRecords('users');
    for (let record of records) {
      let role = record.get('role');
      if (role === 'manager') {
        record.set('role', 'dev');
        app.saveNoValidate(record);
      } else if (role === 'employee') {
        record.set('role', 'user');
        app.saveNoValidate(record);
      }
    }
  },
);
