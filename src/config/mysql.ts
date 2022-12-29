import mysql from "mysql2/promise";
import config from "./config";

const pool = mysql.createPool({
    user: config.mysql.user,
    password: config.mysql.pass,
    host: config.mysql.host,
    database: config.mysql.database,
    connectionLimit: 15
});

export default pool;
