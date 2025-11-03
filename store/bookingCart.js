import { defineStore } from 'pinia';

const HOLD_DURATION_MS = 5 * 60 * 1000;

const generateId = () => `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const useBookingCartStore = defineStore('bookingCart', {
    state: () => ({
        items: []
    }),
    getters: {
        activeItems(state) {
            const now = Date.now();
            return state.items.filter((item) => item.expiresAt > now);
        },
        totalCount() {
            return this.activeItems.length;
        },
        minRemainingMs() {
            const now = Date.now();
            if (!this.activeItems.length) {
                return 0;
            }
            return Math.max(
                Math.min(...this.activeItems.map((item) => Math.max(item.expiresAt - now, 0))),
                0
            );
        }
    },
    actions: {
        pruneExpired() {
            const now = Date.now();
            this.items = this.items.filter((item) => item.expiresAt > now);
        },
        addItem(payload) {
            this.pruneExpired();
            const now = Date.now();
            const expiresAt = now + HOLD_DURATION_MS;
            const id = generateId();
            this.items.push({
                id,
                expiresAt,
                ...payload
            });
            return id;
        },
        removeItem(id) {
            this.items = this.items.filter((item) => item.id !== id);
        },
        clear() {
            this.items = [];
        },
        getHoldPayload() {
            this.pruneExpired();
            return this.activeItems.map((item) => ({
                technician_uid: item.technician?.uid || null,
                resource_uid: item.resource?.uid || null,
                start_time: item.startTimeISO,
                end_time: item.endTimeISO
            }));
        }
    }
});
