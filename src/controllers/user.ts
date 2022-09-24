import e, { NextFunction, Request, Response } from 'express';
// import { Connect, Query } from '../config/mysql';
import logging from '../config/logging';
import passport from 'passport';
import connectDB from '../config/mysql';
import jwt from 'jsonwebtoken';
import config from '../config/config';

const NAMESPACE = 'Users';
/*
const createUser = async (req: Request, res: Response, next: NextFunction) => {
    logging.info(NAMESPACE, 'Inserting users');

    let { email, snsId, nickname, provider } = req.body;

    let query = `INSERT INTO users (snsId, email, nickname, provider) VALUES ("${snsId}", "${email}", "${nickname}", "${provider}")`;

    Connect()
        .then((connection) => {
            Query(connection, query)
                .then((result) => {
                    logging.info(NAMESPACE, 'User created: ', result);

                    return res.status(200).json({
                        result
                    });
                })
                .catch((error) => {
                    logging.error(NAMESPACE, error.message, error);

                    return res.status(200).json({
                        message: error.message,
                        error
                    });
                })
                .finally(() => {
                    logging.info(NAMESPACE, 'Closing connection.');
                    connection.end();
                });
        })
        .catch((error) => {
            logging.error(NAMESPACE, error.message, error);

            return res.status(200).json({
                message: error.message,
                error
            });
        });
};

const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    logging.info(NAMESPACE, 'Getting all users.');

    let query = 'SELECT * FROM users';

    Connect()
        .then((connection) => {
            Query(connection, query)
                .then((results) => {
                    logging.info(NAMESPACE, 'Retrieved users: ', results);

                    return res.status(200).json({
                        results
                    });
                })
                .catch((error) => {
                    logging.error(NAMESPACE, error.message, error);

                    return res.status(200).json({
                        message: error.message,
                        error
                    });
                })
                .finally(() => {
                    logging.info(NAMESPACE, 'Closing connection.');
                    connection.end();
                });
        })
        .catch((error) => {
            logging.error(NAMESPACE, error.message, error);

            return res.status(200).json({
                message: error.message,
                error
            });
        });
};
*/
//카카오 콜백
const kakaoCallback = async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('kakao', { failureRedirect: '/' }, (err, user, info) => {
        if (err) return next(err);
        /**refreshtoken 생성 */
        const refreshToken = jwt.sign({}, config.jwt.secretKey as jwt.Secret, {
            expiresIn: '14d',
            issuer: 'Martian'
        });
        /**accesstoken 생성 서비스 특성상 시간을 길게 보장해줘야하는지 아니면 refreshtoken이 해결해줄수 있는 부분인지? ?? */
        const accessToken = jwt.sign({ info }, config.jwt.secretKey as jwt.Secret, {
            /**example of expiresIn */
            /*
            ms('2 days')  // 172800000
            ms('1d')      // 86400000
            ms('10h')     // 36000000
            ms('2.5 hrs') // 9000000
            ms('2h')      // 7200000
            ms('1m')      // 60000
            ms('5s')      // 5000
            ms('1y')      // 31557600000
            ms('100')     // 100
            ms('-3 days') // -259200000
            ms('-1h')     // -3600000
            ms('-200')    // -200
            */
            expiresIn: '5m', //for test
            // expiresIn: '1h',
            issuer: 'Martian'
        });
        /**queries */
        const updateQuery = `update users set refreshtoken = ? where snsId = ?`;
        const insertQuery = `INSERT INTO users (snsId, email, nickname, provider, refreshtoken) VALUE (?,?,?,?,?)`;

        if (user.length === 0) {
            // 해당되는 user가 없으면 DB에 넣기
            connectDB.query(insertQuery, [info.snsId, info.email, info.nickname, info.provider, refreshToken], function (error, result) {
                if (error) return console.log(error);
                else {
                    /**front와 연결후 redirect 주소로 연결 필요  */
                    res.status(200).cookie('refreshToken', refreshToken).cookie('accessToken', accessToken).json({ status: 'success' });
                    //res.status(200).cookie('refreshToken', refreshToken).cookie('accessToken', accessToken).redirect(`http://www.naver.com`);
                }
            });
        } else {
            connectDB.query(updateQuery, [refreshToken, info.snsId], function (error, result) {
                if (error) return console.log(error);
                else {
                    /**front와 연결후 redirect 주소로 연결 필요 */
                    res.status(200).cookie('refreshToken', refreshToken).cookie('accessToken', accessToken).json({ status: 'success' });
                    //res.status(200).cookie('refreshToken', refreshToken).cookie('accessToken', accessToken).redirect(`http://www.naver.com`);
                }
            });
        }
    })(req, res, next);
};

//로그인한 유저에 대한 정보 가져오기

const userInfo = async (req: Request, res: Response) => {
    const { user } = res.locals;
    // console.log(user.test);

    if (!user) {
        return res.status(400).json({ result: false, message: '존재하지 않음' });
    }
    // console.log('Test', user.info[snsId]);
    return res.json({
        message: 'success',
        snsId: user.info.snsId,
        nickname: user.info.nickname
    });
};

// 회원가입 후 닉네임, 캐릭터 설정
const signup = async (req: Request, res: Response) => {
    const { user } = res.locals;
    const { nickname, charImg } = req.body;
    const exp = 0;

    const query_1 = `update users set nickname =? where snsId = ?`;
    const query_2 = `INSERT INTO userCharacters (charImg, exp) VALUE (?,?) where snsId = ?`;

    if (user) {
        connectDB.query(query_1, [nickname, user.snsId], function (err, result) {
            if (err) return console.log(err);
            else {
                res.status(200).send({
                    message: 'success'
                })
            };
        });

        connectDB.query(query_2, [charImg, exp, user.snsId], function (err, result) {
            if (err) return console.log(err);
            else {
                res.status(200).send({
                    message: 'success'
                });
            };
        });
    }
};

// 닉네임 중복체크
const nicknameCheck = async (req: Request, res: Response) => {
    const { nickname } = req.body;
    const query = `SELECT nickname FROM users WHERE nickname =?`

    connectDB.query(query, [nickname], (err, result) => {
        if (err) return console.log(err);
        else {
            if (result[0]) {
                res.status(400).send({
                    message: '이미 있는 닉네임입니다.'
                });
            } else {
                res.status(200).send({
                    message: '사용가능한 닉네임입니다.'
                });
            };
        };
    })
};

export default { kakaoCallback, userInfo, signup, nicknameCheck };
