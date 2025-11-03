// api/schedule.js
import { request } from './request.js';

/**
 * 排班可用地点
 */
export const getScheduleLocations = () => {
    return request({ url: '/schedule/locations' });
};

export const getLocationDays = (locationUid, days = 14) => {
    return request({
        url: '/schedule/location-days',
        data: {
            location_uid: locationUid,
            days
        }
    });
};

export const getLocationServices = (locationUid) => {
    return request({
        url: '/schedule/location-services',
        data: { location_uid: locationUid }
    });
};

export const getLocationTechnicians = (payload) => {
    return request({
        url: '/schedule/location-technicians',
        method: 'POST',
        data: payload
    });
};

export const queryPackageAvailability = (payload) => {
    return request({
        url: '/schedule/package-availability',
        method: 'POST',
        data: payload
    });
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
