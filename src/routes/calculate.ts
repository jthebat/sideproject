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

// D-day 수정
timeRouter.put('/modifyDay', authMiddleware, timeCtrl.modifyDay);

// timer 시작
timeRouter.post('/startTime', authMiddleware, timeCtrl.startTime);

// timer 끝
timeRouter.put('/endTime', authMiddleware, timeCtrl.endTime);

// 주,월 공부시간 통계 조회
timeRouter.get('/getRecord', authMiddleware, timeCtrl.getRecord);

// 일별 공부시간 통계 조회
timeRouter.get('/dayrecord', authMiddleware, timeCtrl.getDayRecord);

export { timeRouter };
