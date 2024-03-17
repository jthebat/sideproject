import dotenv from 'dotenv';

dotenv.config();

const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'supercooldb';
const MYSQL_USER = process.env.MYSQL_USER || 'superuser';
const MYSQL_PASS = process.env.MYSQL_PASS || 'roseville';

const MYSQL = {
    host: MYSQL_HOST,
    database: MYSQL_DATABASE,
    user: MYSQL_USER,
    pass: MYSQL_PASS
};

const SOCIAL = {
    kakao_id: process.env.KAKAO_ID,
    kakao_url: process.env.PROCESS_MODE !== 'dev' ? process.env.MAIN_KAKAO_URL : process.env.KAKAO_URL
};

const JWT = {
    secretKey: process.env.JWT_SECRET
};

let SERVER_HOSTNAME = process.env.PROCESS_MODE !== 'dev' ? process.env.SERVER_HOSTNAME : 'localhost';
const SERVER_PORT = process.env.SERVER_PORT || 8000;

const SERVER = {
    hostname: SERVER_HOSTNAME,
    port: SERVER_PORT
};

const config = {
    mysql: MYSQL,
    server: SERVER,
    social: SOCIAL,
    jwt: JWT
};

export default config;
