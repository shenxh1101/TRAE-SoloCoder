let energyData = {
    lighting: 1250,
    aircon: 2800,
    water: 15.3,
    total: 4065.3
};

function exportOperationReport() {
    API.exportExcel();
    showNotification('导出成功', '运营报表已从服务器生成并下载', 'success');
}

function updateEnergyFromAPI(apiData) {
    energyData = apiData;
    updateEnergyDisplay();
}

function updateEnergyDisplay() {
    const items = document.querySelectorAll('.energy-item .energy-value');
    if (items.length >= 3 && energyData) {
        items[0].textContent = Math.round(energyData.lighting).toLocaleString() + ' kWh';
        items[1].textContent = Math.round(energyData.aircon).toLocaleString() + ' kWh';
        items[2].textContent = energyData.water.toFixed(1) + ' m³';
    }
}

function getEnergyForExport() {
    if (!lightingStates || !lawnData || !energyData) return [];
    
    const lightingSaving = Object.values(lightingStates).filter(s => s.dimmed).length * 67;
    
    return [
        {
            '能耗类型': '照明能耗',
            '消耗量': energyData.lighting.toFixed(1) + ' kWh',
            '费用估算': '¥' + (energyData.lighting * 1.2).toFixed(2),
            '节能情况': lightingSaving > 0 ? '节能 ' + lightingSaving + '%' : '正常模式'
        },
        {
            '能耗类型': '空调能耗',
            '消耗量': energyData.aircon.toFixed(1) + ' kWh',
            '费用估算': '¥' + (energyData.aircon * 1.5).toFixed(2),
            '节能情况': '正常运行'
        },
        {
            '能耗类型': '喷灌用水',
            '消耗量': energyData.water.toFixed(1) + ' m³',
            '费用估算': '¥' + (energyData.water * 5.5).toFixed(2),
            '节能情况': lawnData.sprinklerActive ? '自动控制中' : '已关闭'
        },
        {
            '能耗类型': '总能耗',
            '消耗量': energyData.total.toFixed(1) + ' kWh',
            '费用估算': '¥' + ((energyData.lighting * 1.2) + (energyData.aircon * 1.5) + (energyData.water * 5.5)).toFixed(2),
            '节能情况': lightingSaving > 0 ? '已节约 ¥' + ((energyData.lighting * 1.2 * lightingSaving) / 100).toFixed(2) : '无'
        }
    ];
}
