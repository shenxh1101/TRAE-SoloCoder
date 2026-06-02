const Stats = (function() {
    const MAX_HOURS = 24;

    function recordHourlyStats(gameState) {
        const currentHour = Math.floor(gameState.gameTime / 3600);
        
        if (currentHour > gameState.lastStatHour) {
            const hourStats = {
                hour: currentHour,
                productsProduced: gameState.hourlyProductCount || 0,
                avgUtilization: gameState.hourlyUtilizationSum 
                    ? gameState.hourlyUtilizationSum / (gameState.hourlyUtilizationCount || 1)
                    : 0,
                ordersCompleted: gameState.hourlyOrdersCompleted || 0,
                failures: gameState.hourlyFailures || 0
            };

            gameState.hourlyStats.push(hourStats);
            
            if (gameState.hourlyStats.length > MAX_HOURS) {
                gameState.hourlyStats.shift();
            }

            gameState.lastStatHour = currentHour;
            gameState.hourlyProductCount = 0;
            gameState.hourlyUtilizationSum = 0;
            gameState.hourlyUtilizationCount = 0;
            gameState.hourlyOrdersCompleted = 0;
            gameState.hourlyFailures = 0;
        }
    }

    function updateRealtimeStats(gameState, utilization) {
        if (gameState.hourlyUtilizationSum === undefined) {
            gameState.hourlyUtilizationSum = 0;
            gameState.hourlyUtilizationCount = 0;
            gameState.hourlyProductCount = 0;
            gameState.hourlyOrdersCompleted = 0;
            gameState.hourlyFailures = 0;
        }
        
        gameState.hourlyUtilizationSum += utilization;
        gameState.hourlyUtilizationCount++;
    }

    function recordProduct(gameState) {
        if (gameState.hourlyProductCount === undefined) {
            gameState.hourlyProductCount = 0;
        }
        gameState.hourlyProductCount++;
        gameState.productsProduced++;
    }

    function recordOrder(gameState) {
        if (gameState.hourlyOrdersCompleted === undefined) {
            gameState.hourlyOrdersCompleted = 0;
        }
        gameState.hourlyOrdersCompleted++;
    }

    function recordFailure(gameState) {
        if (gameState.hourlyFailures === undefined) {
            gameState.hourlyFailures = 0;
        }
        gameState.hourlyFailures++;
        gameState.failureCount++;
    }

    function drawEfficiencyChart(canvas, hourlyStats) {
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = Math.floor(rect.width - 30);
        const displayHeight = 200;
        
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const width = displayWidth;
        const height = displayHeight;
        const padding = { top: 20, right: 20, bottom: 30, left: 50 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        ctx.fillStyle = '#0f1419';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        if (hourlyStats.length < 2) {
            ctx.fillStyle = '#718096';
            ctx.font = '14px Noto Sans SC';
            ctx.textAlign = 'center';
            ctx.fillText('暂无数据 - 游戏运行1小时后显示', width / 2, height / 2);
            return;
        }

        const maxValue = Math.max(...hourlyStats.map(s => s.productsProduced), 1);
        const pointSpacing = chartWidth / Math.max(hourlyStats.length - 1, 1);

        const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
        gradient.addColorStop(0, 'rgba(237, 137, 54, 0.3)');
        gradient.addColorStop(1, 'rgba(237, 137, 54, 0)');

        ctx.beginPath();
        ctx.moveTo(padding.left, height - padding.bottom);
        
        hourlyStats.forEach((stat, i) => {
            const x = padding.left + i * pointSpacing;
            const y = padding.top + chartHeight * (1 - stat.productsProduced / maxValue);
            ctx.lineTo(x, y);
        });
        
        ctx.lineTo(padding.left + (hourlyStats.length - 1) * pointSpacing, height - padding.bottom);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        hourlyStats.forEach((stat, i) => {
            const x = padding.left + i * pointSpacing;
            const y = padding.top + chartHeight * (1 - stat.productsProduced / maxValue);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.strokeStyle = '#ed8936';
        ctx.lineWidth = 2;
        ctx.stroke();

        hourlyStats.forEach((stat, i) => {
            const x = padding.left + i * pointSpacing;
            const y = padding.top + chartHeight * (1 - stat.productsProduced / maxValue);
            
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ed8936';
            ctx.fill();
            ctx.strokeStyle = '#0f1419';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });

        ctx.fillStyle = '#a0aec0';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'right';
        
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartHeight / 4) * i;
            const value = Math.round(maxValue * (1 - i / 4));
            ctx.fillText(value.toString(), padding.left - 8, y + 3);
        }

        ctx.fillStyle = '#718096';
        ctx.textAlign = 'center';
        ctx.font = '10px JetBrains Mono';
        
        const labelStep = Math.max(1, Math.ceil(hourlyStats.length / 8));
        hourlyStats.forEach((stat, i) => {
            if (i % labelStep === 0 || i === hourlyStats.length - 1) {
                const x = padding.left + i * pointSpacing;
                ctx.fillText(`H${stat.hour}`, x, height - padding.bottom + 15);
            }
        });

        ctx.fillStyle = '#a0aec0';
        ctx.font = '11px Noto Sans SC';
        ctx.textAlign = 'left';
        ctx.fillText('产量', 8, padding.top - 5);
    }

    function getHourlyOutput(gameState) {
        if (gameState.hourlyStats.length === 0) {
            return gameState.hourlyProductCount || 0;
        }
        const lastStat = gameState.hourlyStats[gameState.hourlyStats.length - 1];
        return lastStat.productsProduced;
    }

    function getAvgUtilization(gameState) {
        if (!gameState.hourlyUtilizationCount || gameState.hourlyUtilizationCount === 0) {
            return 0;
        }
        return gameState.hourlyUtilizationSum / gameState.hourlyUtilizationCount;
    }

    return {
        recordHourlyStats,
        updateRealtimeStats,
        recordProduct,
        recordOrder,
        recordFailure,
        drawEfficiencyChart,
        getHourlyOutput,
        getAvgUtilization
    };
})();

if (typeof window !== 'undefined') {
    window.Stats = Stats;
}
