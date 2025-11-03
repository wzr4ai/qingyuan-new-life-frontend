// api/schedule.js
import { request } from './request.js';

/**
 * 排班可用地点
 */
export const getScheduleLocations = () => {
    return request({ url: '/schedule/locations' });
};

/**
 * 技师排班日历（当前登录用户）
 */
export const getMyShiftCalendar = (params) => {
    return request({
        url: '/schedule/my-shifts',
        data: params
    });
};

/**
 * 技师创建排班
 */
export const createMyShifts = (items) => {
    return request({
        url: '/schedule/my-shifts',
        method: 'POST',
        data: { items }
    });
};

/**
 * 可预约时间槽
 */
export const getAvailability = (params) => {
    return request({
        url: '/schedule/availability',
        data: params
    });
};

/**
 * 创建预约
 */
export const createAppointment = (data) => {
    return request({
        url: '/schedule/appointments',
        method: 'POST',
        data
    });
};
