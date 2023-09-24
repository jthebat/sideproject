import { NextFunction, Request, Response } from 'express';
import { FieldPacket, RowDataPacket } from 'mysql2';
import { nextTick } from 'process';
import * as db from '../config/mysql'
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
    setDay: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { snsId } = res.locals.user.info;
            const { exam, dday } = req.body;

            const checkquery = `SELECT id, exam, dday FROM DDAYS WHERE dday = ? AND snsId = ?`;
            const query = `INSERT INTO DDAYS (snsId ,exam, dday) VALUES (?,?,?)`;


            const [result] = await db.connect((con: any) => con.query(checkquery, [dday, snsId]))();

            if (!!result) return res.status(400).json({ message: '이미 등록된 시험입니다.' });

            await db.transaction();
            await db.connect((con: any) => con.query(query, [snsId, exam, dday]))();
            await db.commit();

            const [data] = await db.connect((con: any) => con.query(checkquery, [dday, snsId]))();

            return res.status(201).json(data);
        } catch (err) {
            await db.rollback();
            next(err);
        }
    },

    // 디데이 전체조회
    getDdays: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { snsId } = res.locals.user.info;
            const query = `SELECT id, exam, dday FROM DDAYS where snsId = ? AND dday >= CURDATE() ORDER BY dday ASC`;

            const rows = await db.connect((con: any) => con.query(query, [snsId]))();

            let result = rows.map((item: RowDataPacket) => {
                let today = new Date().setHours(0, 0, 0);
                let dday = new Date(item.dday).valueOf();
                // 며칠남았는지
                dday = Math.round((dday - today) / (1000 * 60 * 60 * 24));

                return {
                    ddayId: item.id,
                    exam: item.exam,
                    dday, eday: new Date(item.dday.getTime() + 1000 * 60 * 60 * 9)
                };
            });

            return res.status(200).send({ rows: result });
        } catch (err) {
            next(err)
        }
    },

    // D-day 수정
    modifyDay: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { snsId } = res.locals.user.info;
            const { ddayId } = req.query;
            const { exam, dday } = req.body;

            const checkquery = `SELECT * FROM DDAYS where id = ? AND snsId = ?`;
            const query = `UPDATE DDAYS SET exam=?, dday=? WHERE id = ? AND snsId = ?`;

            const [result] = await db.connect((con: any) => con.query(checkquery, [ddayId, snsId]))();

            if (!result) return res.status(200).json({ message: '존재하지 않는 디데입니다.' });

            await db.transaction();
            await db.connect((con: any) => con.query(query, [exam, dday, ddayId, snsId]))();
            await db.commit();

            const [data] = await db.connect((con: any) => con.query(checkquery, [ddayId, snsId]))();

            return res.status(201).json(data);
        } catch (err) {
            await db.rollback();
            next(err);
        }
    },

    // D-day 게시물 삭제
    removeDay: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { snsId } = res.locals.user.info;
            const { ddayId } = req.query;

            const query = `DELETE FROM DDAYS WHERE id = ? AND snsId = ?`;

            await db.transaction();
            await db.connect((con: any) => con.query(query, [ddayId, snsId]))();
            await db.commit();

            return res.status(200).send({ ddayId });
        } catch (err) {
            await db.rollback();
            next(err);
        }
    },

    // timer 시작
    startTime: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { snsId } = res.locals.user.info;

            //*  한국시간
            const offset = 1000 * 60 * 60 * 9;
            const startTime = new Date();
            const KrTime = new Date(startTime.getTime() + offset); // 3번째 소숫점 오차 기존에 있었는데 계속 확인해볼것

            const existData = `SELECT * FROM STUDYTIME WHERE snsId = ? AND studyTime = ? ORDER BY studyTime DESC LIMIT 1`;
            const insertTime = `INSERT INTO STUDYTIME (snsId, studyDate) VALUES (?,?)`;

            const [data] = await db.connect((con: any) => con.query(existData, [snsId, 0]))();

            // 웬만하면 들어올 일은 없겠지만 이미 돌아가고 있는 타이머가 있는 경우 에러
            if (!!data) return res.status(400).json({ errorMessage: "이미 작동중인 데이터가 존재합니다." })

            // 등록
            await db.transaction();
            await db.connect((con: any) => con.query(insertTime, [snsId, startTime]))();
            await db.commit();

            return res.status(201).send({ startPoint: KrTime });
        } catch (err) {
            await db.rollback();
            next(err);
        }
    },

    // timer 끝
    endTime: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { snsId } = res.locals.user.info;
            const { startPoint } = req.body;
            //*  한국시간
            // const offset = 1000 * 60 * 60 * 9;
            // const getDate = new Date(new Date().getTime() + offset);
            // const endDate = getDate.getDate();

            const endDate = new Date();
            const endDay = endDate.getDate();

            //* sql
            const conn = await pool.getConnection();
            const missionCheck = `SELECT snsId FROM USERCHARACTERS WHERE snsId=? AND codeNum=?`;
            const insertSetOn = `INSERT INTO USERCHARACTERS (snsId, codeNum) VALUES (?,?)`;
            const findStudyTime = `SELECT studyDate FROM STUDYTIME WHERE snsId=? AND studyDate=? AND studyTime = 0`;
            const updateTime = `UPDATE STUDYTIME SET endTime =?, studyTime =? WHERE snsId=? AND studyDate=?`;
            const insertTime = `INSERT INTO STUDYTIME (snsId, studyDate, endTime, studyTime) VALUES (?,?,?,?)`;
            const deleteTime = `DELETE FROM STUDYTIME WHERE STUDYTIME.snsId=? AND STUDYTIME.studyDate=? `;

            const findStudyTimeForCharacter = `SELECT sum(studyTime) AS total FROM STUDYTIME WHERE snsId = ?`
            const countStudyNum = `SELECT count(snsId) AS num FROM STUDYTIME WHERE snsId = ?`

            // 캐릭터 관련 로직
            let getCharacters: number[] = []

            // 캐릭터 디비 업데이트 함수
            async function InsertChracter(codeNum: number) {
                await db.connect((con: any) => con.query(insertSetOn, [snsId, codeNum]))();
                await db.commit();

                getCharacters.push(codeNum);
                return;
            }


            // 처음 타이머 사용할 시 
            const [firstUsedTimer] = await db.connect((con: any) => con.query(missionCheck, [snsId, 1]))();

            await db.transaction();
            if (!firstUsedTimer) await InsertChracter(1);

            // 출석 캐릭터 관련
            const [studyNum] = await db.connect((con: any) => con.query(countStudyNum, [snsId]))();

            switch (studyNum.num) {
                case 2:
                    await InsertChracter(10);
                    break;
                case 5:
                    await InsertChracter(11);
                    break;
                case 10:
                    await InsertChracter(12);
                    break;
            }

            // 공부시간 캐릭터 관련
            const [totalStudyTime] = await db.connect((con: any) => con.query(findStudyTimeForCharacter, [snsId]))();
            const total = totalStudyTime.total;



            // 6시간 이상 달성 시
            if (total >= 21600 && total < 43200) await InsertChracter(20);

            // 12시간 이상 달성 시
            else if (total >= 43200 && total < 72000) await InsertChracter(21);
            // 20시간 이상 달성 시
            else if (total >= 72000 && total < 108000) await InsertChracter(22);

            // 30시간 이상 달성 시
            else if (total >= 108000 && total < 144000) await InsertChracter(23);

            // 40시간 이상 달성 시
            else if (total >= 144000 && total < 180000) await InsertChracter(24);

            // 50시간 이상 달성 시
            else if (total >= 180000) {
                const [eixstChracter] = await db.connect((con: any) => con.query(missionCheck, [snsId, 25]))();

                // 캐릭터가 없는 경우에만 등록
                if (!eixstChracter) await InsertChracter(25);
            }

            // 여기부터는 공부시간 관련 로직
            const [existStudyTime] = await db.connect((con: any) => con.query(findStudyTime, [snsId, startPoint]))();

            // 시작한 타임이 없어서 에러 처리(웬만하면 이 곳에 빠지지 않도록 해야한다.)
            if (!existStudyTime) return res.status(400).send({ errorMessage: '현재 등록된 데이터가 없습니다!' });

            const studyDate = existStudyTime.studyDate;
            const theTime = studyDate.getDate();

            // 시작시간 이후 24시간 타이머 넘었는지 체크 (넘으면 해당 날짜의 데이터 삭제)
            if (endDate.getTime() - studyDate.getTime() >= 8.64e7) {
                // 쉬는 시간 초도 받아야 정확한 타이머 시간 24시간 체크 가능
                await conn.query(deleteTime, [snsId, studyDate]);
                await db.commit();

                return res.status(200).send({ message: 'Data delete success!' });
            }

            let studyTime = (endDate.getTime() - new Date(studyDate).getTime()) / 1000;

            // 24시 기준 분리
            // 공부 시작 당일에 해당
            if (theTime === endDay) {
                await conn.query(updateTime, [endDate, studyTime, snsId, studyDate]);
                await db.commit();
            }
            // 익일을 넘겨서 공부한 경우
            else {
                const endDateTime = new Date(`${studyDate.getFullYear()}-${studyDate.getMonth() + 1}-${theTime} 23:59:59.999`);
                studyTime = (endDateTime.getTime() - new Date(studyDate).getTime()) / 1000;

                await conn.query(updateTime, [endDateTime, studyTime, snsId, studyDate]);
                await db.commit();

                const nextDate = new Date(`${endDate.getFullYear()}-${endDate.getMonth() + 1}-${endDay} 00:00:00.000`);

                studyTime = (new Date(endDate).getTime() - nextDate.getTime()) / 1000;

                await conn.query(insertTime, [snsId, nextDate, endDate, studyTime]);
                await db.commit();
            }

            return res.status(201).json({ getCharacters })
        } catch (err) {
            await db.rollback();
            next(err)
        }
    },

    // 일별 통계 조회
    getDayRecord: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { snsId } = res.locals.user.info;
            const { theDay } = req.query;

            // sql
            const conn = await pool.getConnection();
            const getData = `SELECT studyDate, studyTime, endTime FROM STUDYTIME WHERE snsId=? AND DATE(studyDate)=DATE(?)`;

            const [existData]: [access[], FieldPacket[]] = await conn.query(getData, [snsId, theDay]);
            const result = existData.map((x) => ({
                startTime: x.studyDate.toLocaleTimeString('ko-KR').slice(0, -3),
                studyTime: x.studyTime,
                endTime: x.endTime.toLocaleTimeString('ko-KR').slice(0, -3)
            }));
            const data = result.filter((obj) => obj.studyTime !== 0);

            return res.status(200).send(data);
        } catch (err) {
            next(err)
        }
    },

    // 공부시간 통계 조회 (주, 월)
    getRecord: async (req: Request, res: Response, next: NextFunction) => {
        try {
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

            return res.status(200).send({ result, max, min, avg: total / result.length });
        } catch (err) {
            next(err);
        }
    }
};
