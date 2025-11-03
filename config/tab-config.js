import CustomerHome from '@/components/customer/CustomerHome.vue';
import CustomerAppointments from '@/components/customer/CustomerAppointments.vue';
import TechnicianAppointments from '@/components/technician/TechnicianAppointments.vue';
import AdminDashboard from '@/components/admin/AdminDashboard.vue';
import AdminManage from '@/components/admin/AdminManage.vue';
import ProfileCenter from '@/components/profile/ProfileCenter.vue';
import ComingSoon from '@/components/common/ComingSoon.vue';
import ScheduleBoard from '@/components/schedule/ScheduleBoard.vue';

const buildTabs = (tabs) => tabs.map((tab) => ({
    tabText: tab.tabText ?? '',
    navTitle: tab.navTitle ?? '',
    component: tab.component ?? ComingSoon
}));

export const ROLE_TAB_CONFIG = {
    customer: buildTabs([
        { tabText: '预约', navTitle: '预约', component: CustomerHome },
        { tabText: '我的预约', navTitle: '我的预约', component: CustomerAppointments },
        { tabText: '个人中心', navTitle: '个人中心', component: ProfileCenter },
        { tabText: '敬请期待', navTitle: '敬请期待', component: ComingSoon }
    ]),
    technician: buildTabs([
        { tabText: '我的排班', navTitle: '我的排班', component: ScheduleBoard },
        { tabText: '工作预约', navTitle: '工作预约', component: TechnicianAppointments },
        { tabText: '个人中心', navTitle: '个人中心', component: ProfileCenter },
        { tabText: '敬请期待', navTitle: '敬请期待', component: ComingSoon }
    ]),
    admin: buildTabs([
        { tabText: '仪表盘', navTitle: '仪表盘', component: AdminDashboard },
        { tabText: '数据管理', navTitle: '数据管理', component: AdminManage },
        { tabText: '排班', navTitle: '排班管理', component: ScheduleBoard },
        { tabText: '我的', navTitle: '个人中心', component: ProfileCenter }
    ])
};

export const getTabTextsByRole = (role) => {
    const roleConfig = ROLE_TAB_CONFIG[role] || ROLE_TAB_CONFIG.customer;
    return roleConfig.map((item) => item.tabText || '');
};
