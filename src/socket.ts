import express from 'express';
import * as http from 'http'
import * as IO from 'socket.io'
import cors from 'cors'


const app = express()
//soket cors 설정
const server: http.Server = http.createServer(app)
const io = new IO.Server(server, {
    cors: {
        origin: ['http://loaclhost:3000', 'http://127.0.0.1:3000'],
        credentials: true,
    },
});

app.use(cors());

const socketConnect = () => {
    io.on('connection', () => {
        console.log('소켓연결 성공!');
        io.emit('firstEvent', '소켓 연결 성공!');
    });
};

export default socketConnect;