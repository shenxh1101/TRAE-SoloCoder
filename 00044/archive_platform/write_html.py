#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os

OUTPUT = "/Users/mac/AI Coding/solo coder/00044/archive_platform/app/static/index.html"

# Build the HTML content
html = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>企业档案管理与借阅平台</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--primary:#2563eb;--primary-dark:#1d4ed8;--success:#16a34a;--warning:#d97706;--danger:#dc2626;--info:#0891b2;--bg:#f1f5f9;--card:#fff;--text:#1e293b;--text-light:#64748b;--border:#e2e8f0;--shadow:0 1px 3px rgba(0,0,0,.1);--radius:8px}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;background:var(--bg);color:var(--text);line-height:1.6}
.login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)}
.login-box{background:#fff;border-radius:16px;padding:48px 40px;width:400px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.login-box h1{text-align:center;color:var(--primary);margin-bottom:8px;font-size:24px}
.login-box p{text-align:center;color:var(--text-light);margin-bottom:32px;font-size:14px}
.login-box .hint{background:#f0f9ff;border-radius:8px;padding:12px 16px;margin-top:20px;font-size:12px;color:var(--info)}
.login-box .hint b{color:var(--primary)}
.app-wrap{display:flex;min-height:100vh}
.sidebar{width:240px;background:linear-gradient(180deg,#1e293b 0%,#0f172a 100%);color:#fff;padding:0;flex-shrink:0;position:fixed;height:100vh;overflow-y:auto}
.sidebar .logo{padding:24px 20px;border-bottom:1px solid rgba(255,255,255,.1);font-size:16px;font-weight:700}
.sidebar .logo span{color:#60a5fa}
.sidebar nav{padding:12px 0}
.sidebar nav a{display:flex;align-items:center;padding:12px 20px;color:#94a3b8;text-decoration:none;transition:.2s;font-size:14px;gap:10px}
.sidebar nav a:hover,.sidebar nav a.active{background:rgba(255,255,255,.08);color:#fff}
.sidebar nav a.active{border-right:3px solid var(--primary)}
.sidebar .user-info{padding:16px 20px;border-top:1px solid rgba(255,255,255,.1);font-size:12px;color:#94a3b8}
.sidebar .user-info .name{color:#fff;font-size:14px;font-weight:600;margin-bottom:4px}
.main{flex:1;margin-left:240px;padding:24px 32px}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px}
.header h2{font-size:22px;font-weight:700}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600}
.badge-public{background:#dcfce7;color:#16a34a}
.badge-internal{background:#fef3c7;color:#d97706}
.badge-confidential{background:#fee2e2;color:#dc2626}
.badge-pending{background:#fef3c7;color:#d97706}
.badge-approved{background:#dcfce7;color:#16a34a}
.badge-rejected{background:#fee2e2;color:#dc2626}
.badge-returned{background:#e0f2fe;color:#0891b2}
.badge-overdue{background:#fee2e2;color:#dc2626}
.badge-active{background:#dcfce7;color:#16a34a}
.badge-destroyed{background:#f1f5f9;color:#64748b}
.badge-pending_destruction{background:#fef3c7;color:#d97706}
.badge-low-stock{background:#fee2e2;color:#dc2626}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:24px}
.card{background:var(--card);border-radius:var(--radius);padding:20px;box-shadow:var(--shadow);transition:.2s}
.card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.1)}
.card .label{color:var(--text-light);font-size:13px;margin-bottom:4px}
.card .value{font-size:28px;font-weight:700}
.card .value.blue{color:var(--primary)}
.card .value.green{color:var(--success)}
.card .value.orange{color:var(--warning)}
.card .value.red{color:var(--danger)}
.card .trend{font-size:12px;color:var(--text-light);margin-top:4px}
.table-wrap{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;margin-bottom:24px}
.table-header{padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:8px}
.table-header h3{font-size:16px;font-weight:600}
table{width:100%;border-collapse:collapse}
th{background:#f8fafc;padding:12px 16px;text-align:left;font-size:13px;color:var(--text-light);font-weight:600;white-space:nowrap}
td{padding:12px 16px;border-top:1px solid var(--border);font-size:14px}
tr:hover td{background:#f8fafc}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;transition:.2s;text-decoration:none}
.btn-primary{background:var(--primary);color:#fff}.btn-primary:hover{background:var(--primary-dark)}
.btn-success{background:var(--success);color:#fff}.btn-success:hover{background:#15803d}
.btn-danger{background:var(--danger);color:#fff}.btn-danger:hover{background:#b91c1c}
.btn-warning{background:var(--warning);color:#fff}.btn-warning:hover{background:#b45309}
.btn-sm{padding:4px 10px;font-size:12px}
.btn-outline{background:#fff;color:var(--primary);border:1px solid var(--primary)}.btn-outline:hover{background:var(--primary);color:#fff}
.btn:disabled{opacity:.5;cursor:not-allowed}
.form-group{margin-bottom:16px}
.form-group label{display:block;font-size:13px;font-weight:500;margin-bottom:6px;color:var(--text)}
.form-group input,.form-group select,.form-group textarea{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:6px;font-size:14px;transition:.2s;font-family:inherit}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(37,99,235,.1)}
.form-group textarea{resize:vertical;min-height:80px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(2px)}
.modal{background:#fff;border-radius:12px;padding:28px;width:520px;max-width:90vw;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.modal h3{margin-bottom:20px;font-size:18px;color:var(--text)}
.modal .modal-info{background:#f8fafc;padding:12px 16px;border-radius:6px;margin-bottom:16px;font-size:13px;color:var(--text-light)}
.modal .actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
.search-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px}
.search-bar input,.search-bar select{padding:8px 12px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit}
.search-bar input{width:200px}
.notif-dot{display:inline-block;width:8px;height:8px;background:var(--danger);border-radius:50%;margin-left:4px;animation:pulse 2s infinite}
.empty{text-align:center;padding:40px;color:var(--text-light)}
.toast{position:fixed;top:20px;right:20px;padding:14px 20px;border-radius:8px;color:#fff;font-size:14px;z-index:2000;animation:slideIn .3s;box-shadow:0 4px 12px rgba(0,0,0,.2)}
.toast-success{background:var(--success)}.toast-error{background:var(--danger)}.toast-info{background:var(--primary)}.toast-warning{background:var(--warning)}
@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
.pagination{display:flex;gap:6px;justify-content:center;margin-top:16px}
.pagination button{padding:6px 12px;border:1px solid var(--border);border-radius:4px;background:#fff;cursor:pointer;font-size:13px}
.pagination button.active{background:var(--primary);color:#fff;border-color:var(--primary)}
.pagination button:disabled{opacity:.5;cursor:default}
.refresh-indicator{font-size:12px;color:var(--text-light)}
.refresh-indicator .dot{display:inline-block;width:6px;height:6px;background:var(--success);border-radius:50%;margin-right:4px;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.stock-info{font-size:12px;color:var(--text-light)}
.stock-info.low{color:var(--danger);font-weight:600}
.detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--border)}
.detail-row:last-child{border-bottom:none}
.detail-row .label{color:var(--text-light);font-size:13px}
.detail-row .value{font-weight:500;font-size:13px}
.tabs{display:flex;gap:8px;flex-wrap:wrap}
@media(max-width:768px){.two-col{grid-template-columns:1fr}.cards{grid-template-columns:1fr 1fr}.sidebar{display:none}.main{margin-left:0}.search-bar input{width:100%}}
</style>
</head>
<body>
<div id="app"></div>
<script>
const API='';
let token=localStorage.getItem('token')||'';
let currentUser=null;
let currentPage='dashboard';
let dashRefreshTimer=null;
let lastRefreshTime=null;
let adminTab='users';
"""

# Add the rest of the JavaScript
js_rest = """
function headers(){return {'Authorization':'Bearer '+token,'Content-Type':'application/json'}}
function headersForm(){return {'Authorization':'Bearer '+token}}

async function api(path,opts={}){
  const url=API+path;
  const h=opts.upload?headersForm():headers();
  if(!opts.upload)opts.body=opts.body?JSON.stringify(opts.body):undefined;
  try{
    const res=await fetch(url,{...opts,headers:h});
    if(res.status===401){logout();return null}
    if(res.status===204)return {ok:true};
    const data=await res.json().catch(()=>null);
    if(!res.ok){showToast(data?.detail||'请求失败','error');return null}
    return data;
  }catch(e){showToast('网络错误，请检查连接','error');return null}
}

function showToast(msg,type='info'){
  const existing=document.querySelectorAll('.toast');
  existing.forEach((d,i)=>{d.style.top=(20+(existing.length-i)*60)+'px'});
  const d=document.createElement('div');
  d.className='toast toast-'+type;d.textContent=msg;
  document.body.appendChild(d);
  setTimeout(()=>{d.style.transform='translateX(120%)';d.style.opacity='0';setTimeout(()=>d.remove(),300)},3000);
}

function confirmDialog(msg){return new Promise(resolve=>{
  const overlay=document.createElement('div');
  overlay.className='modal-overlay';
  overlay.innerHTML='<div class="modal" style="width:380px"><h3>确认操作</h3><p style="margin-bottom:20px;color:var(--text-light)">'+msg+'</p><div class="actions"><button class="btn btn-outline" id="cf-cancel">取消</button><button class="btn btn-primary" id="cf-ok">确认</button></div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#cf-cancel').onclick=()=>{overlay.remove();resolve(false)};
  overlay.querySelector('#cf-ok').onclick=()=>{overlay.remove();resolve(true)};
})}

function logout(){
  token='';currentUser=null;localStorage.removeItem('token');
  if(dashRefreshTimer)clearInterval(dashRefreshTimer);
  render();
}

async function login(username,password){
  try{
    const res=await fetch(API+'/api/auth/login',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username,password})
    });
    if(!res.ok){const d=await res.json();showToast(d.detail||'登录失败','error');return}
    const data=await res.json();
    token=data.access_token;currentUser={id:data.user_id,username:data.username,role:data.role,real_name:data.real_name};
    localStorage.setItem('token',token);
    await loadUserInfo();
    showToast('欢迎，'+currentUser.real_name+'！','success');
    render();
  }catch(e){showToast('登录失败，请重试','error')}
}

async function loadUserInfo(){
  const d=await api('/api/auth/me');
  if(d)currentUser={...currentUser,...d};
}

function canAccess(classification){
  const map={employee:['public'],supervisor:['public','internal'],executive:['public','internal','confidential'],admin:['public','internal','confidential']};
  return (map[currentUser?.role]||[]).includes(classification);
}

const classificationLabel={public:'公开',internal:'内部',confidential:'机密'};
const statusLabel={pending:'待审批',approved:'已批准',rejected:'已拒绝',returned:'已归还',overdue:'已超期',level1_approved:'一级审批通过',level2_approved:'二级审批通过',completed:'已完成',active:'在库',pending_destruction:'待销毁',destroyed:'已销毁'};
const roleLabel={admin:'管理员',supervisor:'主管',executive:'高管',employee:'普通员工'};
const notifTypeLabel={borrow_request:'借阅申请',borrow_approved:'借阅通过',borrow_rejected:'借阅拒绝',borrow_escalation:'升级通知',return_reminder:'催还通知',overdue_violation:'超期违规',frozen:'账户冻结',copy_request:'复印申请',copy_approved:'复印通过',copy_rejected:'复印拒绝',copy_over_quota:'超配额提醒',destruction_request:'销毁申请',destruction_level2:'二级审批提醒',retention_expiry:'到期提醒'};

function badge(cls,type){return '<span class="badge badge-'+cls+'">'+(type==='classification'?classificationLabel[cls]:(type==='role'?roleLabel[cls]:statusLabel[cls]||cls))+'</span>'}
function fmtDate(d){return d?new Date(d).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'-'}
function fmtShort(d){return d?new Date(d).toLocaleDateString('zh-CN'):'-'}
function daysBetween(d1,d2){return Math.ceil((new Date(d2)-new Date(d1))/(1000*60*60*24))}

function navigate(page){currentPage=page;render()}

function render(){
  const app=document.getElementById('app');
  if(!token||!currentUser){app.innerHTML=renderLogin();bindLogin();return}
  app.innerHTML=renderApp();bindApp();
  if(currentPage==='dashboard')startDashRefresh();
  else if(dashRefreshTimer){clearInterval(dashRefreshTimer);dashRefreshTimer=null}
}

function startDashRefresh(){
  if(dashRefreshTimer)clearInterval(dashRefreshTimer);
  loadDashboard();
  dashRefreshTimer=setInterval(loadDashboard,10000);
}

function renderLogin(){
  return '<div class="login-wrap"><div class="login-box">'+
    '<h1>📁 企业档案管理平台</h1><p>档案管理与借阅系统</p>'+
    '<div class="form-group"><label>用户名</label><input id="login-user" placeholder="请输入用户名" autocomplete="username"></div>'+
    '<div class="form-group"><label>密码</label><input id="login-pass" type="password" placeholder="请输入密码" autocomplete="current-password"></div>'+
    '<button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px" id="login-btn">登 录</button>'+
    '<div class="hint"><b>演示账号：</b><br>'+
      '管理员：admin / admin123<br>'+
      '普通员工：zhangsan / 123456<br>'+
      '主管：lisi / 123456<br>'+
      '高管：wangwu / 123456'+
    '</div></div></div>';
}

function bindLogin(){
  const loginBtn=document.getElementById('login-btn');
  const doLogin=async()=>{
    loginBtn.disabled=true;loginBtn.textContent='登录中...';
    const u=document.getElementById('login-user').value;
    const p=document.getElementById('login-pass').value;
    if(!u||!p){showToast('请输入用户名和密码','warning');loginBtn.disabled=false;loginBtn.textContent='登 录';return}
    await login(u,p);
    loginBtn.disabled=false;loginBtn.textContent='登 录';
  };
  loginBtn?.addEventListener('click',doLogin);
  document.getElementById('login-pass')?.addEventListener('keydown',async e=>{if(e.key==='Enter')doLogin()});
}

function renderApp(){
  const navItems=[
    {page:'dashboard',icon:'📊',label:'数据看板'},
    {page:'archives',icon:'📁',label:'档案管理'},
    {page:'borrow',icon:'📖',label:'借阅管理'},
    {page:'copy',icon:'🖨️',label:'复印申请'},
    {page:'destruction',icon:'🗑️',label:'销毁管理',roles:['admin','supervisor','executive']},
    {page:'notifications',icon:'🔔',label:'通知中心'},
    {page:'admin',icon:'⚙️',label:'系统管理',roles:['admin']},
  ];
  const navHtml=navItems.filter(n=>!n.roles||n.roles.includes(currentUser.role)).map(n=>
    '<a href="#" class="'+(currentPage===n.page?'active':'')+'" data-page="'+n.page+'">'+n.icon+' '+n.label+'</a>'
  ).join('');
  const pages={dashboard:renderDashboard,archives:renderArchives,borrow:renderBorrow,copy:renderCopy,destruction:renderDestruction,notifications:renderNotifications,admin:renderAdmin};
  const content=(pages[currentPage]||pages.dashboard)();
  const frozenInfo=currentUser.frozen_until?'<span class="badge badge-overdue" title="借阅权限已冻结">🔒 冻结至'+fmtShort(currentUser.frozen_until)+'</span>':'';
  return '<div class="app-wrap">'+
    '<aside class="sidebar">'+
      '<div class="logo">📁 <span>档案管理平台</span></div>'+
      '<nav>'+navHtml+'</nav>'+
      '<div class="user-info">'+
        '<div class="name">'+currentUser.real_name+' '+frozenInfo+'</div>'+
        badge(currentUser.role,'role')+' | <a href="#" id="logout-link" style="color:#94a3b8">退出登录</a>'+
        (currentUser.violation_count>0?'<div style="margin-top:6px;color:#fca5a5">违规次数：'+currentUser.violation_count+'/3</div>':'')+
      '</div>'+
    '</aside>'+
    '<main class="main">'+content+'</main>'+
  '</div>';
}

function bindApp(){
  document.querySelectorAll('.sidebar nav a').forEach(a=>{
    a.addEventListener('click',e=>{e.preventDefault();navigate(a.dataset.page)});
  });
  document.getElementById('logout-link')?.addEventListener('click',async e=>{
    e.preventDefault();
    if(await confirmDialog('确定要退出登录吗？'))logout();
  });
  const binders={dashboard:bindDashboard,archives:bindArchives,borrow:bindBorrow,copy:bindCopy,destruction:bindDestruction,notifications:bindNotifications,admin:bindAdmin};
  (binders[currentPage]||binders.dashboard)();
}

let dashData={stats:{},hot:[],overdue:[]};
async function loadDashboard(){
  const [stats,hot,overdue]=await Promise.all([
    api('/api/dashboard/stats'),
    api('/api/dashboard/hot-archives?limit=10'),
    api('/api/dashboard/overdue')
  ]);
  if(stats)dashData.stats=stats;
  if(hot)dashData.hot=hot;
  if(overdue)dashData.overdue=overdue;
  lastRefreshTime=new Date();
  updateDashboardDom();
}

function updateDashboardDom(){
  const s=dashData.stats;
  const setVal=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val};
  setVal('stat-public',s.public_count||0);
  setVal('stat-internal',s.internal_count||0);
  setVal('stat-confidential',s.confidential_count||0);
  setVal('stat-total',s.total_archives||0);
  setVal('stat-borrowing',s.active_borrows||0);
  setVal('stat-overdue',s.overdue_count||0);
  setVal('stat-pending',s.pending_approvals||0);
  setVal('refresh-time',lastRefreshTime?lastRefreshTime.toLocaleTimeString('zh-CN'):'');
  
  const hotTbody=document.getElementById('hot-tbody');
  if(hotTbody){
    hotTbody.innerHTML=dashData.hot.length?dashData.hot.map((h,i)=>'<tr>'+
      '<td>'+(i+1)+'</td><td>'+h.archive_no+'</td><td>'+h.title+'</td>'+
      '<td>'+badge(h.classification,'classification')+'</td><td>'+h.borrow_count+'次</td>'+
    '</tr>').join(''):'<tr><td colspan="5" class="empty">暂无数据</td></tr>';
  }
  const odTbody=document.getElementById('overdue-tbody');
  if(odTbody){
    odTbody.innerHTML=dashData.overdue.length?dashData.overdue.map(o=>'<tr>'+
      '<td>'+o.archive_no+'</td><td>'+o.archive_title+'</td><td>'+o.borrower_name+'</td>'+
      '<td>'+fmtShort(o.due_date)+'</td><td style="color:var(--danger)"><b>'+o.days_overdue+'天</b></td>'+
    '</tr>').join(''):'<tr><td colspan="5" class="empty">✅ 暂无超期记录</td></tr>';
  }
}

function renderDashboard(){
  const s=dashData.stats;
  return '<div class="header">'+
    '<h2>📊 数据看板</h2>'+
    '<span class="refresh-indicator"><span class="dot"></span>每10秒自动刷新 | 上次刷新：<span id="refresh-time">-</span></span>'+
  '</div>'+
  '<div class="cards">'+
    '<div class="card"><div class="label">公开级档案</div><div class="value green" id="stat-public">'+(s.public_count||0)+'</div><div class="trend">可全员借阅</div></div>'+
    '<div class="card"><div class="label">内部级档案</div><div class="value orange" id="stat-internal">'+(s.internal_count||0)+'</div><div class="trend">主管及以上可阅</div></div>'+
    '<div class="card"><div class="label">机密级档案</div><div class="value red" id="stat-confidential">'+(s.confidential_count||0)+'</div><div class="trend">高管及以上可阅</div></div>'+
    '<div class="card"><div class="label">档案总量</div><div class="value blue" id="stat-total">'+(s.total_archives||0)+'</div><div class="trend">在库有效档案</div></div>'+
    '<div class="card"><div class="label">当前借阅中</div><div class="value blue" id="stat-borrowing">'+(s.active_borrows||0)+'</div><div class="trend">未归还数量</div></div>'+
    '<div class="card"><div class="label">超期未还</div><div class="value red" id="stat-overdue">'+(s.overdue_count||0)+'</div><div class="trend">'+(s.overdue_count>0?'⚠️ 需催还':'✅ 状态良好')+'</div></div>'+
    '<div class="card"><div class="label">待审批</div><div class="value orange" id="stat-pending">'+(s.pending_approvals||0)+'</div><div class="trend">待处理申请</div></div>'+
  '</div>'+
  '<div class="two-col">'+
    '<div class="table-wrap">'+
      '<div class="table-header"><h3>🔥 借阅热度排行 TOP 10</h3></div>'+
      '<table><thead><tr><th>#</th><th>编号</th><th>名称</th><th>密级</th><th>借阅次数</th></tr></thead>'+
      '<tbody id="hot-tbody"><tr><td colspan="5" class="empty">加载中...</td></tr></tbody></table>'+
    '</div>'+
    '<div class="table-wrap">'+
      '<div class="table-header"><h3>⚠️ 超期明细</h3></div>'+
      '<table><thead><tr><th>编号</th><th>名称</th><th>借阅人</th><th>到期日</th><th>超期天数</th></tr></thead>'+
      '<tbody id="overdue-tbody"><tr><td colspan="5" class="empty">加载中...</td></tr></tbody></table>'+
    '</div>'+
  '</div>';
}

function bindDashboard(){}

let archivesList=[];
let archivePage=1;
async function loadArchives(){
  const keyword=document.getElementById('arc-keyword')?.value||'';
  const cls=document.getElementById('arc-classification')?.value||'';
  const dateFrom=document.getElementById('arc-date-from')?.value||'';
  const dateTo=document.getElementById('arc-date-to')?.value||'';
  const status=document.getElementById('arc-status')?.value||'';
  let url='/api/archives/?page='+archivePage+'&size=20';
  if(keyword)url+='&keyword='+encodeURIComponent(keyword);
  if(cls)url+='&classification='+cls;
  if(dateFrom)url+='&date_from='+dateFrom;
  if(dateTo)url+='&date_to='+dateTo;
  if(status)url+='&status='+status;
  archivesList=await api(url)||[];
  renderArchivesTable();
}

function renderArchivesTable(){
  const tbody=document.getElementById('archives-tbody');
  if(!tbody)return;
  tbody.innerHTML=archivesList.length?archivesList.map(a=>{
    const stockClass=a.available_quantity<=2?'low':'';
    const stockBadge=a.available_quantity<=2?'<span class="badge badge-low-stock">库存紧张</span>':'';
    const canBorrow=canAccess(a.classification)&&a.status==='active'&&a.available_quantity>0&&!currentUser.frozen_until;
    return '<tr>'+
      '<td><b>'+a.archive_no+'</b></td>'+
      '<td>'+a.title+'<br><span class="stock-info">'+a.description.substring(0,30)+(a.description.length>30?'...':'')+'</span></td>'+
      '<td>'+badge(a.classification,'classification')+'</td>'+
      '<td>'+a.storage_location+'</td>'+
      '<td><span class="stock-info '+stockClass+'">库存：'+a.available_quantity+'/'+a.total_quantity+' '+stockBadge+'</span></td>'+
      '<td>'+fmtShort(a.entry_date)+'</td>'+
      '<td>'+badge(a.status,'status')+'</td>'+
      '<td>'+a.borrow_count+'次</td>'+
      '<td>'+
        '<button class="btn btn-outline btn-sm" data-view="'+a.id+'">详情</button>'+
        (canBorrow?' <button class="btn btn-primary btn-sm" data-borrow="'+a.id+'">借阅</button> <button class="btn btn-outline btn-sm" data-copy="'+a.id+'">复印</button>':'')+
        (a.status==='active'&&currentUser.role==='admin'?' <button class="btn btn-warning btn-sm" data-destroy="'+a.id+'">申请销毁</button>':'')+
      '</td>'+
    '</tr>';
  }).join(''):'<tr><td colspan="9" class="empty">📁 暂无符合条件的档案</td></tr>';
}

function renderArchives(){
  const canCreate=['admin','supervisor','executive'].includes(currentUser.role);
  return '<div class="header">'+
    '<h2>📁 档案管理</h2>'+
    '<div>'+
      (canCreate?'<button class="btn btn-primary" id="add-archive-btn">+ 新增档案</button>':'')+
      ' <button class="btn btn-outline" id="arc-export-btn">📋 导出借阅明细</button>'+
    '</div>'+
  '</div>'+
  '<div class="search-bar">'+
    '<input id="arc-keyword" placeholder="搜索编号/名称/描述...">'+
    '<select id="arc-classification">'+
      '<option value="">全部密级</option><option value="public">公开</option>'+
      '<option value="internal">内部</option><option value="confidential">机密</option>'+
    '</select>'+
    '<select id="arc-status">'+
      '<option value="">全部状态</option><option value="active">在库</option>'+
      '<option value="pending_destruction">待销毁</option><option value="destroyed">已销毁</option>'+
    '</select>'+
    '<input id="arc-date-from" type="date" title="入库起始日期">'+
    '<input id="arc-date-to" type="date" title="入库截止日期">'+
    '<button class="btn btn-primary btn-sm" id="arc-search-btn">🔍 搜索</button>'+
    '<button class="btn btn-outline btn-sm" id="arc-reset-btn">重置</button>'+
  '</div>'+
  '<div class="table-wrap">'+
    '<table><thead><tr>'+
      '<th>档案编号</th><th>名称</th><th>密级</th><th>存储位置</th>'+
      '<th>库存</th><th>入库日期</th><th>状态</th><th>借阅次数</th><th>操作</th>'+
    '</tr></thead><tbody id="archives-tbody"><tr><td colspan="9" class="empty">加载中...</td></tr></tbody></table>'+
  '</div>'+
  '<div id="archive-modal"></div>';
}

function bindArchives(){
  loadArchives();
  document.getElementById('arc-search-btn')?.addEventListener('click',()=>{archivePage=1;loadArchives()});
  document.getElementById('arc-keyword')?.addEventListener('keydown',e=>{if(e.key==='Enter'){archivePage=1;loadArchives()}});
  document.getElementById('arc-reset-btn')?.addEventListener('click',()=>{
    document.getElementById('arc-keyword').value='';
    document.getElementById('arc-classification').value='';
    document.getElementById('arc-status').value='';
    document.getElementById('arc-date-from').value='';
    document.getElementById('arc-date-to').value='';
    archivePage=1;loadArchives();
  });
  document.getElementById('add-archive-btn')?.addEventListener('click',showAddArchiveModal);
  document.getElementById('arc-export-btn')?.addEventListener('click',async()=>{
    showToast('正在生成报表...','info');
    const headers=new Headers();
    headers.append('Authorization','Bearer '+token);
    const res=await fetch(API+'/api/borrow/export',{headers});
    const blob=await res.blob();
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='借阅明细报表_'+new Date().toISOString().slice(0,10)+'.csv';
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('报表下载成功','success');
  });
  document.getElementById('archives-tbody')?.addEventListener('click',e=>{
    const btn=e.target.closest('button');
    if(!btn)return;
    if(btn.dataset.view)showArchiveDetail(parseInt(btn.dataset.view));
    if(btn.dataset.borrow)showBorrowModal(parseInt(btn.dataset.borrow));
    if(btn.dataset.copy)showCopyModal(parseInt(btn.dataset.copy));
    if(btn.dataset.destroy)createDestructionFor(parseInt(btn.dataset.destroy));
  });
}

function showArchiveDetail(archiveId){
  const a=archivesList.find(x=>x.id===archiveId);
  if(!a)return;
  const canBorrow=canAccess(a.classification)&&a.status==='active'&&a.available_quantity>0&&!currentUser.frozen_until;
  document.getElementById('archive-modal').innerHTML='<div class="modal-overlay"><div class="modal" style="width:560px">'+
    '<h3>📄 档案详情</h3>'+
    '<div class="modal-info">'+
      '<div class="detail-row"><span class="label">档案编号</span><span class="value"><b>'+a.archive_no+'</b></span></div>'+
      '<div class="detail-row"><span class="label">档案名称</span><span class="value">'+a.title+'</span></div>'+
      '<div class="detail-row"><span class="label">密级</span><span class="value">'+badge(a.classification,'classification')+'</span></div>'+
      '<div class="detail-row"><span class="label">存储位置</span><span class="value">'+a.storage_location+'</span></div>'+
      '<div class="detail-row"><span class="label">库存状态</span><span class="value">'+a.available_quantity+'/'+a.total_quantity+'份 '+(a.available_quantity<=2?'<span style="color:var(--danger)">库存紧张</span>':'')+'</span></div>'+
      '<div class="detail-row"><span class="label">入库日期</span><span class="value">'+fmtShort(a.entry_date)+'</span></div>'+
      '<div class="detail-row"><span class="label">保管期限</span><span class="value">'+(a.retention_years?a.retention_years+'年':'永久')+'</span></div>'+
      '<div class="detail-row"><span class="label">到期日期</span><span class="value">'+(a.retention_end_date?fmtShort(a.retention_end_date):'永久保存')+'</span></div>'+
      '<div class="detail-row"><span class="label">状态</span><span class="value">'+badge(a.status,'status')+'</span></div>'+
      '<div class="detail-row"><span class="label">借阅次数</span><span class="value">'+a.borrow_count+'次</span></div>'+
    '</div>'+
    '<div class="form-group"><label>描述</label><textarea rows="3" readonly>'+a.description+'</textarea></div>'+
    '<div class="actions">'+
      '<button class="btn btn-outline" id="m-cancel">关闭</button>'+
      (canBorrow?' <button class="btn btn-primary" id="m-borrow">申请借阅</button> <button class="btn btn-outline" id="m-copy">申请复印</button>':'')+
      (a.status==='active'&&currentUser.role==='admin'?' <button class="btn btn-warning" id="m-destroy">申请销毁</button>':'')+
    '</div>'+
  '</div></div>';
  document.getElementById('m-cancel').onclick=()=>{document.getElementById('archive-modal').innerHTML=''};
  document.getElementById('m-borrow')?.addEventListener('click',()=>{document.getElementById('archive-modal').innerHTML='';showBorrowModal(a.id)});
  document.getElementById('m-copy')?.addEventListener('click',()=>{document.getElementById('archive-modal').innerHTML='';showCopyModal(a.id)});
  document.getElementById('m-destroy')?.addEventListener('click',()=>{document.getElementById('archive-modal').innerHTML='';createDestructionFor(a.id)});
}

function showAddArchiveModal(){
  document.getElementById('archive-modal').innerHTML='<div class="modal-overlay"><div class="modal" style="width:560px">'+
    '<h3>➕ 新增档案</h3>'+
    '<div class="form-row">'+
      '<div class="form-group"><label>档案名称 *</label><input id="m-title" placeholder="请输入档案名称"></div>'+
      '<div class="form-group"><label>入库数量</label><input id="m-qty" type="number" value="1" min="1"></div>'+
    '</div>'+
    '<div class="form-group"><label>描述</label><textarea id="m-desc" placeholder="请输入档案描述"></textarea></div>'+
    '<div class="form-row">'+
      '<div class="form-group"><label>密级 *</label>'+
        '<select id="m-cls"><option value="public">公开</option><option value="internal">内部</option><option value="confidential">机密</option></select>'+
      '</div>'+
      '<div class="form-group"><label>存储位置 *</label><input id="m-loc" placeholder="如：A区1排1柜"></div>'+
    '</div>'+
    '<div class="form-row">'+
      '<div class="form-group"><label>保管期限（年）</label><input id="m-ret" type="number" placeholder="留空则永久保存" min="0"></div>'+
    '</div>'+
    '<div class="modal-info">'+
      '💡 系统将自动生成唯一档案编号，入库后库存自动更新。<br>'+
      '保管期限到期前30天系统将自动提醒销毁。'+
    '</div>'+
    '<div class="actions">'+
      '<button class="btn btn-outline" id="m-cancel">取消</button>'+
      '<button class="btn btn-primary" id="m-submit">提交入库</button>'+
    '</div>'+
  '</div></div>';
  document.getElementById('m-cancel').onclick=()=>{document.getElementById('archive-modal').innerHTML=''};
  document.getElementById('m-submit').onclick=async()=>{
    const title=document.getElementById('m-title').value.trim();
    const qty=parseInt(document.getElementById('m-qty').value)||1;
    if(!title){showToast('请输入档案名称','warning');return}
    const loc=document.getElementById('m-loc').value.trim();
    if(!loc){showToast('请输入存储位置','warning');return}
    const btn=document.getElementById('m-submit');
    btn.disabled=true;btn.textContent='提交中...';
    const data={
      title,description:document.getElementById('m-desc').value,
      classification:document.getElementById('m-cls').value,
      storage_location:loc,quantity:qty,
      retention_years:document.getElementById('m-ret').value?parseInt(document.getElementById('m-ret').value):null
    };
    const r=await api('/api/archives/',{method:'POST',body:data});
    if(r){
      showToast('档案录入成功！编号：'+r.archive_no,'success');
      document.getElementById('archive-modal').innerHTML='';
      loadArchives();
    }else{
      btn.disabled=false;btn.textContent='提交入库';
    }
  };
}

function showBorrowModal(archiveId){
  const a=archivesList.find(x=>x.id===archiveId);
  if(!a)return;
  if(currentUser.frozen_until){showToast('您的借阅权限已冻结至'+fmtShort(currentUser.frozen_until),'error');return}
  document.getElementById('archive-modal').innerHTML='<div class="modal-overlay"><div class="modal">'+
    '<h3>📖 申请借阅</h3>'+
    '<div class="modal-info">'+
      '<div class="detail-row"><span class="label">档案编号</span><span class="value">'+a.archive_no+'</span></div>'+
      '<div class="detail-row"><span class="label">档案名称</span><span class="value">'+a.title+'</span></div>'+
      '<div class="detail-row"><span class="label">密级</span><span class="value">'+badge(a.classification,'classification')+'</span></div>'+
      '<div class="detail-row"><span class="label">可用库存</span><span class="value">'+a.available_quantity+'/'+a.total_quantity+'份</span></div>'+
      '<div class="detail-row"><span class="label">存储位置</span><span class="value">'+a.storage_location+'</span></div>'+
    '</div>'+
    '<div class="form-group">'+
      '<label>借阅天数</label>'+
      '<input id="m-days" type="number" value="7" min="1" max="30">'+
      '<span class="stock-info">请在到期日前归还，超期将记违规</span>'+
    '</div>'+
    '<div class="actions">'+
      '<button class="btn btn-outline" id="m-cancel">取消</button>'+
      '<button class="btn btn-primary" id="m-submit">提交申请</button>'+
    '</div>'+
  '</div></div>';
  document.getElementById('m-cancel').onclick=()=>{document.getElementById('archive-modal').innerHTML=''};
  document.getElementById('m-submit').onclick=async()=>{
    const days=parseInt(document.getElementById('m-days').value);
    if(days<1||days>30){showToast('借阅天数需在1-30天之间','warning');return}
    const r=await api('/api/borrow/',{method:'POST',body:{archive_id:archiveId,days}});
    if(r){
      showToast('借阅申请已提交，等待管理员审批','success');
      document.getElementById('archive-modal').innerHTML='';
      loadArchives();
    }
  };
}

function showCopyModal(archiveId){
  const a=archivesList.find(x=>x.id===archiveId);
  if(!a)return;
  document.getElementById('archive-modal').innerHTML='<div class="modal-overlay"><div class="modal">'+
    '<h3>🖨️ 申请复印</h3>'+
    '<div class="modal-info">'+
      '<div class="detail-row"><span class="label">档案编号</span><span class="value">'+a.archive_no+'</span></div>'+
      '<div class="detail-row"><span class="label">档案名称</span><span class="value">'+a.title+'</span></div>'+
      '<div class="detail-row"><span class="label">密级</span><span class="value">'+badge(a.classification,'classification')+'</span></div>'+
    '</div>'+
    '<div class="form-group"><label>复印页数</label><input id="m-pages" type="number" value="1" min="1"></div>'+
    '<div class="form-group"><label>事由</label><textarea id="m-reason" placeholder="请说明复印用途"></textarea></div>'+
    '<div class="modal-info">'+
      '💡 系统将自动检查部门月度复印配额，超出将自动触发主管审批。'+
    '</div>'+
    '<div class="actions">'+
      '<button class="btn btn-outline" id="m-cancel">取消</button>'+
      '<button class="btn btn-primary" id="m-submit">提交申请</button>'+
    '</div>'+
  '</div></div>';
  document.getElementById('m-cancel').onclick=()=>{document.getElementById('archive-modal').innerHTML=''};
  document.getElementById('m-submit').onclick=async()=>{
    const pages=parseInt(document.getElementById('m-pages').value);
    if(pages<1){showToast('请输入有效的复印页数','warning');return}
    const r=await api('/api/copy/',{method:'POST',body:{archive_id:archiveId,pages,reason:document.getElementById('m-reason').value}});
    if(r){
      showToast(r.requires_supervisor?'超出部门配额，已自动提交主管审批':'复印申请已提交','success');
      document.getElementById('archive-modal').innerHTML='';
    }
  };
}

async function createDestructionFor(archiveId){
  if(!await confirmDialog('确定要为此档案发起销毁申请吗？'))return;
  const r=await api('/api/destruction/?archive_id='+archiveId,{method:'POST'});
  if(r!==null){
    showToast('销毁申请已提交，等待审批','success');
    loadArchives();
  }
}

let borrowTab='my';
function renderBorrow(){
  const isApprover=['admin','supervisor','executive'].includes(currentUser.role);
  return '<div class="header">'+
    '<h2>📖 借阅管理</h2>'+
    '<div class="tabs">'+
      '<button class="btn '+(borrowTab==='my'?'btn-primary':'btn-outline')+' btn-sm" id="tab-my">我的借阅</button>'+
      (isApprover?' <button class="btn '+(borrowTab==='pending'?'btn-primary':'btn-outline')+' btn-sm" id="tab-pending">待审批</button>'+
      ' <button class="btn '+(borrowTab==='all'?'btn-primary':'btn-outline')+' btn-sm" id="tab-all">全部记录</button>':'')+
    '</div>'+
  '</div>'+
  '<div class="table-wrap"><table><thead><tr>'+
    '<th>档案编号</th><th>档案名称</th><th>密级</th><th>借阅人</th>'+
    '<th>申请日期</th><th>到期日期</th><th>状态</th><th>操作</th>'+
  '</tr></thead><tbody id="borrow-tbody"><tr><td colspan="8" class="empty">加载中...</td></tr></tbody></table></div>'+
  '<div id="borrow-modal"></div>';
}

async function loadBorrows(){
  const tbody=document.getElementById('borrow-tbody');
  if(!tbody)return;
  let url='/api/borrow/my';
  if(borrowTab==='pending')url='/api/borrow/pending';
  else if(borrowTab==='all')url='/api/borrow/all';
  const items=await api(url)||[];
  tbody.innerHTML=items.length?items.map(b=>{
    const isOverdue=b.status==='approved'&&b.due_date&&new Date(b.due_date)<new Date();
    const status=isOverdue?'overdue':b.status;
    return '<tr>'+
      '<td>'+(b.archive_no||'')+'</td><td>'+(b.archive_title||'')+'</td>'+
      '<td>'+badge(b.archive_classification||'','classification')+'</td>'+
      '<td>'+(b.borrower_name||'')+'</td>'+
      '<td>'+fmtShort(b.request_date)+'</td>'+
      '<td style="'+(isOverdue?'color:var(--danger)':'')+'">'+fmtShort(b.due_date)+'</td>'+
      '<td>'+badge(status,'status')+(b.is_escalated?' <span style="color:var(--danger)" title="申请超24小时未处理，已自动升级至高管">⬆已升级</span>':'')+'</td>'+
      '<td>'+
        (((b.status==='approved')||(status==='overdue'))&&b.borrower_id===currentUser.id?'<button class="btn btn-success btn-sm" data-return="'+b.id+'">归还</button>':'')+
        (borrowTab==='pending'?' <button class="btn btn-success btn-sm" data-approve="'+b.id+'">批准</button> <button class="btn btn-danger btn-sm" data-reject="'+b.id+'">拒绝</button>':'')+
      '</td>'+
    '</tr>';
  }).join(''):'<tr><td colspan="8" class="empty">📋 暂无记录</td></tr>';
}

function bindBorrow(){
  loadBorrows();
  document.getElementById('tab-my')?.addEventListener('click',()=>{borrowTab='my';render()});
  document.getElementById('tab-pending')?.addEventListener('click',()=>{borrowTab='pending';render()});
  document.getElementById('tab-all')?.addEventListener('click',()=>{borrowTab='all';render()});
  document.getElementById('borrow-tbody')?.addEventListener('click',async e=>{
    const btn=e.target.closest('button');if(!btn)return;
    if(btn.dataset.return){
      if(!await confirmDialog('确认已归还该档案？'))return;
      const r=await api('/api/borrow/'+btn.dataset.return+'/return',{method:'PUT'});
      if(r!==null){showToast('已归还，库存已更新','success');loadBorrows()}
    }
    if(btn.dataset.approve){
      if(!await confirmDialog('确认批准该借阅申请？'))return;
      const r=await api('/api/borrow/'+btn.dataset.approve+'/approve',{method:'PUT'});
      if(r!==null){showToast('已批准，库存已扣减','success');loadBorrows()}
    }
    if(btn.dataset.reject){
      const reason=prompt('请输入拒绝原因（可选）：');
      if(reason===null)return;
      const r=await api('/api/borrow/'+btn.dataset.reject+'/reject',{method:'PUT'});
      if(r!==null){showToast('已拒绝','success');loadBorrows()}
    }
  });
}

let copyTab='my';
function renderCopy(){
  const isApprover=['admin','supervisor'].includes(currentUser.role);
  return '<div class="header">'+
    '<h2>🖨️ 复印申请</h2>'+
    '<div class="tabs">'+
      '<button class="btn '+(copyTab==='my'?'btn-primary':'btn-outline')+' btn-sm" id="ctab-my">我的申请</button>'+
      (isApprover?' <button class="btn '+(copyTab==='pending'?'btn-primary':'btn-outline')+' btn-sm" id="ctab-pending">待审批</button>':'')+
    '</div>'+
  '</div>'+
  '<div class="table-wrap"><table><thead><tr>'+
    '<th>档案编号</th><th>档案名称</th><th>页数</th><th>事由</th>'+
    '<th>申请人</th><th>申请日期</th><th>状态</th>'+(copyTab==='pending'?'<th>操作</th>':'')+
  '</tr></thead><tbody id="copy-tbody"><tr><td colspan="8" class="empty">加载中...</td></tr></tbody></table></div>';
}

async function loadCopies(){
  const tbody=document.getElementById('copy-tbody');if(!tbody)return;
  let url=copyTab==='pending'?'/api/copy/pending':'/api/copy/my';
  const items=await api(url)||[];
  tbody.innerHTML=items.length?items.map(c=>'<tr>'+
    '<td>'+(c.archive_no||'')+'</td><td>'+(c.archive_title||'')+'</td><td>'+c.pages+'页</td>'+
    '<td>'+(c.reason||'-')+'</td><td>'+(c.requester_name||'')+'</td><td>'+fmtShort(c.request_date)+'</td>'+
    '<td>'+badge(c.status,'status')+(c.requires_supervisor?' <span class="badge badge-pending">超配额</span>':'')+'</td>'+
    (copyTab==='pending'?'<td><button class="btn btn-success btn-sm" data-capprove="'+c.id+'">批准</button> <button class="btn btn-danger btn-sm" data-creject="'+c.id+'">拒绝</button></td>':'')+
  '</tr>').join(''):'<tr><td colspan="8" class="empty">📋 暂无记录</td></tr>';
}

function bindCopy(){
  loadCopies();
  document.getElementById('ctab-my')?.addEventListener('click',()=>{copyTab='my';render()});
  document.getElementById('ctab-pending')?.addEventListener('click',()=>{copyTab='pending';render()});
  document.getElementById('copy-tbody')?.addEventListener('click',async e=>{
    const btn=e.target.closest('button');if(!btn)return;
    if(btn.dataset.capprove){
      if(!await confirmDialog('确认批准该复印申请？'))return;
      const r=await api('/api/copy/'+btn.dataset.capprove+'/approve',{method:'PUT'});
      if(r!==null){showToast('已批准，配额已更新','success');loadCopies()}
    }
    if(btn.dataset.creject){
      const reason=prompt('请输入拒绝原因（可选）：');
      if(reason===null)return;
      const r=await api('/api/copy/'+btn.dataset.creject+'/reject',{method:'PUT'});
      if(r!==null){showToast('已拒绝','success');loadCopies()}
    }
  });
}

function renderDestruction(){
  return '<div class="header">'+
    '<h2>🗑️ 销毁管理</h2>'+
    (currentUser.role==='admin'?' <button class="btn btn-primary" id="add-destruction-btn">+ 发起销毁</button>':'')+
  '</div>'+
  '<div class="two-col">'+
    '<div class="table-wrap">'+
      '<div class="table-header"><h3>⏳ 待审批销毁</h3></div>'+
      '<table><thead><tr><th>编号</th><th>档案名称</th><th>申请人</th><th>状态</th><th>操作</th></tr></thead>'+
      '<tbody id="dest-pending-tbody"><tr><td colspan="5" class="empty">加载中...</td></tr></tbody></table>'+
    '</div>'+
    '<div class="table-wrap">'+
      '<div class="table-header"><h3>⚠️ 保管期限预警</h3></div>'+
      '<table><thead><tr><th>编号</th><th>名称</th><th>到期日</th><th>剩余天数</th></tr></thead>'+
      '<tbody id="dest-alert-tbody"><tr><td colspan="4" class="empty">加载中...</td></tr></tbody></table>'+
    '</div>'+
  '</div>'+
  (['admin','executive'].includes(currentUser.role)?'<div class="table-wrap" style="margin-top:24px"><div class="table-header"><h3>📋 全部销毁记录</h3></div><table><thead><tr><th>编号</th><th>档案名称</th><th>申请人</th><th>一级审批</th><th>二级审批</th><th>状态</th><th>操作</th></tr></thead><tbody id="dest-all-tbody"><tr><td colspan="7" class="empty">加载中...</td></tr></tbody></table></div>':'')+
  '<div id="dest-modal"></div>';
}

async function loadDestructions(){
  const [pending,alerts,allD]=await Promise.all([
    api('/api/destruction/pending'),
    api('/api/dashboard/retention-alerts'),
    ['admin','executive'].includes(currentUser.role)?api('/api/destruction/all'):Promise.resolve(null)
  ]);
  
  const pt=document.getElementById('dest-pending-tbody');
  if(pt&&pending){
    pt.innerHTML=pending.length?pending.map(d=>'<tr>'+
      '<td>'+d.archive_no+'</td><td>'+d.archive_title+'</td><td>'+d.requester_name+'</td>'+
      '<td>'+badge(d.status,'status')+'</td>'+
      '<td>'+
        (d.status==='pending'&&['supervisor','executive','admin'].includes(currentUser.role)?'<button class="btn btn-success btn-sm" data-d-l1="'+d.id+'">一级审批</button> <button class="btn btn-danger btn-sm" data-d-rej="'+d.id+'">拒绝</button>':'')+
        (d.status==='level1_approved'&&['executive','admin'].includes(currentUser.role)?'<button class="btn btn-success btn-sm" data-d-l2="'+d.id+'">二级审批</button> <button class="btn btn-danger btn-sm" data-d-rej="'+d.id+'">拒绝</button>':'')+
        (d.status==='level2_approved'&&currentUser.role==='admin'?'<button class="btn btn-warning btn-sm" data-d-upload="'+d.id+'">上传销毁影像</button>':'')+
      '</td>'+
    '</tr>').join(''):'<tr><td colspan="5" class="empty">✅ 暂无待审批销毁</td></tr>';
  }
  
  const at=document.getElementById('dest-alert-tbody');
  if(at&&alerts){
    const all=[...(alerts.expiring_soon||[]),...(alerts.expired||[])];
    at.innerHTML=all.length?all.map(a=>{
      const days=daysBetween(new Date(),a.retention_end_date);
      const isExpired=days<0;
      return '<tr>'+
        '<td>'+a.archive_no+'</td><td>'+a.title+'</td>'+
        '<td style="'+(isExpired?'color:var(--danger)':'color:var(--warning)')+'">'+fmtShort(a.retention_end_date)+'</td>'+
        '<td style="'+(isExpired?'color:var(--danger)':'color:var(--warning)')+'">'+(isExpired?'<b>已过期'+Math.abs(days)+'天</b>':'<b>'+days+'天</b>')+'</td>'+
      '</tr>';
    }).join(''):'<tr><td colspan="4" class="empty">✅ 暂无预警</td></tr>';
  }
  
  const adt=document.getElementById('dest-all-tbody');
  if(adt&&allD){
    adt.innerHTML=allD.length?allD.map(d=>'<tr>'+
      '<td>'+d.archive_no+'</td><td>'+d.archive_title+'</td><td>'+d.requester_name+'</td>'+
      '<td>'+(d.level1_approver?'✅ '+fmtShort(d.level1_approved_date):'⏳ 待一级')+'</td>'+
      '<td>'+(d.level2_approver?'✅ '+fmtShort(d.level2_approved_date):((d.status==='rejected'||d.status==='pending')?'—':'⏳ 待二级'))+'</td>'+
      '<td>'+badge(d.status,'status')+'</td>'+
      '<td>'+(d.status==='level2_approved'&&currentUser.role==='admin'?'<button class="btn btn-warning btn-sm" data-d-upload="'+d.id+'">上传影像</button>':'—')+'</td>'+
    '</tr>').join(''):'<tr><td colspan="7" class="empty">📋 暂无销毁记录</td></tr>';
  }
}

function bindDestruction(){
  loadDestructions();
  document.getElementById('add-destruction-btn')?.addEventListener('click',showAddDestructionModal);
  document.getElementById('dest-pending-tbody')?.addEventListener('click',handleDestAction);
  document.getElementById('dest-all-tbody')?.addEventListener('click',handleDestAction);
}

async function handleDestAction(e){
  const btn=e.target.closest('button');if(!btn)return;
  if(btn.dataset.dL1){
    if(!await confirmDialog('确认通过一级审批？'))return;
    const r=await api('/api/destruction/'+btn.dataset.dL1+'/approve-level1',{method:'PUT'});
    if(r!==null){showToast('一级审批通过','success');loadDestructions()}
  }
  if(btn.dataset.dL2){
    if(!await confirmDialog('确认通过二级审批？这将允许上传销毁影像并完成销毁。'))return;
    const r=await api('/api/destruction/'+btn.dataset.dL2+'/approve-level2',{method:'PUT'});
    if(r!==null){showToast('二级审批通过，请上传销毁影像','success');loadDestructions()}
  }
  if(btn.dataset.dRej){
    const reason=prompt('请输入拒绝原因（可选）：');
    if(reason===null)return;
    const r=await api('/api/destruction/'+btn.dataset.dRej+'/reject',{method:'PUT'});
    if(r!==null){showToast('已拒绝，档案状态已恢复','success');loadDestructions()}
  }
  if(btn.dataset.dUpload){
    showUploadVideoModal(parseInt(btn.dataset.dUpload));
  }
}

function showAddDestructionModal(){
  document.getElementById('dest-modal').innerHTML='<div class="modal-overlay"><div class="modal">'+
    '<h3>🗑️ 发起销毁申请</h3>'+
    '<div class="form-group"><label>选择档案</label><select id="m-dest-aid"><option value="">加载中...</option></select></div>'+
    '<div class="modal-info">'+
      '💡 仅可选择状态为"在库"的档案。销毁需两级审批并上传销毁影像后方可完成。'+
    '</div>'+
    '<div class="actions">'+
      '<button class="btn btn-outline" id="m-cancel">取消</button>'+
      '<button class="btn btn-primary" id="m-submit">提交申请</button>'+
    '</div>'+
  '</div></div>';
  document.getElementById('m-cancel').onclick=()=>{document.getElementById('dest-modal').innerHTML=''};
  
  api('/api/archives/?status=active&size=100').then(archives=>{
    const sel=document.getElementById('m-dest-aid');
    if(!archives||!archives.length){sel.innerHTML='<option value="">无可销毁档案</option>';return}
    sel.innerHTML='<option value="">请选择档案</option>'+archives.map(a=>'