import express from 'express';
import timeCtrl from '../controllers/time';
import { authMiddleware } from '../middlewares/auth-middleware';

const timeRouter = express.Router();

// 게시물 작성
timeRouter.post('/setDay', authMiddleware, timeCtrl.setDay);

//
timeRouter.get('/getDDays', authMiddleware, timeCtrl.getDdays);

timeRouter.delete('/removeDay', authMiddleware, timeCtrl.removeDay);

export { timeRouter };
