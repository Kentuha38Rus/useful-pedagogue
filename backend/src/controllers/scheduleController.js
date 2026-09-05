const scheduleService = require('../services/scheduleService');

exports.getMySchedule = async (req, res, next) => {
  try {
    const lessons = await scheduleService.getScheduleForUser(req.user);
    res.json(lessons);
  } catch (error) {
    next(error);
  }
};

exports.getGroupSchedule = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const lessons = await scheduleService.getScheduleForGroup(groupId);
    res.json(lessons);
  } catch (error) {
    next(error);
  }
};

exports.createLesson = async (req, res, next) => {
  try {
    const lesson = await scheduleService.createLesson(req.body);
    res.status(201).json(lesson);
  } catch (error) {
    next(error);
  }
};

exports.markAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { attendances } = req.body;
    const updated = await scheduleService.markAttendance(id, attendances);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};