<template>
    <view class="admin-page-container">
        <view class="header">
            <text class="title">客户管理</text>
            <button class="primary-btn" @click="refreshCustomers" :disabled="isLoading">
                <uni-icons type="refresh" color="#fff" size="16"></uni-icons>
                刷新
            </button>
        </view>

        <uni-list v-if="customerList.length" :border="true">
            <uni-list-item
                v-for="customer in customerList"
                :key="customer.uid"
                :title="customer.nickname || customer.phone || '匿名客户'"
                :note="formatCustomerNote(customer)"
            >
                <template #footer>
                    <button class="list-btn" @click.stop="confirmPromote(customer, 'technician')">
                        设为技师
                    </button>
                    <button class="list-btn danger" @click.stop="confirmPromote(customer, 'admin')">
                        设为管理员
                    </button>
                </template>
            </uni-list-item>
        </uni-list>

        <view v-else class="empty-state">
            <text>当前没有待升级的客户。</text>
        </view>
    </view>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { getCustomers, updateCustomerRole } from '@/api/admin.js';

const customerList = ref([]);
const isLoading = ref(false);

const formatCustomerNote = (customer) => {
    const phone = customer.phone || '未绑定手机号';
    return `角色：${customer.role || 'customer'} · 手机：${phone}`;
};

const fetchCustomers = async () => {
    try {
        const data = await getCustomers();
        customerList.value = data.map((item) => ({
            ...item,
            nickname: item.nickname || item.phone || '匿名客户'
        }));
    } catch (error) {
        console.error('加载客户失败:', error);
        uni.showToast({ title: '加载客户失败', icon: 'error' });
    }
};

const refreshCustomers = async () => {
    if (isLoading.value) {
        return;
    }
    isLoading.value = true;
    try {
        await fetchCustomers();
    } finally {
        isLoading.value = false;
    }
};

const confirmPromote = (customer, targetRole) => {
    const roleText = targetRole === 'technician' ? '技师' : '管理员';
    uni.showModal({
        title: '确认操作',
        content: `确定将「${customer.nickname}」升级为${roleText}吗？`,
        success: async (res) => {
            if (!res.confirm) {
                return;
            }
            try {
                await updateCustomerRole(customer.uid, targetRole);
                uni.showToast({ title: '角色已更新', icon: 'success' });
                await fetchCustomers();
            } catch (error) {
                console.error('更新角色失败:', error);
                uni.showToast({ title: error.data?.detail || '操作失败', icon: 'error' });
            }
        }
    });
};

onMounted(refreshCustomers);
</script>

<style scoped>
@import '/static/css/admin.css';

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.title {
    font-size: 24px;
    font-weight: bold;
}

.list-btn {
    padding: 4px 10px;
    border-radius: 16px;
    border: 1px solid #007aff;
    color: #007aff;
    background-color: transparent;
    font-size: 12px;
    margin-left: 8px;
}

.list-btn.danger {
    border-color: #e43d33;
    color: #e43d33;
}

.empty-state {
    text-align: center;
    color: #888888;
    padding: 40px 20px;
    background-color: #ffffff;
    border-radius: 8px;
}
</style>
