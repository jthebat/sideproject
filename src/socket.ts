import express from 'express';
import http from 'http'
import { Server } from 'socket.io'
import connectDB from "./config/mysql";
import cors from 'cors'

const app = express()
app.use(cors);

//soket cors 설정
const socket = (server: http.Server) => {
    const io = new Server(server, {
        cors: {
            origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
            methods: ['GET', 'POST']
        }
    });

    /**1:N P2P */
    /*
    let users:any = {};
    let socketToRoom:any = {};
    const maximum = process.env.MAXIMUM || 4;
    */

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


        //webRTC part

        /**니코 webRTC 코드 signaling  */
        /*
        socket.on("join_room", (roomName) => {
            socket.join(roomName);
            socket.to(roomName).emit("welcome");
        });
        socket.on("offer", (offer, roomName) => {
            socket.to(roomName).emit("offer", offer);
        });
        socket.on("answer", (answer, roomName) => {
            socket.to(roomName).emit("answer", answer);
        });
        socket.on("ice", (ice, roomName) => {
            socket.to(roomName).emit("ice", ice);
        });
        */

        /**1:N P2P  */
        /*
        socket.on("join_room", (data) => {
               if (users[data.room]) {
                   const length = users[data.room].length;
                   if (length === maximum) {
                       socket.to(socket.id).emit("room_full");
                       return;
                   }
                   users[data.room].push({ id: socket.id, email: data.email });
               } else {
                   users[data.room] = [{ id: socket.id, email: data.email }];
               }
               socketToRoom[socket.id] = data.room;

               socket.join(data.room);
               console.log(`[${socketToRoom[socket.id]}]: ${socket.id} enter`);

               const usersInThisRoom = users[data.room].filter((user) => user.id !== socket.id);

               console.log(usersInThisRoom);

               io.sockets.to(socket.id).emit("all_users", usersInThisRoom);
           });

           socket.on("offer", (data) => {
               socket.to(data.offerReceiveID).emit("getOffer", { sdp: data.sdp, offerSendID: data.offerSendID, offerSendEmail: data.offerSendEmail });
           });

           socket.on("answer", (data) => {
               socket.to(data.answerReceiveID).emit("getAnswer", { sdp: data.sdp, answerSendID: data.answerSendID });
           });

           socket.on("candidate", (data) => {
               socket.to(data.candidateReceiveID).emit("getCandidate", { candidate: data.candidate, candidateSendID: data.candidateSendID });
           });

           socket.on("disconnect", () => {
               console.log(`[${socketToRoom[socket.id]}]: ${socket.id} exit`);
               const roomID = socketToRoom[socket.id];
               let room = users[roomID];
               if (room) {
                   room = room.filter((user) => user.id !== socket.id);
                   users[roomID] = room;
                   if (room.length === 0) {
                       delete users[roomID];
                       return;
                   }
               }
               socket.to(roomID).emit("user_exit", { id: socket.id });
               console.log(users);
           });
           */

    });
};


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
};

export default socket;

