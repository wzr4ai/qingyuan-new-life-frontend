// api/admin.js
import { request } from './request.js';

/**
 * 认证
 */
export const adminLogin = (phone, password) => {
    return request({
        url: '/auth/admin-login',
        method: 'POST',
        data: { phone, password }
    });
};

/**
 * 地点 (Locations)
 */
export const getLocations = () => {
    return request({ url: '/admin/locations' });
};
export const createLocation = (data) => {
    return request({ url: '/admin/locations', method: 'POST', data });
};
export const updateLocation = (uid, data) => {
    return request({ url: `/admin/locations/${uid}`, method: 'PUT', data });
};
export const deleteLocation = (uid) => {
    return request({ url: `/admin/locations/${uid}`, method: 'DELETE' });
};

/**
 * 服务 (Services)
 */
export const getServices = () => {
    return request({ url: '/admin/services' });
};
export const createService = (data) => {
    return request({ url: '/admin/services', method: 'POST', data });
};
export const updateService = (uid, data) => {
    return request({ url: `/admin/services/${uid}`, method: 'PUT', data });
};
export const deleteService = (uid) => {
    return request({ url: `/admin/services/${uid}`, method: 'DELETE' });
};

/**
 * 物理资源 (Resources - 床位)
 */
export const createResource = (data) => {
    return request({ url: '/admin/resources', method: 'POST', data });
};
// 按地点获取资源
export const getResourcesByLocation = (locationUid) => {
    return request({ url: `/admin/locations/${locationUid}/resources` });
};
export const updateResource = (uid, data) => {
    return request({ url: `/admin/resources/${uid}`, method: 'PUT', data });
};
export const deleteResource = (uid) => {
    return request({ url: `/admin/resources/${uid}`, method: 'DELETE' });
};

/**
 * 技师 (Technicians)
 */
export const getTechnicians = () => {
    return request({ url: '/admin/technicians' });
};
export const assignServiceToTech = (technicianUid, serviceUid) => {
    return request({
        url: `/admin/technicians/${technicianUid}/services`,
        method: 'POST',
        data: { service_uid: serviceUid }
    });
};
export const removeServiceFromTech = (technicianUid, serviceUid) => {
    return request({
        url: `/admin/technicians/${technicianUid}/services/${serviceUid}`,
        method: 'DELETE'
    });
};

/**
 * 客户 & 角色管理
 */
export const getCustomers = () => {
    return request({ url: '/admin/customers' });
};
export const updateCustomerRole = (userUid, targetRole) => {
    return request({
        url: `/admin/customers/${userUid}/role`,
        method: 'PUT',
        data: { target_role: targetRole }
    });
};

/**
 * 排班 (Shifts - V6)
 */
export const getShifts = (params) => {
    // params can be { location_uid, technician_uid, start_date, end_date }
    return request({
        url: '/admin/shifts',
        data: params // GET 请求，uni.request 会自动转为 query string
    });
};
export const createShift = (data) => {
    // data is { technician_uid, location_uid, start_time, end_time }
    return request({ url: '/admin/shifts', method: 'POST', data });
};
export const deleteShift = (uid) => {
    return request({ url: `/admin/shifts/${uid}`, method: 'DELETE' });
};
