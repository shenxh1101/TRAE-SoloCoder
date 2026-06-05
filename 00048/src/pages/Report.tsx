import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Camera, Upload, Dog, Cat, Heart, AlertTriangle, Send, X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useAnimalStore from '@/stores/animalStore';

const IMG = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20cat%20or%20dog%20portrait&image_size=square';

const conditionOptions = [
  { value: 'healthy', label: '健康', color: 'bg-success-100 text-success-600 border-success-400' },
  { value: 'injured', label: '受伤', color: 'bg-amber-100 text-amber-700 border-amber-400' },
  { value: 'sick', label: '生病', color: 'bg-orange-100 text-orange-700 border-orange-400' },
  { value: 'critical', label: '危急', color: 'bg-red-100 text-red-700 border-red-400' },
] as const;

const urgencyOptions = [
  { value: 'low', label: '低', color: 'bg-info-50 text-info-500' },
  { value: 'medium', label: '中', color: 'bg-amber-100 text-amber-700' },
  { value: 'high', label: '高', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: '紧急', color: 'bg-red-100 text-red-700' },
] as const;

const DEFAULT_LAT = 31.23;
const DEFAULT_LNG = 121.47;

export default function Report() {
  const navigate = useNavigate();
  const { createReport } = useAnimalStore();

  const [photos, setPhotos] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [animalType, setAnimalType] = useState<'dog' | 'cat' | 'other'>('dog');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [age, setAge] = useState('');
  const [description, setDescription] = useState('');
  const [conditionStatus, setConditionStatus] = useState<'healthy' | 'injured' | 'sick' | 'critical'>('healthy');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [submitting, setSubmitting] = useState(false);

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      const icon = L.divIcon({
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f97316" width="28" height="28"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        className: '',
      });

      markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(mapRef.current);

      markerRef.current.on('dragend', () => {
        const pos = markerRef.current!.getLatLng();
        setLat(Math.round(pos.lat * 10000) / 10000);
        setLng(Math.round(pos.lng * 10000) / 10000);
      });

      mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
        markerRef.current!.setLatLng(e.latlng);
        setLat(Math.round(e.latlng.lat * 10000) / 10000);
        setLng(Math.round(e.latlng.lng * 10000) / 10000);
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  const addPhoto = () => {
    if (photos.length < 4) setPhotos([...photos, `${IMG}&seed=${Date.now()}`]);
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await createReport({
        photos,
        address,
        city,
        district,
        animalType,
        breed,
        gender,
        age,
        description,
        conditionStatus,
        urgency,
        lat,
        lng,
      });
      navigate('/rescue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <MapPin className="w-7 h-7 text-primary-500" />
        <h1 className="section-title">上报流浪动物</h1>
      </div>

      <section className="card p-6 space-y-4">
        <label className="label-field flex items-center gap-2">
          <Camera className="w-4 h-4" /> 照片上传
        </label>
        <div
          onClick={addPhoto}
          className="border-2 border-dashed border-warm-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors"
        >
          <Upload className="w-8 h-8 mx-auto text-warm-400 mb-2" />
          <p className="text-sm text-warm-500">点击上传照片（最多4张）</p>
        </div>
        {photos.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {photos.map((src, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-warm-200">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-6 space-y-4">
        <label className="label-field flex items-center gap-2">
          <MapPin className="w-4 h-4" /> 发现地点
        </label>
        <div
          ref={mapContainerRef}
          className="w-full h-48 rounded-xl overflow-hidden border border-warm-200"
        />
        <div className="flex gap-2 text-xs text-warm-400">
          <span>纬度: {lat}</span>
          <span>经度: {lng}</span>
          <span className="text-primary-400">点击地图或拖拽标记可调整位置</span>
        </div>
        <input className="input-field" placeholder="详细地址" value={address} onChange={(e) => setAddress(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <select className="input-field" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">选择城市</option>
            <option value="上海">上海</option>
            <option value="北京">北京</option>
            <option value="广州">广州</option>
            <option value="深圳">深圳</option>
          </select>
          <select className="input-field" value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">选择区域</option>
            <option value="浦东新区">浦东新区</option>
            <option value="黄浦区">黄浦区</option>
            <option value="徐汇区">徐汇区</option>
            <option value="静安区">静安区</option>
            <option value="朝阳区">朝阳区</option>
            <option value="天河区">天河区</option>
          </select>
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <label className="label-field">动物信息</label>
        <div className="flex gap-3">
          {([
            { value: 'dog', icon: Dog, label: '犬' },
            { value: 'cat', icon: Cat, label: '猫' },
            { value: 'other', icon: Heart, label: '其他' },
          ] as const).map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setAnimalType(value)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all ${
                animalType === value ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-warm-200 text-warm-500 hover:border-warm-300'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
        <input className="input-field" placeholder="品种（如：中华田园犬）" value={breed} onChange={(e) => setBreed(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <select className="input-field" value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'unknown')}>
            <option value="unknown">性别未知</option>
            <option value="male">公</option>
            <option value="female">母</option>
          </select>
          <input className="input-field" placeholder="年龄（如：约2岁）" value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
        <textarea className="input-field min-h-[80px] resize-none" placeholder="动物描述（外貌特征、行为表现等）" value={description} onChange={(e) => setDescription(e.target.value)} />
      </section>

      <section className="card p-6 space-y-4">
        <label className="label-field flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> 健康状况
        </label>
        <div className="grid grid-cols-2 gap-3">
          {conditionOptions.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => setConditionStatus(value)}
              className={`py-2 px-3 rounded-xl border-2 font-medium text-sm transition-all ${
                conditionStatus === value ? `${color} ring-2 ring-offset-1 ring-current` : 'border-warm-200 text-warm-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="label-field">紧急程度</label>
        <div className="flex gap-2">
          {urgencyOptions.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => setUrgency(value)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                urgency === value ? `${color} ring-2 ring-offset-1 ring-current` : 'bg-warm-100 text-warm-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <button onClick={handleSubmit} disabled={submitting || !address} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40">
        <Send className="w-5 h-5" /> {submitting ? '提交中...' : '提交上报'}
      </button>
    </div>
  );
}
