const mysql = require('mysql2');

const pool = mysql.createPool({
    host:'localhost',
    user:'admin_ISG',
    password:'Puxa3418!!',
    database:'pca_production'
})

console.log(pool.promise());
module.exports = pool.promise();