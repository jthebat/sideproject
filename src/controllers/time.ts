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

                return { exam: item.exam, dday: result, eday: new Date(item.dday.getTime() + 1000 * 60 * 60 * 9) };
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

        //*  한국시간
        const offset = 1000 * 60 * 60 * 9;
        const startTime = new Date();
        const KrTime = new Date(startTime.getTime() + offset); // 3번째 소숫점 오차 기존에 있었는데 계속 확인해볼것

        const conn = await pool.getConnection();
        const insertTime = `INSERT INTO STUDYTIME (snsId, studyDate) VALUES (?,?)`;

        try {
            await conn.query(insertTime, [snsId, startTime]);

            res.status(200).send({
                message: 'success',
                startPoint: KrTime
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
        const { startPoint } = req.body;
        //*  한국시간
        // const offset = 1000 * 60 * 60 * 9;
        // const getDate = new Date(new Date().getTime() + offset);
        // const endDate = getDate.getDate();

        const endDate = new Date();
        const endDay = endDate.getDate();

        console.log('endDate', endDate, 'endDate', endDay, 'month', endDate.getMonth() + 1);

        //* sql
        const conn = await pool.getConnection();
        const missionCheck = `SELECT * FROM USERCHARACTERS WHERE snsId=? AND codeNum=1`;
        const insertSetOn = `INSERT INTO USERCHARACTERS (snsId, codeNum) VALUES (?,?)`;
        const findStudyTime = `SELECT studyDate FROM STUDYTIME WHERE snsId=? AND studyDate=?`;
        const updateTime = `UPDATE STUDYTIME SET endTime =?, studyTime =? WHERE snsId=? AND studyDate=?`;
        const insertTime = `INSERT INTO STUDYTIME (snsId, studyDate, endTime, studyTime) VALUES (?,?,?,?)`;
        const deleteTime = `DELETE FROM STUDYTIME WHERE STUDYTIME.snsId=? AND STUDYTIME.studyDate=? `;

        try {
            const [flag]: [access[], FieldPacket[]] = await conn.query(missionCheck, [snsId]);
            const [existStudyTime]: [access[], FieldPacket[]] = await conn.query(findStudyTime, [snsId, startPoint]);

            if (!flag.length) {
                //console.log('첫 타이머 조작');
                await conn.query(insertSetOn, [snsId, 1]);
            }

            if (!existStudyTime.length) {
                return res.status(400).send({
                    errorMessage: '현재 등록된 데이터가 없습니다!'
                });
            }

            const studyDate = existStudyTime[0].studyDate;
            const theTime = studyDate.getDate();

            console.log('studyDate', studyDate, 'theTime', theTime);

            // 24시간 타이머 넘었는지 체크 (넘으면 해당 날짜의 데이터 삭제)
            if (endDate.getTime() - studyDate.getTime() >= 8.64e7) {
                // 쉬는 시간 초도 받아야 정확한 타이머 시간 24시간 체크 가능
                await conn.query(deleteTime, [snsId, studyDate]);
                return res.status(200).send({
                    message: 'Data delete success!'
                });
            }
            let studyTime = (endDate.getTime() - new Date(studyDate).getTime()) / 1000;
            // 24시 기준 분리
            // 공부 시작 당일에 해당
            if (theTime === endDay) {
                await conn.query(updateTime, [endDate, studyTime, snsId, studyDate]);

                return res.status(200).send({
                    message: 'success'
                });
            }
            //익일을 넘겨서 공부한 경우
            else {
                const endDateTime = new Date(`${studyDate.getFullYear()}-${studyDate.getMonth() + 1}-${theTime} 23:59:59.999`);
                studyTime = (endDateTime.getTime() - new Date(studyDate).getTime()) / 1000;
                await conn.query(updateTime, [endDateTime, studyTime, snsId, studyDate]);

                const nextDate = new Date(`${endDate.getFullYear()}-${endDate.getMonth() + 1}-${endDay} 00:00:00.000`);
                studyTime = (new Date(endDate).getTime() - nextDate.getTime()) / 1000;
                await conn.query(insertTime, [snsId, nextDate, endDate, studyTime]);

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

    // 일별 통계 조회
    getDayRecord: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { theDay } = req.query;

        const conn = await pool.getConnection();
        const getData = `SELECT studyDate, studyTime, endTime FROM STUDYTIME WHERE snsId=? AND DATE(studyDate)=DATE(?)`;

        try {
            const [existData]: [access[], FieldPacket[]] = await conn.query(getData, [snsId, theDay]);
            const result = existData.map((x) => ({
                startTime: x.studyDate.toLocaleTimeString('ko-KR').slice(0, -3),
                studyTime: x.studyTime,
                endTime: x.endTime.toLocaleTimeString('ko-KR').slice(0, -3)
            }));
            const data = result.filter((obj) => obj.studyTime !== 0);

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
        const query = `select studyDate, sum(studyTime)as total from (select substring_index(studyDate,' ',1)as studyDate , studyTime from STUDYTIME where snsId=? and CAST(studyDate AS DATE) between ? and ?) A group by studyDate`;

        //getDaysArray for empty days space
        let getDaysArray = function (start: any, end: any) {
            for (var arr = [], dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
                arr.push(new Date(dt).toISOString().split('T')[0]);
            }
            return arr;
        };

        let daylist = getDaysArray(new Date(String(firstDay)), new Date(String(lastDay)));

        try {
            const [rows]: [access[], FieldPacket[]] = await conn.query(query, [snsId, firstDay + 'T00:00:00.000Z', lastDay + 'T23:59:59.999Z']);

            let p = 0;
            let total = 0;
            let result: any[] = [];

            let max = Math.max.apply(
                Math,
                rows.map((o) => o.total)
            );
            let min = Math.min.apply(
                Math,
                rows.map((o) => o.total)
            );

            for (let m = 0; m < daylist.length; m++) {
                if (rows.length === 0) {
                    result.push({ studyDate: daylist[m], total: '0' });
                    (max = 0), (min = 0);
                } else if (daylist[m] === String(rows[p].studyDate)) {
                    result.push(rows[p]);
                    if (rows.length - 1 > p) {
                        p++;
                    }
                } else {
                    result.push({ studyDate: daylist[m], total: '0' });
                }
            }
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
    }
};
