import mysql from "mysql";
import config from "./config";

const connectDB = mysql.createConnection({
    user: config.mysql.user,
    password: config.mysql.pass,
    host: config.mysql.host,
    database: config.mysql.database
});

export default connectDB;