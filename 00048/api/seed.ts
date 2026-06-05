import crypto from 'crypto'
import { getDb } from './database.js'

export function simpleHash(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export function seedData(): void {
  const db = getDb()

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  if (userCount.count > 0) {
    console.log('Seed data already exists, skipping')
    return
  }

  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, avatar, phone)
    VALUES (@username, @email, @password_hash, @role, @avatar, @phone)
  `)

  const insertHospital = db.prepare(`
    INSERT INTO hospitals (name, address, city, district, phone, latitude, longitude)
    VALUES (@name, @address, @city, @district, @phone, @latitude, @longitude)
  `)

  const insertReport = db.prepare(`
    INSERT INTO stray_reports (user_id, animal_type, description, location, city, district, latitude, longitude, photos, status, urgency, contact_name, contact_phone)
    VALUES (@user_id, @animal_type, @description, @location, @city, @district, @latitude, @longitude, @photos, @status, @urgency, @contact_name, @contact_phone)
  `)

  const insertRescueTask = db.prepare(`
    INSERT INTO rescue_tasks (report_id, volunteer_id, hospital_id, status, description, rescue_photos, notes)
    VALUES (@report_id, @volunteer_id, @hospital_id, @status, @description, @rescue_photos, @notes)
  `)

  const insertAnimal = db.prepare(`
    INSERT INTO animals (name, type, breed, age, gender, color, weight, description, personality, photos, status, rescue_task_id, hospital_id, neutered)
    VALUES (@name, @type, @breed, @age, @gender, @color, @weight, @description, @personality, @photos, @status, @rescue_task_id, @hospital_id, @neutered)
  `)

  const insertMedicalRecord = db.prepare(`
    INSERT INTO medical_records (animal_id, hospital_id, doctor_name, diagnosis, treatment, prescription, cost, notes, record_date)
    VALUES (@animal_id, @hospital_id, @doctor_name, @diagnosis, @treatment, @prescription, @cost, @notes, @record_date)
  `)

  const insertVaccineRecord = db.prepare(`
    INSERT INTO vaccine_records (animal_id, vaccine_name, vaccine_type, batch_number, hospital_id, vaccinate_date, next_date)
    VALUES (@animal_id, @vaccine_name, @vaccine_type, @batch_number, @hospital_id, @vaccinate_date, @next_date)
  `)

  const insertQuestionnaire = db.prepare(`
    INSERT INTO adoption_questionnaires (user_id, animal_id, housing_type, housing_size, has_yard, has_other_pets, other_pets_description, experience, daily_hours_home, activity_level, reason, status)
    VALUES (@user_id, @animal_id, @housing_type, @housing_size, @has_yard, @has_other_pets, @other_pets_description, @experience, @daily_hours_home, @activity_level, @reason, @status)
  `)

  const insertAgreement = db.prepare(`
    INSERT INTO adoption_agreements (questionnaire_id, user_id, animal_id, agreement_date, status, terms)
    VALUES (@questionnaire_id, @user_id, @animal_id, @agreement_date, @status, @terms)
  `)

  const insertFollowUp = db.prepare(`
    INSERT INTO follow_ups (agreement_id, animal_id, user_id, scheduled_date, status, notes, photos)
    VALUES (@agreement_id, @animal_id, @user_id, @scheduled_date, @status, @notes, @photos)
  `)

  const insertDonation = db.prepare(`
    INSERT INTO donations (user_id, amount, type, status, payment_method, message)
    VALUES (@user_id, @amount, @type, @status, @payment_method, @message)
  `)

  const insertFundraise = db.prepare(`
    INSERT INTO fundraises (title, description, target_amount, current_amount, cover_image, status, start_date, end_date, creator_id)
    VALUES (@title, @description, @target_amount, @current_amount, @cover_image, @status, @start_date, @end_date, @creator_id)
  `)

  const transaction = db.transaction(() => {
    const users = [
      { username: 'admin', email: 'admin@rescue.cn', password_hash: simpleHash('admin123'), role: 'admin', avatar: '', phone: '13800000001' },
      { username: 'volunteer_wang', email: 'wang@rescue.cn', password_hash: simpleHash('volunteer123'), role: 'volunteer', avatar: '', phone: '13800000002' },
      { username: 'volunteer_li', email: 'li@rescue.cn', password_hash: simpleHash('volunteer123'), role: 'volunteer', avatar: '', phone: '13800000003' },
      { username: 'zhang_san', email: 'zhang@example.cn', password_hash: simpleHash('user123'), role: 'user', avatar: '', phone: '13800000004' },
      { username: 'li_si', email: 'lisi@example.cn', password_hash: simpleHash('user123'), role: 'user', avatar: '', phone: '13800000005' },
    ]

    for (const u of users) {
      insertUser.run(u)
    }

    const hospitals = [
      { name: '北京爱心动物医院', address: '北京市朝阳区望京西路88号', city: '北京', district: '朝阳区', phone: '010-88886666', latitude: 39.9942, longitude: 116.4789 },
      { name: '上海萌宠宠物诊所', address: '上海市浦东新区陆家嘴环路100号', city: '上海', district: '浦东新区', phone: '021-66668888', latitude: 31.2397, longitude: 121.4998 },
      { name: '广州流浪动物救助中心', address: '广州市天河区体育西路200号', city: '广州', district: '天河区', phone: '020-33335555', latitude: 23.1369, longitude: 113.3253 },
    ]

    for (const h of hospitals) {
      insertHospital.run(h)
    }

    const reports = [
      { user_id: 4, animal_type: 'dog', description: '在小区门口发现一只受伤的小黄狗，右前腿有伤口，看起来很饿', location: '北京市朝阳区望京西园', city: '北京', district: '朝阳区', latitude: 39.9930, longitude: 116.4760, photos: '[]', status: 'rescued', urgency: 'high', contact_name: '张先生', contact_phone: '13800000004' },
      { user_id: 5, animal_type: 'cat', description: '一只橘色流浪猫在公司楼下徘徊，看起来很温顺但很瘦', location: '上海市浦东新区张江高科', city: '上海', district: '浦东新区', latitude: 31.2045, longitude: 121.5900, photos: '[]', status: 'verified', urgency: 'medium', contact_name: '李女士', contact_phone: '13800000005' },
      { user_id: 4, animal_type: 'cat', description: '公园里发现一只黑色小猫，不到半岁，似乎被人遗弃', location: '广州市天河区天河公园', city: '广州', district: '天河区', latitude: 23.1280, longitude: 113.3320, photos: '[]', status: 'rescued', urgency: 'medium', contact_name: '张先生', contact_phone: '13800000004' },
      { user_id: 5, animal_type: 'dog', description: '马路边看到一只白色小狗在车流中穿行，非常危险', location: '北京市海淀区中关村大街', city: '北京', district: '海淀区', latitude: 39.9820, longitude: 116.3100, photos: '[]', status: 'pending', urgency: 'critical', contact_name: '李女士', contact_phone: '13800000005' },
      { user_id: 4, animal_type: 'dog', description: '小区垃圾桶旁有花色小狗在翻找食物，身上有皮肤病', location: '上海市徐汇区田林路', city: '上海', district: '徐汇区', latitude: 31.1750, longitude: 121.4150, photos: '[]', status: 'rescued', urgency: 'high', contact_name: '张先生', contact_phone: '13800000004' },
      { user_id: 5, animal_type: 'cat', description: '地下车库发现一只奶牛猫，右耳有伤', location: '广州市越秀区环市东路', city: '广州', district: '越秀区', latitude: 23.1360, longitude: 113.2850, photos: '[]', status: 'verified', urgency: 'medium', contact_name: '李女士', contact_phone: '13800000005' },
      { user_id: 4, animal_type: 'dog', description: '发现一只黄色中大型犬在路边趴着，看起来很虚弱', location: '北京市丰台区丰台南路', city: '北京', district: '丰台区', latitude: 39.8580, longitude: 116.2870, photos: '[]', status: 'rescuing', urgency: 'high', contact_name: '张先生', contact_phone: '13800000004' },
      { user_id: 5, animal_type: 'cat', description: '在快递柜旁边发现一只白色长毛猫，很亲人', location: '上海市静安区南京西路', city: '上海', district: '静安区', latitude: 31.2280, longitude: 121.4470, photos: '[]', status: 'pending', urgency: 'low', contact_name: '李女士', contact_phone: '13800000005' },
    ]

    for (const r of reports) {
      insertReport.run(r)
    }

    const rescueTasks = [
      { report_id: 1, volunteer_id: 2, hospital_id: 1, status: 'completed', description: '成功将受伤小黄狗送往医院治疗', rescue_photos: '[]', notes: '狗狗右前腿伤口已处理，需要休养' },
      { report_id: 3, volunteer_id: 3, hospital_id: 3, status: 'completed', description: '已将黑色小猫捕获并送往医院检查', rescue_photos: '[]', notes: '小猫健康状况良好，已安排驱虫' },
      { report_id: 5, volunteer_id: 2, hospital_id: 2, status: 'completed', description: '花色小狗已捕获并送医', rescue_photos: '[]', notes: '皮肤病需要持续治疗' },
      { report_id: 2, volunteer_id: 3, hospital_id: 2, status: 'in_progress', description: '正在跟踪橘猫活动范围，准备诱捕', rescue_photos: '[]', notes: '橘猫比较警觉，需要时间' },
      { report_id: 7, volunteer_id: 2, hospital_id: 1, status: 'in_progress', description: '已到达现场，正在接近大狗', rescue_photos: '[]', notes: '大狗性格温顺但不让人靠近' },
      { report_id: 4, volunteer_id: null, hospital_id: null, status: 'pending', description: '等待志愿者前往救援', rescue_photos: '[]', notes: '位置在马路中间，需要尽快处理' },
      { report_id: 6, volunteer_id: 3, hospital_id: 3, status: 'assigned', description: '已安排志愿者前往', rescue_photos: '[]', notes: '' },
      { report_id: 8, volunteer_id: null, hospital_id: null, status: 'pending', description: '等待确认是否需要救援', rescue_photos: '[]', notes: '猫咪比较亲人，可能有人正在照顾' },
    ]

    for (const t of rescueTasks) {
      insertRescueTask.run(t)
    }

    const animals = [
      { name: '大黄', type: 'dog', breed: '中华田园犬', age: '3岁', gender: '公', color: '黄色', weight: 15.0, description: '性格温顺的大黄狗，右前腿伤已痊愈，喜欢散步和晒太阳', personality: JSON.stringify(['温顺', '亲人', '爱散步', '安静']), photos: '[]', status: 'available', rescue_task_id: 1, hospital_id: 1, neutered: 1 },
      { name: '小橘', type: 'cat', breed: '中华田园猫', age: '2岁', gender: '公', color: '橘色', weight: 4.5, description: '胖乎乎的橘猫，非常粘人，喜欢趴在人腿上', personality: JSON.stringify(['粘人', '贪吃', '温顺', '爱撒娇']), photos: '[]', status: 'available', rescue_task_id: 4, hospital_id: 2, neutered: 1 },
      { name: '黑豆', type: 'cat', breed: '中华田园猫', age: '6个月', gender: '公', color: '黑色', weight: 2.5, description: '活泼好动的小黑猫，喜欢追逐玩具和攀爬', personality: JSON.stringify(['活泼', '好奇', '爱玩', '胆小']), photos: '[]', status: 'available', rescue_task_id: 2, hospital_id: 3, neutered: 0 },
      { name: '白团子', type: 'cat', breed: '中华田园猫', age: '1岁', gender: '母', color: '白色', weight: 3.8, description: '白色长毛猫，优雅安静，适合室内生活', personality: JSON.stringify(['安静', '优雅', '独立', '爱干净']), photos: '[]', status: 'available', rescue_task_id: null, hospital_id: 2, neutered: 1 },
      { name: '花花', type: 'dog', breed: '中华田园犬', age: '2岁', gender: '母', color: '花色', weight: 10.0, description: '花色小狗，皮肤病已治愈，活泼可爱', personality: JSON.stringify(['活泼', '可爱', '爱玩', '忠诚']), photos: '[]', status: 'available', rescue_task_id: 3, hospital_id: 2, neutered: 1 },
      { name: '豆豆', type: 'cat', breed: '中华田园猫', age: '1岁', gender: '母', color: '奶牛色', weight: 3.5, description: '奶牛猫，右耳伤已愈合，性格独立', personality: JSON.stringify(['独立', '聪明', '好奇', '偶尔粘人']), photos: '[]', status: 'pending', rescue_task_id: null, hospital_id: 3, neutered: 0 },
      { name: '旺财', type: 'dog', breed: '中华田园犬', age: '5岁', gender: '公', color: '黄色', weight: 20.0, description: '大号黄狗，性格沉稳忠诚，适合有院子的家庭', personality: JSON.stringify(['忠诚', '沉稳', '护主', '需要空间']), photos: '[]', status: 'fostered', rescue_task_id: 5, hospital_id: 1, neutered: 1 },
      { name: '球球', type: 'dog', breed: '中华田园犬', age: '1岁', gender: '母', color: '白色', weight: 8.0, description: '白色小狗，非常亲人，喜欢被抱着', personality: JSON.stringify(['亲人', '撒娇', '小巧', '爱玩']), photos: '[]', status: 'adopted', rescue_task_id: null, hospital_id: 1, neutered: 1 },
    ]

    for (const a of animals) {
      insertAnimal.run(a)
    }

    const medicalRecords = [
      { animal_id: 1, hospital_id: 1, doctor_name: '王医生', diagnosis: '右前腿外伤', treatment: '清创缝合，抗生素治疗', prescription: '阿莫西林克拉维酸钾片', cost: 680, notes: '伤口愈合良好，一周后拆线', record_date: '2026-05-15' },
      { animal_id: 3, hospital_id: 3, doctor_name: '陈医生', diagnosis: '体表寄生虫感染', treatment: '体外驱虫', prescription: '福来恩滴剂', cost: 200, notes: '驱虫后观察3天，状况良好', record_date: '2026-05-18' },
      { animal_id: 5, hospital_id: 2, doctor_name: '刘医生', diagnosis: '真菌性皮肤病', treatment: '抗真菌药浴+口服药', prescription: '伊曲康唑、咪康唑洗剂', cost: 520, notes: '需持续用药4周，每周复查', record_date: '2026-05-10' },
      { animal_id: 7, hospital_id: 1, doctor_name: '王医生', diagnosis: '营养不良，轻度脱水', treatment: '补液，营养支持', prescription: '营养膏、益生菌', cost: 350, notes: '需加强营养，少食多餐', record_date: '2026-05-20' },
      { animal_id: 6, hospital_id: 3, doctor_name: '陈医生', diagnosis: '右耳外伤', treatment: '伤口消毒包扎', prescription: '碘伏、红霉素软膏', cost: 180, notes: '伤口较浅，愈合良好', record_date: '2026-05-22' },
      { animal_id: 2, hospital_id: 2, doctor_name: '刘医生', diagnosis: '轻度肥胖', treatment: '调整饮食结构', prescription: '减肥猫粮', cost: 120, notes: '控制每日喂食量，增加运动', record_date: '2026-05-25' },
    ]

    for (const m of medicalRecords) {
      insertMedicalRecord.run(m)
    }

    const vaccineRecords = [
      { animal_id: 1, vaccine_name: '犬瘟热疫苗', vaccine_type: '核心疫苗', batch_number: 'CD20260501', hospital_id: 1, vaccinate_date: '2026-05-16', next_date: '2027-05-16' },
      { animal_id: 1, vaccine_name: '犬细小病毒疫苗', vaccine_type: '核心疫苗', batch_number: 'CPV20260501', hospital_id: 1, vaccinate_date: '2026-05-16', next_date: '2027-05-16' },
      { animal_id: 3, vaccine_name: '猫三联疫苗', vaccine_type: '核心疫苗', batch_number: 'FVR20260502', hospital_id: 3, vaccinate_date: '2026-05-19', next_date: '2027-05-19' },
      { animal_id: 5, vaccine_name: '犬瘟热疫苗', vaccine_type: '核心疫苗', batch_number: 'CD20260503', hospital_id: 2, vaccinate_date: '2026-05-11', next_date: '2027-05-11' },
    ]

    for (const v of vaccineRecords) {
      insertVaccineRecord.run(v)
    }

    const questionnaires = [
      { user_id: 4, animal_id: 8, housing_type: 'apartment', housing_size: '90平米', has_yard: 0, has_other_pets: 0, other_pets_description: '', experience: '养过两只猫，有3年养宠经验', daily_hours_home: '8小时以上', activity_level: 'moderate', reason: '非常喜欢小狗，希望能给流浪狗一个温暖的家', status: 'approved' },
      { user_id: 5, animal_id: 4, housing_type: 'apartment', housing_size: '70平米', has_yard: 0, has_other_pets: 1, other_pets_description: '一只3岁的金毛犬', experience: '养狗5年，有丰富养宠经验', daily_hours_home: '6小时', activity_level: 'active', reason: '想给白团子一个家，家里空间足够', status: 'pending' },
    ]

    for (const q of questionnaires) {
      insertQuestionnaire.run(q)
    }

    const agreements = [
      { questionnaire_id: 1, user_id: 4, animal_id: 8, agreement_date: '2026-05-28', status: 'active', terms: '1. 承诺不遗弃动物；2. 定期带动物体检和疫苗；3. 接受定期回访；4. 如无法继续饲养需归还救助站' },
      { questionnaire_id: 2, user_id: 5, animal_id: 4, agreement_date: '2026-06-01', status: 'active', terms: '1. 承诺不遗弃动物；2. 定期带动物体检和疫苗；3. 接受定期回访；4. 如无法继续饲养需归还救助站' },
    ]

    for (const a of agreements) {
      insertAgreement.run(a)
    }

    const followUps = [
      { agreement_id: 1, animal_id: 8, user_id: 4, scheduled_date: '2026-06-15', status: 'pending', notes: '第一次回访，检查球球适应情况', photos: '[]' },
      { agreement_id: 1, animal_id: 8, user_id: 4, scheduled_date: '2026-07-15', status: 'pending', notes: '第二次回访', photos: '[]' },
      { agreement_id: 2, animal_id: 4, user_id: 5, scheduled_date: '2026-06-15', status: 'pending', notes: '第一次回访，检查白团子适应情况', photos: '[]' },
      { agreement_id: 1, animal_id: 8, user_id: 4, scheduled_date: '2026-05-29', status: 'completed', notes: '球球适应良好，食欲正常，和主人互动很好', photos: '[]' },
    ]

    for (const f of followUps) {
      insertFollowUp.run(f)
    }

    const donations = [
      { user_id: 4, amount: 100, type: 'one_time', status: 'completed', payment_method: 'wechat', message: '希望流浪动物都能被善待' },
      { user_id: 5, amount: 50, type: 'monthly', status: 'completed', payment_method: 'alipay', message: '每月小额捐赠，持续支持' },
      { user_id: 4, amount: 200, type: 'one_time', status: 'completed', payment_method: 'wechat', message: '给大黄的治疗费' },
      { user_id: 5, amount: 50, type: 'monthly', status: 'completed', payment_method: 'alipay', message: '' },
      { user_id: 4, amount: 50, type: 'monthly', status: 'pending', payment_method: 'wechat', message: '每月定期捐赠' },
    ]

    for (const d of donations) {
      insertDonation.run(d)
    }

    const fundraises = [
      { title: '大黄手术费筹款', description: '大黄右前腿伤势较重，需要进行手术治疗，预计费用3000元。大黄是一只非常温顺的3岁田园犬，已经完成了初步的清创治疗，但还需要进一步手术确保完全康复。', target_amount: 3000, current_amount: 1800, cover_image: '', status: 'active', start_date: '2026-05-15', end_date: '2026-06-30', creator_id: 1 },
      { title: '冬季流浪猫救助行动', description: '冬天即将来临，我们需要为流浪猫准备猫粮、保暖猫窝和驱虫药。目标覆盖上海3个流浪猫聚集区域，帮助约50只流浪猫安全过冬。', target_amount: 5000, current_amount: 5000, cover_image: '', status: 'completed', start_date: '2025-10-01', end_date: '2026-03-31', creator_id: 2 },
      { title: '花花皮肤病治疗基金', description: '花花患有真菌性皮肤病，需要持续4周的治疗。包括药浴、口服药物和定期复查，预计总费用1500元。花花是个非常可爱的小姑娘，希望大家帮帮她！', target_amount: 1500, current_amount: 600, cover_image: '', status: 'active', start_date: '2026-05-20', end_date: '2026-07-20', creator_id: 3 },
    ]

    for (const fr of fundraises) {
      insertFundraise.run(fr)
    }
  })

  transaction()
  console.log('Seed data inserted successfully')
}
