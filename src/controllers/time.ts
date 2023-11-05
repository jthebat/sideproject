import { NextFunction, Request, Response } from 'express';
import { FieldPacket, RowDataPacket } from 'mysql2';
import * as db from '../config/mysql'
import pool from '../config/mysql';

interface access extends RowDataPacket {
    exam: string;
    dday: Date;
    studyDate: Date;
    endTime: Date;
    studyTime: number;
    total: number;
};

function getToday(date: Date) {
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();

    String(month).length === 1 ? `0${month}` : month;
    String(day).length === 1 ? `0${day}` : day;

    return year + "-" + month + "-" + day;
};

async function connect(sqlQuery: string, data: any[]) {
    return await db.connect((con: any) => con.query(sqlQuery, data))();
}

export default {
    // 시험 D-day 등록
    setDay: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { snsId } = res.locals.user.info;
            const { exam, dday } = req.body;

            const checkquery = `SELECT id, exam, dday FROM DDAYS WHERE dday = ? AND snsId = ?`;
            const query = `INSERT INTO DDAYS (snsId ,exam, dday) VALUES (?,?,?)`;


            const [result] = await connect(checkquery, [dday, snsId]);

            if (!!result) return res.status(400).json({ message: '이미 등록된 시험입니다.' });

            await db.transaction();
            await connect(query, [snsId, exam, dday]);
            await db.finalCommit();

            const [data] = await connect(checkquery, [dday, snsId]);

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

            const rows = await connect(query, [snsId]);

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

            const [result] = await connect(checkquery, [ddayId, snsId]);

            if (!result) return res.status(200).json({ message: '존재하지 않는 디데입니다.' });

            await db.transaction();
            await connect(query, [exam, dday, ddayId, snsId]);
            await db.finalCommit();

            const [data] = await connect(checkquery, [ddayId, snsId]);

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
            await connect(query, [ddayId, snsId]);
            await db.finalCommit();

            return res.status(200).send({ ddayId });
        } catch (err) {
            await db.rollback();
            next(err);
        }
    },
    // 돌아가고 있는 타이머가 존재하는지 조회하는 GET API
    getStudyTime: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { snsId } = res.locals.user.info;

            const checkTimer = `SELECT studyDate FROM STUDYTIME WHERE snsId = ? AND studyTime = ? ORDER BY studyTime DESC LIMIT 1`;
            const deleteTimer = `DELETE FROM STUDYTIME WHERE snsId=? AND studyDate=?`;

            // 돌아가고 있는 타이머 찾기
            const [timerData] = await connect(checkTimer, [snsId, 0]);

            //*  한국시간
            const offset = 1000 * 60 * 60 * 9;
            const nowTime = new Date().getTime() + offset

            if (timerData) {
                const KrTime = new Date(timerData.studyDate.getTime() + offset)
                const startTime = timerData.studyDate.getTime() + offset

                //* 타이머가 시작되고 24시간이 지났다면 DB에서 삭제
                if (nowTime - startTime >= 8.64e7) {
                    await db.transaction();
                    await connect(deleteTimer, [snsId, KrTime]);
                    await db.commit();
                }
                else return res.status(200).json({ studyDate: KrTime });
            }

            return res.status(200).json();
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

            console.log({ startTime })

            const existData = `SELECT * FROM STUDYTIME WHERE snsId = ? AND studyTime = ? ORDER BY studyTime DESC LIMIT 1`;
            const insertTime = `INSERT INTO STUDYTIME (snsId, studyDate) VALUES (?,?)`;

            // 돌아가고 있는 타이머 찾기
            const [timerData] = await connect(existData, [snsId, 0]);

            // 웬만하면 들어올 일은 없겠지만 이미 돌아가고 있는 타이머가 있는 경우 에러
            if (timerData) return res.status(400).json({ errorMessage: "이미 작동중인 데이터가 존재합니다." });

            // 등록
            await db.transaction();
            await connect(insertTime, [snsId, startTime]);
            await db.finalCommit();

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
            let { startPoint } = req.body;

            const endDate = new Date();
            const endDay = endDate.getDate();

            //* sql
            const missionCheck = `SELECT snsId FROM USERCHARACTERS WHERE snsId=? AND codeNum=?`;
            const findStudyTime = `SELECT studyDate FROM STUDYTIME WHERE snsId=? AND studyDate=? AND studyTime = 0`;
            const updateTime = `UPDATE STUDYTIME SET endTime =?, studyTime =? WHERE snsId=? AND studyDate=?`;
            const insertTime = `INSERT INTO STUDYTIME (snsId, studyDate, endTime, studyTime) VALUES (?,?,?,?)`;
            const deleteTime = `DELETE FROM STUDYTIME WHERE snsId=? AND studyDate=? `;

            const checkAttendace = `SELECT date, inARow, accTime FROM ATTENDANCE WHERE snsId = ? ORDER BY date DESC LIMIT 1`;
            const insertAttendance = `INSERT INTO ATTENDANCE (snsId, date, inARow, accTime) VALUES (?,?,?,?)`;
            const updateAttendance = `UPDATE ATTENDANCE SET accTime = ? WHERE snsId = ? AND date = ?`

            // 캐릭터 관련 배열
            let getCharacters: object[] = []

            // 캐릭터 디비 업데이트 함수
            async function InsertChracter(codeNum: number) {
                // sql
                const insertSetOn = `INSERT INTO USERCHARACTERS (snsId, codeNum) VALUES (?,?)`;
                const findCharacter = `SELECT characterImg, requirement FROM CHARACTERSINFO WHERE codeNum = ?`;
                const getStudyCharacter = `SELECT codeNum FROM USERCHARACTERS WHERE snsId = ? AND codeNum >= 20 AND codeNum <= 25`

                // 공부시간 관련해서 캐릭터 관련 로직
                // 들어오는 codeNum보다 작은 수의 캐릭터를 가지고 있지 않으면 같이 등록해주기
                if (codeNum >= 21 && codeNum <= 25) {
                    const studyCode = [20, 21, 22, 23, 24, 25]
                    // 가지고 있는 공부 관련 캐릭터 가져오기
                    const studyCharacters = await connect(getStudyCharacter, [snsId]);

                    const studyCharactersKeys = studyCharacters.map((el: { codeNum: any; }) => el.codeNum);

                    //가지고 있지 않은 캐릭터 디비에 저장해주기
                    for (const el of studyCode) {
                        if (!studyCharactersKeys.includes(el) && el <= codeNum) {
                            await connect(insertSetOn, [snsId, el]);

                            const [character] = await connect(findCharacter, [el]);
                            getCharacters.push(character);
                        }
                    }

                    await db.commit();
                    return;
                }

                // 공부시간 이외의 캐릭터 관련 로직
                const [existChracter] = await connect(missionCheck, [snsId, codeNum]);

                // 캐릭터를 보유하고 있지 않을 때만 등록
                if (!existChracter) {
                    await connect(insertSetOn, [snsId, codeNum]);
                    await db.commit();

                    const [character] = await connect(findCharacter, [codeNum]);

                    getCharacters.push(character);
                }
                return;
            };

            // 출석 관련 함수
            async function attendanceFn(studyTime: number, studyDate: Date) {
                // 출석 확인 - 가장 최신의 데이터를 하나 가져옴
                const [attendance] = await connect(checkAttendace, [snsId]);

                let inARow = 0;
                let accTime: number;

                // 출석부에 데이터가 있는 경우 출석회차와 누적공부시간을 더해줘야 한다.
                if (attendance) {
                    accTime = attendance.accTime + studyTime;

                    // 들어오는 날짜와 같지 않으면
                    if (getToday(new Date(attendance.date)) !== getToday(studyDate)) {
                        inARow = attendance.inARow + 1;

                        await connect(insertAttendance, [snsId, studyDate, inARow, accTime]);
                    }
                    // 날짜가 같으면 업데이트 해주기
                    else {
                        await connect(updateAttendance, [accTime, snsId, attendance.date]);
                    }
                }
                else {
                    // 만약 공부 시작 시간에 출석이 없으면 생성
                    inARow = 1;
                    accTime = studyTime;

                    await connect(insertAttendance, [snsId, studyDate, inARow, accTime]);
                }

                // 출석 캐릭터 관련
                switch (inARow) {
                    case 1:  // 처음 타이머 사용할 시
                        await InsertChracter(1);
                        break;
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

                await db.commit();

                return Math.round(accTime);
            };

            // 현재 타이머가 돌고있는 데이터를 찾기.
            const [existStudyTime] = await connect(findStudyTime, [snsId, startPoint]);

            // 시작한 타임이 없어서 에러 처리(웬만하면 이 곳에 빠지지 않도록 해야한다.)
            if (!existStudyTime) return res.status(400).send({ errorMessage: '현재 등록된 데이터가 없습니다!' });

            // 공부 시작 날짜 및 시간
            const studyDate = existStudyTime.studyDate;
            const theTime = studyDate.getDate();

            // 트랜잭션 시작
            await db.transaction();

            // 공부시간 관련 로직
            // 시작시간 이후 24시간 타이머 넘었는지 체크 (넘으면 해당 날짜의 데이터 삭제)
            if (endDate.getTime() - studyDate.getTime() >= 8.64e7) {
                // 쉬는 시간 초도 받아야 정확한 타이머 시간 24시간 체크 가능
                await connect(deleteTime, [snsId, studyDate]);
                await db.finalCommit();

                return res.status(200).send({ message: 'Data delete success!' });
            }

            // 출석 회차 및 누적 공부시간
            let accTime = 0;
            let studyTime = (endDate.getTime() - new Date(studyDate).getTime()) / 1000;

            // 24시 기준 분리
            // 공부 시작 당일에 해당
            if (theTime === endDay) {
                await connect(updateTime, [endDate, studyTime, snsId, studyDate]);

                // 출석체크
                const result = await attendanceFn(studyTime, endDate);
                accTime = result;
            }
            // 익일을 넘겨서 공부한 경우
            else {
                const endDateTime = new Date(`${studyDate.getFullYear()}-${studyDate.getMonth() + 1}-${theTime} 23:59:59.999`);

                studyTime = (endDateTime.getTime() - new Date(studyDate).getTime()) / 1000;

                await connect(updateTime, [endDateTime, studyTime, snsId, studyDate]);

                // 전날 출석 기록
                await attendanceFn(studyTime, studyDate);

                const nextDate = new Date(`${endDate.getFullYear()}-${endDate.getMonth() + 1}-${endDay} 00:00:00.000`);

                studyTime = (new Date(endDate).getTime() - nextDate.getTime()) / 1000;

                await connect(insertTime, [snsId, nextDate, endDate, studyTime]);

                // 다음날 출석 기록
                const result = await attendanceFn(studyTime, nextDate);
                accTime = result;
            }

            // 공부시간 캐릭터 관련
            // 6시간 이상 달성 시
            if (accTime >= 21600 && accTime < 43200) await InsertChracter(20);

            // 12시간 이상 달성 시
            else if (accTime >= 43200 && accTime < 72000) await InsertChracter(21);

            // 20시간 이상 달성 시
            else if (accTime >= 72000 && accTime < 108000) await InsertChracter(22);

            // 30시간 이상 달성 시
            else if (accTime >= 108000 && accTime < 144000) await InsertChracter(23);

            // 40시간 이상 달성 시
            else if (accTime >= 144000 && accTime < 180000) await InsertChracter(24);

            // 50시간 이상 달성 시
            else if (accTime >= 180000) await InsertChracter(25);

            await db.finalCommit();
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
    },

    // 테스트를 위한 캐릭터 삭제 api
    characterDeleteForTest: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { snsId } = res.locals.user.info;

            const deleteQuery = `DELETE FROM USERCHARACTERS WHERE snsId = ?`

            await db.transaction();
            await connect(deleteQuery, [snsId]);
            await db.finalCommit();

            return res.status(200).json({ message: "success delete!" })
        } catch (err) {
            await db.rollback();
            next(err)
        }
    }
};

function next(err: unknown) {
    throw new Error('Function not implemented.');
}

