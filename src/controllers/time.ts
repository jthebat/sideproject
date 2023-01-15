import { Request, Response } from 'express';
import { FieldPacket, RowDataPacket } from 'mysql2';
import pool from '../config/mysql';

interface access extends RowDataPacket {
    exam: string;
    dday: Date;
    studyDate: Date;
    endTime: string;
}

export default {
    // 시험 D-day 등록
    setDay: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { exam, dday } = req.body;

        const checkquery = `SELECT *FROM DDAYS where DDAYS.exam = ? and DDAYS.snsId = ?`;
        const query = `INSERT INTO DDAYS (snsId ,exam, dday) VALUES (?,?,?)`;
        const conn = await pool.getConnection();
        try {
            const [result]: [access[], FieldPacket[]] = await conn.query(checkquery, [exam, snsId]);

            if (result.length !== 0) {
                return res.status(200).json({ message: '이미등록된시험' });
            }
            await conn.query(query, [snsId, exam, dday]);
            res.status(201).json({ message: 'success' });
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
        const query = `SELECT exam, dday FROM DDAYS where DDAYS.snsId = ?`;

        const conn = await pool.getConnection();

        try {
            const [rows]: [access[], FieldPacket[]] = await conn.query(query, [snsId]);
            const time = new Date();
            let result = rows.map((item) => {
                let today = new Date(`${time.getFullYear()}-${time.getMonth() + 1}-${time.getDate()}`);
                let dday = new Date(item.dday).getTime();
                let gap = dday - today.getTime();
                let result = Math.ceil(gap / (1000 * 60 * 60 * 24));
                return { exam: item.exam, dday: result, eday: item.dday };
            });
            let followingExam = result.filter((item) => {
                return item.dday >= 0;
            });
            followingExam.sort((a, b) => a.dday - b.dday);
            let pastExam = result.filter((item) => {
                return item.dday < 0;
            });
            result = followingExam.concat(pastExam);

            res.status(200).send({
                message: 'success',
                rows: result
            });
        } catch (err) {
            console.log(err);
        } finally {
            conn.release();
        }
    },

    // D-day 게시물 수정
    modifyDay: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { pexam } = req.query;
        const { exam, dday } = req.body;

        const checkquery = `SELECT *FROM DDAYS where DDAYS.exam = ? and DDAYS.snsId = ?`;
        const query = `UPDATE DDAYS SET exam=?, dday=? WHERE DDAYS.exam=? AND DDAYS.snsId = ?`;
        const conn = await pool.getConnection();
        try {
            const [result]: [access[], FieldPacket[]] = await conn.query(checkquery, [exam, snsId]);

            if (result.length !== 0) {
                return res.status(200).json({ message: '이미등록된시험' });
            }

            await conn.query(query, [exam, dday, pexam, snsId]);
            res.status(201).json({ message: 'success' });
        } catch (err) {
            // console.log(err);
            res.send(err);
        } finally {
            conn.release();
        }
    },

    // D-day 게시물 삭제
    removeDay: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { exam } = req.query;

        const query = `DELETE FROM DDAYS where DDAYS.snsId = ? AND DDAYS.exam = ?`;
        const conn = await pool.getConnection();
        try {
            await conn.query(query, [snsId, exam]);
            res.status(200).send({ message: 'success' });
        } catch (err) {
            res.send(err);
        } finally {
            conn.release();
        }
    },

    // timer 시작
    startTime: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;

        const conn = await pool.getConnection();
        const insertTime = `INSERT INTO STUDYTIME (snsId) VALUES (?)`;

        try {
            await conn.query(insertTime, [snsId]);
            res.status(200).send({
                message: 'success'
            });
        } catch (err) {
            res.send(err);
        } finally {
            conn.release();
        }
    },

    // timer 끝
    endTime: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { studyTime } = req.body;

        const getDate = new Date();
        const endDate = getDate.toISOString().split('T')[0];
        const makeEndTime = getDate.toLocaleTimeString().slice(0, -3);

        const conn = await pool.getConnection();
        const findStudyTime = `SELECT studyDate FROM STUDYTIME WHERE snsId=? AND endTime=?`
        const UpdateTime = `UPDATE STUDYTIME SET studyTime =?, endTime =? WHERE snsId=? AND studyDate=?`;

        try {
            const [existStudyTime]: [access[], FieldPacket[]] = await conn.query(findStudyTime, [snsId, '']);

            if (!existStudyTime.length) {
                return res.status(400).send({
                    errorMessage: '현재 등록된 데이터가 없습니다!'
                });
            }

            let theTime = existStudyTime[0].studyDate.toISOString().split('T')[0];

            if (theTime === endDate) {
                await conn.query(UpdateTime, [studyTime, makeEndTime, snsId, existStudyTime[0].studyDate]);

                return res.status(200).send({
                    message: 'success'
                });
            }

        } catch (err) {
            res.send(err);
        } finally {
            conn.release();
        }
    },
};
