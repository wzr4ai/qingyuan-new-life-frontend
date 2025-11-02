<template>
	<view class="admin-page-container">
		<view class="header">
			<text class="title">地点管理</text>
			<button class="primary-btn" @click="openCreateForm">
                <uni-icons type="plusempty" color="#fff" size="16"></uni-icons>
                新建地点
            </button>
		</view>

		<view class="data-table">
			<uni-table border stripe emptyText="暂无数据">
				<uni-tr>
					<uni-th align="left">名称</uni-th>
					<uni-th align="left">地址</uni-th>
					<uni-th align="left">UID</uni-th>
					<uni-th align="center" width="150">操作</uni-th>
				</uni-tr>
				<uni-tr v-for="item in locationList" :key="item.uid">
					<uni-td>{{ item.name }}</uni-td>
					<uni-td>{{ item.address || '-' }}</uni-td>
					<uni-td>{{ item.uid }}</uni-td>
					<uni-td align="center">
						<text class="link-btn" @click="openEditForm(item)">编辑</text>
						</uni-td>
				</uni-tr>
			</uni-table>
		</view>

		<uni-popup ref="formPopup" type="dialog">
			<uni-popup-dialog
				mode="input"
				:title="formTitle"
				confirmText="提交"
				@confirm="handleSubmit"
			>
				<view class="form-body">
					<input class="popup-input" v-model="formData.name" placeholder="请输入地点名称" />
					<input class="popup-input" v-model="formData.address" placeholder="请输入详细地址 (可选)" />
				</view>
			</uni-popup-dialog>
		</uni-popup>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getLocations, createLocation, updateLocation } from '@/api/admin.js';

// --- 页面生命周期 ---

// (H5 专属) 通知 leftWindow 更新激活状态
// #ifdef H5
onMounted(() => {
    // 确保 DOM 渲染后
    setTimeout(() => {
        uni.sendSocketMessage({ data: 'routeChange' });
    }, 200);
});
// #endif


// --- 1. 列表数据 ---
const locationList = ref([]);

const fetchLocations = async () => {
	try {
		const data = await getLocations();
		locationList.value = data;
	} catch (error) {
		console.error('获取地点列表失败:', error);
		uni.showToast({ title: '加载失败', icon: 'error' });
	}
};

// 页面加载时获取数据
onMounted(fetchLocations);


// --- 2. 表单弹窗逻辑 ---
const formPopup = ref(null); // 弹窗 ref
const formTitle = ref('新建地点');
const isEditMode = ref(false);

const initialFormData = {
    uid: null,
    name: '',
    address: ''
};
const formData = ref({ ...initialFormData });

// 打开 "新建" 弹窗
const openCreateForm = () => {
	formTitle.value = '新建地点';
	isEditMode.value = false;
	formData.value = { ...initialFormData };
	formPopup.value.open();
};

// 打开 "编辑" 弹窗
const openEditForm = (item) => {
	formTitle.value = `编辑: ${item.name}`;
	isEditMode.value = true;
	formData.value = { ...item }; // 复制数据到表单
	formPopup.value.open();
};

// 提交表单 (新建或编辑)
const handleSubmit = async () => {
	if (!formData.value.name) {
		uni.showToast({ title: '名称不能为空', icon: 'none' });
		return;
	}

	try {
		if (isEditMode.value) {
			// --- 编辑模式 ---
			await updateLocation(formData.value.uid, {
				name: formData.value.name,
				address: formData.value.address
			});
			uni.showToast({ title: '更新成功', icon: 'success' });
		} else {
			// --- 新建模式 ---
			await createLocation({
				name: formData.value.name,
				address: formData.value.address
			});
			uni.showToast({ title: '创建成功', icon: 'success' });
		}
		
		formPopup.value.close();
		fetchLocations(); // 重新加载列表
		
	} catch (error) {
		console.error('提交失败:', error);
		uni.showToast({ title: error.data?.detail || '操作失败', icon: 'error' });
	}
};
</script>

<style>
/* 引入全局 Admin 样式 (我们需要在 static/css/common.css 中定义) */
@import '/static/css/admin.css';

.popup-input {
	height: 40px;
	border: 1px solid #e5e5e5;
	border-radius: 4px;
	padding: 0 10px;
	margin-bottom: 10px;
}
.form-body {
	padding: 10px;
}
</style>