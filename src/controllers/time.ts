import { Request, Response } from 'express';
import { FieldPacket, RowDataPacket } from 'mysql2';
import pool from '../config/mysql';

interface access extends RowDataPacket {
    exam: string;
    dday: Date;
}

export default {
    // 시험 D-day 등록
    setDay: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { exam, dday } = req.body;

        const query = `INSERT INTO dDays (snsId ,exam, dday) VALUES (?,?,?)`;
        const conn = await pool.getConnection();
        try {
            await conn.query(query, [snsId, exam, dday]);
            res.status(204).send({ message: 'success' });
        } catch (err) {
            // console.log(err);
            res.send(err);
        } finally {
            conn.release();
        }
    },

    // 게시물 전체조회
    getDdays: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const query = `SELECT exam, dday FROM dDays where dDays.snsId = ?`;

        const conn = await pool.getConnection();

        try {
            const [rows]: [access[], FieldPacket[]] = await conn.query(query, [snsId]);
            const time = new Date();
            let result = rows.map((item) => {
                let today = new Date(`${time.getFullYear()}-${time.getMonth() + 1}-${time.getDate()}`);
                let dday = new Date(item.dday).getTime();
                let gap = dday - today.getTime();
                let result = Math.ceil(gap / (1000 * 60 * 60 * 24));
                return { exam: item.exam, dday: result };
            });
            res.status(200).send({
                message: 'success',
                rows: result
            });
        } catch (err) {
            console.log(err);
        } finally {
            conn.release();
        }
    }
};
