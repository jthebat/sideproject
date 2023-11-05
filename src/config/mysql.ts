import mysql from "mysql2/promise";
import config from "./config";

const pool = mysql.createPool({
    user: config.mysql.user,
    password: config.mysql.pass,
    host: config.mysql.host,
    database: config.mysql.database,
    connectionLimit: 20,
    timezone: "Asia/Seoul",
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
    await con.beginTransaction();
}

export const rollback = async () => {
    const con: any = await pool.getConnection();
    await con.rollback();
    await con.release();
    return
}

export const commit = async () => {
    const con: any = await pool.getConnection();
    await con.commit();
}

export const finalCommit = async () => {
    const con: any = await pool.getConnection();
    await con.commit();
    await con.release();
}

export const release = async () => {
    const con: any = await pool.getConnection();
    await con.release();
}

export default pool