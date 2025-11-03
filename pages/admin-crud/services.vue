<template>
    <view class="admin-page-container">
        <view class="header">
            <text class="title">服务管理</text>
            <button class="primary-btn" @click="openCreateForm">
                <uni-icons type="plusempty" color="#fff" size="16"></uni-icons>
                新建
            </button>
        </view>

        <uni-list :border="true">
            <uni-list-item
                v-for="item in serviceList"
                :key="item.uid"
                :title="item.name"
                :note="formatServiceNote(item)"
                showArrow
                @click="handleItemOptions(item)"
            >
            </uni-list-item>
        </uni-list>

        <view v-if="!serviceList.length" class="empty-state">
            <text>暂无服务，请点击“新建”添加项目。</text>
        </view>

        <uni-popup ref="formPopup" type="dialog">
            <uni-popup-dialog
                mode="input"
                :title="formTitle"
                confirmText="提交"
                @confirm="handleSubmit"
                :before-close="true"
                @close="formPopup.close()"
            >
                <view class="form-body">
                    <view class="input-group">
                        <text class="input-label">服务名称</text>
                        <text class="input-hint">填写将在预约端展示的项目名称</text>
                        <input
                            class="popup-input"
                            v-model="formData.name"
                            placeholder="例如：全身经络调理"
                        />
                    </view>
                    <view class="input-group">
                        <text class="input-label">技师耗时</text>
                        <text class="input-hint">单位：分钟，用于计算技师可预约时长</text>
                        <input
                            class="popup-input"
                            type="number"
                            v-model="formData.technician_operation_duration"
                            placeholder="例如：60"
                        />
                    </view>
                    <view class="input-group">
                        <text class="input-label">房间占用</text>
                        <text class="input-hint">单位：分钟，用于安排房间或床位周转</text>
                        <input
                            class="popup-input"
                            type="number"
                            v-model="formData.room_operation_duration"
                            placeholder="例如：60"
                        />
                    </view>
                    <view class="input-group">
                        <text class="input-label">缓冲时间</text>
                        <text class="input-hint">单位：分钟，可选，用于清洁或休息间隔</text>
                        <input
                            class="popup-input"
                            type="number"
                            v-model="formData.buffer_time"
                            placeholder="例如：15"
                        />
                    </view>
                </view>
            </uni-popup-dialog>
        </uni-popup>
    </view>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { getServices, createService, updateService, deleteService } from '@/api/admin.js';

const serviceList = ref([]);
const isSubmitting = ref(false);

const formPopup = ref(null);
const formTitle = ref('新建服务');
const isEditMode = ref(false);

const defaultForm = {
    uid: null,
    name: '',
    technician_operation_duration: '60',
    room_operation_duration: '60',
    buffer_time: '15'
};
const formData = ref({ ...defaultForm });

const fetchServices = async () => {
    try {
        const data = await getServices();
        serviceList.value = data;
    } catch (error) {
        console.error('加载服务失败:', error);
        uni.showToast({ title: '加载失败', icon: 'error' });
    }
};

onMounted(fetchServices);

const formatServiceNote = (item) => {
    return `技师 ${item.technician_operation_duration} 分钟 · 房间 ${item.room_operation_duration} 分钟 · 缓冲 ${item.buffer_time || 0} 分钟`;
};

const openCreateForm = () => {
    formTitle.value = '新建服务';
    isEditMode.value = false;
    formData.value = { ...defaultForm };
    formPopup.value.open();
};

const openEditForm = (item) => {
    formTitle.value = `编辑：${item.name}`;
    isEditMode.value = true;
    formData.value = {
        uid: item.uid,
        name: item.name || '',
        technician_operation_duration: item.technician_operation_duration != null ? String(item.technician_operation_duration) : '',
        room_operation_duration: item.room_operation_duration != null ? String(item.room_operation_duration) : '',
        buffer_time: item.buffer_time != null ? String(item.buffer_time) : ''
    };
    formPopup.value.open();
};

const handleItemOptions = (item) => {
    uni.showActionSheet({
        itemList: ['编辑', '删除'],
        success: ({ tapIndex }) => {
            if (tapIndex === 0) {
                openEditForm(item);
            } else if (tapIndex === 1) {
                confirmDelete(item);
            }
        }
    });
};

const confirmDelete = (item) => {
    uni.showModal({
        title: '确认删除',
        content: `确定删除服务「${item.name}」吗？`,
        confirmText: '删除',
        confirmColor: '#e43d33',
        success: async (res) => {
            if (!res.confirm) {
                return;
            }
            await deleteServiceItem(item);
        }
    });
};

const deleteServiceItem = async (item) => {
    if (isSubmitting.value) {
        return;
    }
    isSubmitting.value = true;
    try {
        await deleteService(item.uid);
        uni.showToast({ title: '删除成功', icon: 'success' });
        await fetchServices();
    } catch (error) {
        console.error('删除服务失败:', error);
        uni.showToast({ title: error.data?.detail || '删除失败', icon: 'error' });
    } finally {
        isSubmitting.value = false;
    }
};

const handleSubmit = async () => {
    if (!formData.value.name) {
        uni.showToast({ title: '名称不能为空', icon: 'none' });
        return;
    }
    if (
        !formData.value.technician_operation_duration ||
        !formData.value.room_operation_duration
    ) {
        uni.showToast({ title: '请填写耗时信息', icon: 'none' });
        return;
    }
    if (isSubmitting.value) {
        return;
    }
    isSubmitting.value = true;
    try {
        const payload = {
            name: formData.value.name,
            technician_operation_duration: Number(formData.value.technician_operation_duration),
            room_operation_duration: Number(formData.value.room_operation_duration),
            buffer_time: Number(formData.value.buffer_time || 0)
        };
        if (isEditMode.value) {
            await updateService(formData.value.uid, payload);
            uni.showToast({ title: '更新成功', icon: 'success' });
        } else {
            await createService(payload);
            uni.showToast({ title: '创建成功', icon: 'success' });
        }
        formPopup.value.close();
        await fetchServices();
    } catch (error) {
        console.error('保存服务失败:', error);
        uni.showToast({ title: error.data?.detail || '操作失败', icon: 'error' });
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<style scoped>
@import '/static/css/admin.css';

.empty-state {
    text-align: center;
    color: #888888;
    padding: 40px 20px;
    background-color: #ffffff;
    border-radius: 8px;
    margin-top: 20px;
}

.popup-input {
    height: 40px;
    border: 1px solid #e5e5e5;
    border-radius: 4px;
    padding: 0 10px;
}

.form-body {
    padding: 10px;
    display: flex;
    flex-direction: column;
}

.input-group {
    margin-bottom: 14px;
    display: flex;
    flex-direction: column;
}

.input-label {
    font-size: 14px;
    font-weight: 600;
    color: #333333;
    margin-bottom: 4px;
}

.input-hint {
    font-size: 12px;
    color: #888888;
    margin-bottom: 6px;
}
</style>
