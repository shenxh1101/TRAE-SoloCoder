let lightingStates = {
    A: { dimmed: false, intensity: 1.2 },
    B: { dimmed: false, intensity: 1.2 },
    C: { dimmed: true, intensity: 0.4 },
    D: { dimmed: false, intensity: 1.2 },
    E: { dimmed: false, intensity: 1.2 }
};

let manualOverride = false;

function updateLightingFromAPI(apiLighting) {
    if (!apiLighting) return;
    
    Object.keys(apiLighting).forEach(zone => {
        const oldState = lightingStates[zone];
        const newState = apiLighting[zone];
        
        if (oldState && oldState.dimmed !== newState.dimmed) {
            if (newState.dimmed) {
                animateZoneLight(zone, newState.intensity);
                showNotification('节能模式已启动', zone + '区上座率低于30%，灯光已调暗', 'success');
            } else {
                animateZoneLight(zone, newState.intensity);
                showNotification('灯光恢复', zone + '区灯光已恢复正常亮度', 'info');
            }
        } else if (oldState && Math.abs(oldState.intensity - newState.intensity) > 0.1) {
            animateZoneLight(zone, newState.intensity);
        }
        
        lightingStates[zone] = newState;
    });
}

function animateZoneLight(zone, targetIntensity) {
    if (!lights[zone]) return;
    
    const startIntensity = lights[zone].intensity;
    const duration = 2000;
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        lights[zone].intensity = startIntensity + (targetIntensity - startIntensity) * easeProgress;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    animate();
}

function toggleAllLights() {
    API.toggleLights(!manualOverride).then(result => {
        if (result) {
            manualOverride = result.manual;
            updateLightingFromAPI(result.lighting);
            
            const btn = document.getElementById('btnToggleLights');
            if (btn) {
                btn.innerHTML = manualOverride ? 
                    '<span class="icon">💡</span>恢复自动灯光' : 
                    '<span class="icon">💡</span>手动控制灯光';
            }
            
            showNotification('手动控制', manualOverride ? '已切换至手动灯光控制模式' : '已切换至自动灯光控制模式', 'info');
        }
    });
    
    return manualOverride;
}

function getLightingForExport() {
    return Object.entries(lightingStates).map(([zone, state]) => ({
        '区域': zone + '区',
        '状态': state.dimmed ? '节能模式' : '正常',
        '亮度': Math.round(state.intensity * 100) + '%',
        '节能效果': state.dimmed ? '-67%' : '0%'
    }));
}
