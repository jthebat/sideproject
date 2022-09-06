import bodyParser from 'body-parser';
import express from 'express';
import logging from './config/logging';
import config from './config/config';
import { userRouter } from './routes/user';

const NAMESPACE = 'Server';
const app = express();
const router = express();

/** Log the request */
router.use((req, res, next) => {
    /** Log the req */
    logging.info(NAMESPACE, `METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}]`);

    res.on('finish', () => {
        /** Log the res */
        logging.info(NAMESPACE, `METHOD: [${req.method}] - URL: [${req.url}] - STATUS: [${res.statusCode}] - IP: [${req.socket.remoteAddress}]`);
    });

    next();
});

/** Parse the body of the request */
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

/** Rules of our API */
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method == 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).json({});
    }

    next();
});

/** passport for social login */
import { kakaoPassport } from './passport/kakao';
kakaoPassport();

/** Routes go here */
app.use('/api/user', [userRouter]);
app.get('/', (req, res) => {
    res.send('This is a test page');
});

/** Error handling */
router.use((req, res, next) => {
    const error = new Error('Not found');

    res.status(404).json({
        message: error.message
    });
});

app.listen(config.server.port, (): void => logging.info(NAMESPACE, `Server is running ${config.server.hostname}:${config.server.port}`));
