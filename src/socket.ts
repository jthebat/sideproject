import express from 'express';
import http from 'http'
import { Server } from 'socket.io'
import connectDB from "./config/mysql";
import cors from 'cors'

const app = express()
app.use(cors);

//soket cors 설정
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST']
    },
});

function ExistNickname(nickname: string, roomId: number, snsId: number) {
    const findNickname = `SELECT chatRoomId, roomId, nickname FROM chatRoom as CR JOIN users as u ON u.snsId = CR.snsId WHERE nickname = ?;`
    const insertUser = `INSERT INTO chatRoom (roomId, snsId) VALUE(?,?)`

    connectDB.query(findNickname, [nickname], function (err, result) {
        if (err) return console.log(err);
        else {
            connectDB.query(insertUser, [roomId, snsId], function (err, reuslt) {
                if (err) return console.log(err);
                else {
                    return nickname;
                };
            });
        };
    });
};

function NewMessages(snsId: number, roomId: number, message: string) {
    const insertMsg = `INSERT INTO chatMsg (snsId, roomId, message, sendTime) VALUE(?,?,?,?)`
    const sendTime = new Date();

    connectDB.query(insertMsg, [snsId, roomId, message, sendTime], function (err, result) {
        if (err) return console.log(err);
        return;
    });
};

function ExistMsg(roomId: number) {
    const FindMsg = `SELECT nickname, message, sendTime FROM chatMsg as CM JOIN users as U ON U.snsId = CM.snsId WHERE roomId = ?`

    connectDB.query(FindMsg, [roomId], function (err, result) {
        if (err) return console.log(err);
        else {
            return result;
        }
    })
}

const socketConnect = () => {
    io.on('connection', (socket) => {
        console.log('소켓연결 성공!');
        io.emit('firstEvent', '소켓 연결 성공!');

        // 방 입장 & 그동안의 채팅 보이기?
        socket.on('enter_room', (nickname, roomId, snsId) => {
            socket.join(roomId); // roomId 맞는 room 생성/입장
            ExistNickname(nickname, roomId, snsId);
            socket.to(roomId).emit('welcome', nickname);
            // 처음엔 나오지 않고 입장 후 다른 누군가 입장했을때 그 방에 있는 모두에게 발동
            ExistMsg(roomId); // 해당 방의 모든 메세지 보내기
        });

        // 방 퇴장
        socket.on('disconnect', (nickname) => {
            socket.rooms.forEach((room) => socket.to(room).emit("bye", nickname));
        });

        // 메세지 보내기
        socket.on('new_message', (nickname, snsId, msg, roomId, done) => {
            NewMessages(snsId, roomId, msg);
            socket.to(roomId).emit('new_message', `${nickname}: ${msg}`);

            done();
        });
    });
};

export default socketConnect;
