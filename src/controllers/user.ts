import { NextFunction, Request, Response } from 'express';
// import { Connect, Query } from '../config/mysql';
import logging from '../config/logging';
import passport from 'passport';

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
    passport.authenticate(
        'kakao',
        { failureRedirect: '/' },
        (err, user, info) => {
            if (err) return next(err);

        res.status(200).json({
            status: 'success'});

    })(req, res, next);
};

export default {  kakaoCallback };
