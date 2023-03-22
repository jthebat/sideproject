import { Request, Response } from 'express';
import { FieldPacket, RowDataPacket } from 'mysql2';
import pool from '../config/mysql';

interface access extends RowDataPacket {
    exam: string;
    dday: Date;
    studyDate: Date;
    endTime: Date;
    studyTime: number;
    total: number;
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
            res.send(err);
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

        const query = `DELETE FROM DDAYS WHERE DDAYS.snsId = ? AND DDAYS.exam = ?`;
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

        //* CHECK: front에서도 response 값이 한국시간으로 나오는지 확인
        //* 한국시간 - response 용
        const offset = 1000 * 60 * 60 * 9;
        const koreaNow = new Date(new Date().getTime() + offset);

        //* DB용
        const today = new Date()

        const conn = await pool.getConnection();
        const insertTime = `INSERT INTO STUDYTIME (snsId, studyDate) VALUES (?,?)`;

        try {
            await conn.query(insertTime, [snsId, today]);


            res.status(200).send({
                message: 'success',
                startTime: koreaNow,
                today
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
        const { startTime } = req.body;

        //*  한국시간
        const offset = 1000 * 60 * 60 * 9;
        const getDate = new Date(new Date().getTime() + offset);
        const endDate = getDate.toISOString().split('T')[0];


        //* sql
        const conn = await pool.getConnection();
        const findStudyTime = `SELECT studyDate FROM STUDYTIME WHERE snsId=? AND studyDate=?`;
        const updateTime = `UPDATE STUDYTIME SET endTime =? WHERE snsId=? AND studyDate=?`;
        const insertTime = `INSERT INTO STUDYTIME (snsId ,studyDate, endTime) VALUES (?,?,?)`;
        const deleteTime = `DELETE FROM STUDYTIME WHERE STUDYTIME.snsId=? AND STUDYTIME.studyDate=? `

        try {
            const [existStudyTime]: [access[], FieldPacket[]] = await conn.query(findStudyTime, [snsId, startTime]);

            if (!existStudyTime.length) {
                return res.status(400).send({
                    errorMessage: '현재 등록된 데이터가 없습니다!'
                });
            }

            const studyDate = existStudyTime[0].studyDate;
            const theTime = studyDate.toISOString().split('T')[0];

            // 24시간 타이머 넘었는지 체크 (넘으면 해당 날짜의 데이터 삭제)
            if (getDate.getTime() - studyDate.getTime() >= 8.64e+7) {  // 쉬는 시간 초도 받아야 정확한 타이머 시간 24시간 체크 가능
                await conn.query(deleteTime, [snsId, studyDate]);
                return res.status(200).send({
                    message: 'Data delete success!'
                });
            }

            // 24시 기준 분리
            if (theTime === endDate) {
                await conn.query(updateTime, [getDate, snsId, studyDate]);

                return res.status(200).send({
                    message: 'success'
                });
            } else {
                const endDateTime = new Date(`${theTime} 23:59:59`);
                await conn.query(updateTime, [endDateTime, snsId, studyDate]);

                const beforeDate = new Date(`${endDate} 00:00:00`);
                await conn.query(insertTime, [snsId, beforeDate, getDate]);

                return res.status(200).send({
                    message: 'success'
                });
            };
        } catch (err) {
            res.send(err);
        } finally {
            conn.release();
        }
    },

    // 일별 통계 조회
    getDayRecord: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { theDay } = req.query;

        const conn = await pool.getConnection();
        const getData = `SELECT studyDate, studyTime, endTime FROM STUDYTIME WHERE snsId=? AND DATE(studyDate)=DATE(?)`;

        try {
            const [existData]: [access[], FieldPacket[]] = await conn.query(getData, [snsId, theDay]);
            const data = existData.map((x) => ({
                startTime: x.studyDate.toLocaleTimeString('ko-KR').slice(0, -3),
                studyTime: x.studyTime,
                endTime: x.endTime.toLocaleTimeString('ko-KR').slice(0, -3)
            }));

            res.status(200).send(data);
        } catch (err) {
            res.send(err);
        } finally {
            conn.release();
        }
    },

    // 공부시간 통계 조회 (주, 월)
    getRecord: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { firstDay, lastDay } = req.query;

        const conn = await pool.getConnection();
        const query = `select studyDate, sum(studyTime)as total from (select substring_index(studyDate,' ',1)as studyDate , studyTime from tsdatabase.STUDYTIME where snsId=? and CAST(studyDate AS DATE) between ? and ?) A group by studyDate`;

        let getDaysArray = function (start: any, end: any) {
            for (var arr = [], dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
                arr.push(new Date(dt).toISOString().split('T')[0]);
            }
            return arr;
        };

        let daylist = getDaysArray(new Date(String(firstDay)), new Date(String(lastDay)));

        try {
            const [rows]: [access[], FieldPacket[]] = await conn.query(query, [snsId, firstDay, lastDay]);

            let max = Math.max.apply(
                Math,
                rows.map((o) => o.total)
            );
            let min = Math.min.apply(
                Math,
                rows.map((o) => o.total)
            );

            let p = 0;
            let result = [];

            for (let m = 0; m < daylist.length - 1; m++) {
                if (daylist[m] == String(rows[p].studyDate)) {
                    result.push(rows[p]);
                    p++;
                } else {
                    result.push({ studyDate: daylist[m], total: '0' });
                }
            }
            let total = 0;
            result.map((obj) => {
                total = total + Number(obj.total);
            });

            return res.status(200).send({
                message: 'success',
                result,
                max,
                min,
                avg: total / result.length
            });
        } catch (err) {
            res.send(err);
        } finally {
            conn.release();
        }
    },
};
