import express from 'express';
import timeCtrl from '../controllers/time';
import { authMiddleware } from '../middlewares/auth-middleware';

const timeRouter = express.Router();

// D-day 작성
timeRouter.post('/setDay', authMiddleware, timeCtrl.setDay);

// D-day 목록 가져오기
timeRouter.get('/getDDays', authMiddleware, timeCtrl.getDdays);

// D-day 삭제
timeRouter.delete('/removeDay', authMiddleware, timeCtrl.removeDay);

// timer 시작
timeRouter.post('/startTime', authMiddleware, timeCtrl.startTime);

// timer 끝
timeRouter.put('/endTime', authMiddleware, timeCtrl.endTime)

export { timeRouter };