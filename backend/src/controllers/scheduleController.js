const scheduleService = require('../services/scheduleService');
const { requireTenant } = require('../utils/helpers');

exports.getMySchedule = async (req, res, next) => {
  try {
    // req.user уже содержит tenantId; сервис использует его
    const lessons = await scheduleService.getScheduleForUser(req.user);
    res.json(lessons);
  } catch (error) {
    next(error);
  }
};

exports.getGroupSchedule = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const lessons = await scheduleService.getScheduleForGroup(req.params.groupId, tid);
    res.json(lessons);
  } catch (error) {
    next(error);
  }
};

exports.createLesson = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const lesson = await scheduleService.createLesson(req.body, tid);
    res.status(201).json(lesson);
  } catch (error) {
    next(error);
  }
};

exports.markAttendance = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { id } = req.params;
    const { attendances } = req.body;
    const updated = await scheduleService.markAttendance(id, attendances, tid);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};