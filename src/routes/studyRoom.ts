import express from "express";
import studyRoomCtrl from "../controllers/studyRoom";
import { authMiddleware } from "../middlewares/auth-middleware";

const roomRouter = express.Router();

// 스터디방 개설
roomRouter.post("/studyroom", authMiddleware, studyRoomCtrl.postRoom);

// 모든 스터디방 조회
// roomRouter.get('/getrooms', authMiddleware, studyRoomCtrl.getRoom);

// 나의 스터디방 목록 조회
// roomRouter.get('/myroomlist', authMiddleware, studyRoomCtrl.myRoomList);

export { roomRouter };
