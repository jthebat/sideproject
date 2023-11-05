import mysql from "mysql2/promise";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import config from "./config";

const pool = mysql.createPool({
    user: config.mysql.user,
    password: config.mysql.pass,
    host: config.mysql.host,
    database: config.mysql.database,
    waitForConnections: true,
    connectionLimit: 20,
    // timezone: "+00:00"
});

// select
export async function SelectQuery<T>(queryString: string, arg: string[]): Promise<Partial<T>[]> {
    const [result] = await pool.execute(queryString, arg);
    return result as T[];
}

// insert/update/delete
export async function ModifyQuery(queryString: string, arg: string[]): Promise<ResultSetHeader> {
    const con = await pool.getConnection();
    await con.beginTransaction();
    const [result] = await con.query(queryString, arg);
    await con.commit();

    con.release();
    return result as ResultSetHeader;
}


export const connect = (fn: any) => async (...args: any) => {
    const con = await pool.getConnection();
    const [result] = await fn(con, ...args).catch(async (error: any) => {
        if (error) await con.rollback();
        con.release();
        throw error
    })

    con.release();
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