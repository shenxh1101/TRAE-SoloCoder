import { useEffect, useRef } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';

interface AMapTrackerProps {
  lat: number;
  lng: number;
  label?: string;
}

const AMAP_KEY = '479b1db8eb5d5c6d7a4f7c6e86d8e9b0';

export default function AMapTracker({ lat, lng, label = '服务人员' }: AMapTrackerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;

    AMapLoader.load({
      key: AMAP_KEY,
      version: '2.0',
    }).then((AMap) => {
      if (destroyed || !containerRef.current) return;

      const map = new AMap.Map(containerRef.current, {
        viewMode: '2D',
        zoom: 14,
        center: [lng, lat],
      });
      mapRef.current = map;

      const markerContent = document.createElement('div');
      markerContent.innerHTML = `
        <div style="
          background: #FF6B35;
          color: white;
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(255,107,53,0.4);
          position: relative;
        ">
          ${label}
          <div style="
            position: absolute;
            bottom: -6px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 6px solid #FF6B35;
          "></div>
        </div>
      `;

      const marker = new AMap.Marker({
        position: [lng, lat],
        content: markerContent,
        offset: new AMap.Pixel(-30, -36),
      });
      map.add(marker);
      markerRef.current = marker;

      const pulseMarkerContent = document.createElement('div');
      pulseMarkerContent.innerHTML = `
        <div style="
          width: 16px;
          height: 16px;
          background: rgba(255,107,53,0.3);
          border-radius: 50%;
          position: relative;
          animation: amapPulse 2s ease-out infinite;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background: #FF6B35;
            border-radius: 50%;
            position: absolute;
            top: 4px;
            left: 4px;
          "></div>
        </div>
      `;

      const pulseMarker = new AMap.Marker({
        position: [lng, lat],
        content: pulseMarkerContent,
        offset: new AMap.Pixel(-8, -8),
      });
      map.add(pulseMarker);
    }).catch(() => {
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100%;background:#EDF2F7;color:#718096;font-size:13px;">
            地图加载失败，请检查网络连接
          </div>
        `;
      }
    });

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setPosition([lng, lat]);
    mapRef.current.setCenter([lng, lat]);
  }, [lat, lng]);

  return (
    <>
      <style>{`
        @keyframes amapPulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
      `}</style>
      <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: '8px' }} />
    </>
  );
}
