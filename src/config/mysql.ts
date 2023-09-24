import mysql from "mysql2/promise";
import config from "./config";

const pool = mysql.createPool({
    user: config.mysql.user,
    password: config.mysql.pass,
    host: config.mysql.host,
    database: config.mysql.database,
    connectionLimit: 10
});

export const connect = (fn: any) => async (...args: any) => {
    const con: any = await pool.getConnection();
    const [result] = await fn(con, ...args).catch(async (error: any) => {
        if (error) await con.rollback();
        await con.release();
        throw error
    })

    await con.release();
    return result
};

export const transaction = async () => {
    const con: any = await pool.getConnection();
    return await con.beginTransaction();
}

export const rollback = async () => {
    const con: any = await pool.getConnection();
    return await con.rollback();
}

export const commit = async () => {
    const con: any = await pool.getConnection();
    return await con.commit();
}

export default pool