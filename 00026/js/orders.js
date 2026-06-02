const Orders = (function() {
    const PRODUCT_TYPES = {
        product_a: { name: '标准件', icon: 'fa-cog', basePrice: 100 },
        product_b: { name: '涂装件', icon: 'fa-palette', basePrice: 150 },
        product_c: { name: '包装件', icon: 'fa-gift', basePrice: 200 }
    };

    function generateId() {
        return 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }

    function generateRandomOrder(gameTime) {
        const productIds = Object.keys(PRODUCT_TYPES);
        const numProducts = Math.floor(Math.random() * 3) + 1;
        const products = [];
        let totalReward = 0;

        for (let i = 0; i < numProducts; i++) {
            const productId = productIds[Math.floor(Math.random() * productIds.length)];
            const count = Math.floor(Math.random() * 5) + 1;
            
            if (!products.find(p => p.productId === productId)) {
                const product = PRODUCT_TYPES[productId];
                products.push({ productId, count });
                totalReward += product.basePrice * count;
            }
        }

        const deadline = gameTime + 300 + Math.floor(Math.random() * 300);
        const bonus = Math.floor(totalReward * 0.2);

        return {
            id: generateId(),
            products: products,
            reward: totalReward,
            bonus: bonus,
            deadline: deadline,
            createdAt: gameTime,
            status: 'pending',
            canDeliver: false
        };
    }

    function checkOrderFulfillment(order, inventory) {
        for (const req of order.products) {
            const inStock = inventory[req.productId] || 0;
            if (inStock < req.count) {
                return false;
            }
        }
        return true;
    }

    function fulfillOrder(order, inventory, gameTime) {
        for (const req of order.products) {
            inventory[req.productId] -= req.count;
        }

        order.status = 'completed';
        const isOnTime = gameTime <= order.deadline;
        const totalReward = order.reward + (isOnTime ? order.bonus : 0);

        return {
            success: true,
            reward: totalReward,
            bonus: isOnTime ? order.bonus : 0,
            isOnTime: isOnTime
        };
    }

    function updateOrders(orders, gameTime, inventory) {
        const results = [];

        for (const order of orders) {
            if (order.status === 'pending' && gameTime > order.deadline) {
                order.status = 'failed';
                results.push({
                    type: 'failed',
                    order: order
                });
            }
        }

        return results;
    }

    function getOrderProgress(order, inventory) {
        let totalItems = 0;
        let fulfilledItems = 0;

        for (const req of order.products) {
            totalItems += req.count;
            fulfilledItems += Math.min(inventory[req.productId] || 0, req.count);
        }

        return totalItems > 0 ? (fulfilledItems / totalItems) * 100 : 0;
    }

    function getTimeRemaining(order, gameTime) {
        return Math.max(0, order.deadline - gameTime);
    }

    function isUrgent(order, gameTime) {
        const remaining = getTimeRemaining(order, gameTime);
        return order.status === 'pending' && remaining < 60;
    }

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function getProductInfo(productId) {
        return PRODUCT_TYPES[productId] || null;
    }

    return {
        generateRandomOrder,
        checkOrderFulfillment,
        fulfillOrder,
        updateOrders,
        getOrderProgress,
        getTimeRemaining,
        isUrgent,
        formatTime,
        getProductInfo,
        PRODUCT_TYPES
    };
})();

if (typeof window !== 'undefined') {
    window.Orders = Orders;
}
