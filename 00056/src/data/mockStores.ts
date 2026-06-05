import { Store, BookingTimeSlot } from '@/types/service';

export const mockStores: Store[] = [
  {
    id: 's001',
    name: '车护达旗舰店（国贸店）',
    address: '北京市朝阳区建国门外大街1号',
    phone: '010-88888001',
    city: '北京市',
    district: '朝阳区',
    businessHours: '08:00-20:00',
    rating: 4.9,
    ratingCount: 2568,
    distance: 1.2,
    services: ['car_wash', 'maintenance', 'repair'],
    image: 'https://picsum.photos/id/1018/750/400'
  },
  {
    id: 's002',
    name: '车护达中心店（中关村店）',
    address: '北京市海淀区中关村大街27号',
    phone: '010-88888002',
    city: '北京市',
    district: '海淀区',
    businessHours: '08:30-19:30',
    rating: 4.8,
    ratingCount: 1892,
    distance: 5.8,
    services: ['car_wash', 'maintenance', 'repair'],
    image: 'https://picsum.photos/id/1015/750/400'
  },
  {
    id: 's003',
    name: '车护达社区店（望京店）',
    address: '北京市朝阳区望京街9号',
    phone: '010-88888003',
    city: '北京市',
    district: '朝阳区',
    businessHours: '08:00-21:00',
    rating: 4.7,
    ratingCount: 1256,
    distance: 3.5,
    services: ['car_wash', 'maintenance'],
    image: 'https://picsum.photos/id/1036/750/400'
  },
  {
    id: 's004',
    name: '车护达精品店（三里屯店）',
    address: '北京市朝阳区三里屯路19号',
    phone: '010-88888004',
    city: '北京市',
    district: '朝阳区',
    businessHours: '09:00-22:00',
    rating: 4.9,
    ratingCount: 3124,
    distance: 2.8,
    services: ['car_wash', 'maintenance', 'repair'],
    image: 'https://picsum.photos/id/1039/750/400'
  },
  {
    id: 's005',
    name: '车护达标准店（西直门）',
    address: '北京市西城区西直门外大街1号',
    phone: '010-88888005',
    city: '北京市',
    district: '西城区',
    businessHours: '08:00-20:00',
    rating: 4.6,
    ratingCount: 987,
    distance: 7.2,
    services: ['car_wash', 'maintenance'],
    image: 'https://picsum.photos/id/1044/750/400'
  },
  {
    id: 's006',
    name: '车护达24H店（亦庄店）',
    address: '北京市大兴区亦庄经济技术开发区',
    phone: '010-88888006',
    city: '北京市',
    district: '大兴区',
    businessHours: '24小时营业',
    rating: 4.8,
    ratingCount: 2156,
    distance: 12.5,
    services: ['car_wash', 'maintenance', 'repair', 'rescue'],
    image: 'https://picsum.photos/id/1082/750/400'
  }
];

export const generateTimeSlots = (date: string): BookingTimeSlot[] => {
  const slots: BookingTimeSlot[] = [];
  const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

  hours.forEach((time, index) => {
    slots.push({
      id: `${date}-${time}`,
      time,
      available: Math.random() > 0.3 || index < 4
    });
  });

  return slots;
};

export const getStoreById = (id: string): Store | undefined => {
  return mockStores.find(s => s.id === id);
};

export const getStoresByService = (serviceType: string): Store[] => {
  return mockStores.filter(s => s.services.includes(serviceType));
};
