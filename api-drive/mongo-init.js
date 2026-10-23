db = db.getSiblingDB('nest_drive');

db.createUser({
  user: 'dev',
  pwd: 'dev_Code@2',
  roles: [
    {
      role: 'readWrite',
      db: 'nest_drive',
    },
  ],
});