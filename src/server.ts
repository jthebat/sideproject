import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';

import logging from './config/logging';
import config from './config/config';
import router from './routes'
import socketConnect from './socket';
import { kakaoPassport } from './passport/kakao';
import { errorHandler } from './middlewares/errorHandler'

const NAMESPACE = 'Server';
const app = express();
const SERVER = http.createServer(app);

const corsOption = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://focusmate.co.kr'],
    credentials: true,
};

/** Log the request */
app.use((req, res, next) => {
    /** Log the req */
    // logging.info(NAMESPACE, `METHOD: [${req.method}] - URL: [${req.url}]`);

    res.on('finish', () => {
        /** Log the res */
        logging.info(NAMESPACE, `METHOD: [${req.method}] - URL: [${req.url}] - STATUS: [${res.statusCode}]`);
    });
    next();
});

/** Parse the body of the request */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/** Rules of our API */
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method == 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).json(req);
    }

    next();
});

app.use(helmet());
app.use(cors(corsOption));

/** passport for social login */
kakaoPassport();

/** Routes go here */
app.use('/api', router);
app.get('/', (req, res) => {
    res.send('This is a test page');
});

/** Error handling */
app.use((req, res) => {
    const error = new Error('Not found');

    res.status(404).json({
        message: error.message
    });
});

app.use((err: Error, req: Request, res: Response) => {
    console.error(err.stack);
    res.status(500).send('Server Error');
});

socketConnect(SERVER);

// 에러 핸들러
app.use(errorHandler);

SERVER.listen(config.server.port, (): void => logging.info(NAMESPACE, `Server is running ${config.server.hostname}:${config.server.port}`));
