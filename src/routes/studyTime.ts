import express from "express";
import studyTimeCtrl from "../controllers/studyTime";
import { authMiddleware } from "../middlewares/auth-middleware";

const timeRouter = express.Router();

timeRouter.post('/startTime', authMiddleware, studyTimeCtrl.startTime);

timeRouter.put('/endTime', authMiddleware, studyTimeCtrl.endTime)

export { timeRouter };