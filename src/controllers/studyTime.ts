import { Request, Response } from "express";
import pool from "../config/mysql";

export default {
    // timer 시작
    startTime: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { getDate } = req.body;

        const studyDate = getDate.toLocaleDateString();
        const startTime = getDate.toLocaleTimeString().slice(0, -3);

        const conn = await pool.getConnection();
        const insertTime = `INSERT INTO STUDYTIME (snsId, studyDate, startTime) VALUES (?,?,?)`;

        try {
            await conn.query(insertTime, [snsId, studyDate, startTime]);
            res.status(200).send({
                message: 'success',
            });
        } catch (err) {
            console.log(err);
        } finally {
            conn.release();
        };
    },

    // timer 끝
    endTime: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { studyTime, endTime } = req.body;

        const conn = await pool.getConnection();
        const UpdateTime = `UPDATE STUDYTIME SET studyTime =?, endTime =? WHERE snsId = ? AND studyDate =?`

        const makeEndTime = endTime.toLocaleTimeString().slice(0, -3)();
        const studyDate = endTime.toLocaleDateString();

        try {
            await conn.query(UpdateTime, [studyTime, makeEndTime, studyDate, snsId, studyDate]);

            res.status(200).send({
                message: 'success',
            });
        } catch (err) {
            console.log(err);
        } finally {
            conn.release();
        };
    },
};