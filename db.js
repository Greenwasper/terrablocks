const mysql = require('mysql');
const util = require('util');

var db = mysql.createConnection({
    host: 'localhost',
    user: 'u714842824_land',
    password: 'Kevarkadius2024',
    database: 'u714842824_land'
});

const query = util.promisify(db.query).bind(db);

db.connect((err) => {
    if(err) throw err;

    console.log('Connected to database');
});

module.exports = {db, query};