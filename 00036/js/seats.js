let attendanceData = {
    A: { total: 120, sold: 114, rate: 95 },
    B: { total: 120, sold: 94, rate: 78 },
    C: { total: 120, sold: 30, rate: 25 },
    D: { total: 120, sold: 74, rate: 62 },
    E: { total: 120, sold: 54, rate: 45 }
};

function showSeatInfo(seatData) {
    const panel = document.getElementById('seatInfoPanel');
    document.getElementById('seatNumber').textContent = seatData.id;
    document.getElementById('seatZone').textContent = seatData.zone + '区';
    document.getElementById('seatStatus').textContent = seatData.isSold ? '已售出' : '未售出';
    document.getElementById('seatStatus').style.color = seatData.isSold ? '#00ff88' : '#ffaa00';
    document.getElementById('seatPrice').textContent = '¥' + seatData.price;
    
    panel.style.display = 'block';
    
    setTimeout(() => {
        panel.style.display = 'none';
    }, 5000);
}

function updateAttendanceDisplay() {
    Object.keys(attendanceData).forEach(zone => {
        const item = document.querySelector(`.attendance-item[data-zone="${zone}"]`);
        if (item) {
            const fill = item.querySelector('.attendance-fill');
            const value = item.querySelector('.attendance-value');
            
            fill.style.width = attendanceData[zone].rate + '%';
            value.textContent = attendanceData[zone].rate + '%';
            
            value.classList.toggle('low', attendanceData[zone].rate < 30);
        }
    });
}

function updateAttendanceFromAPI(apiData) {
    const oldData = JSON.parse(JSON.stringify(attendanceData));
    attendanceData = apiData.data;
    
    Object.keys(attendanceData).forEach(zone => {
        if (oldData[zone] && oldData[zone].rate !== attendanceData[zone].rate) {
            const faceData = API.faceRecognize(zone);
        }
    });
    
    updateAttendanceDisplay();
    updateLightingFromAPI(apiData.lighting);
}

function getAttendanceForExport() {
    return Object.entries(attendanceData).map(([zone, data]) => ({
        '区域': zone + '区',
        '总座位数': data.total,
        '已售出': data.sold,
        '上座率': data.rate + '%'
    }));
}
