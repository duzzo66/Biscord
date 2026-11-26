// JavaScript / desktop/main.cjs / Electron / Windows desktop client
const {app,BrowserWindow,shell,dialog,desktopCapturer,ipcMain}=require('electron');
const path=require('node:path');
const config=require('./server.json');
let window;
const {serverURL,internalURL}=require('./navigation.cjs');
const base=serverURL(process.env.BISCORD_DESKTOP_URL||config.url);
const internal=url=>internalURL(url,base);
function external(url){try{if(['https:','http:'].includes(new URL(url).protocol))shell.openExternal(url);}catch{}}
function create(){
 window=new BrowserWindow({width:1280,height:800,minWidth:900,minHeight:600,title:'vulcord',backgroundColor:'#232428',show:false,autoHideMenuBar:true,frame:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,backgroundThrottling:true,partition:'persist:biscord'}});
 window.removeMenu();
 window.webContents.session.setDisplayMediaRequestHandler(async(request,callback)=>{try{if(new URL(request.securityOrigin).origin!==base.origin)return callback({});const sources=await desktopCapturer.getSources({types:['screen','window']});if(!sources.length)return callback({});const result=await dialog.showMessageBox(window,{message:'Escolha a tela ou janela para transmitir',buttons:[...sources.map(s=>s.name),'Cancelar'],cancelId:sources.length,noLink:true});callback(result.response<sources.length?{video:sources[result.response]}:{});}catch{callback({});}},{useSystemPicker:true});
 window.webContents.on('will-navigate',(event,url)=>{if(!internal(url)){event.preventDefault();external(url);}});
 window.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
 window.webContents.on('did-finish-load',()=>{window.webContents.insertCSS('.app-bar{-webkit-app-region:drag;padding-right:140px!important} .app-bar-actions{right:150px!important} .app-bar button,.app-bar a{-webkit-app-region:no-drag} .auth-home,.auth-back-home,a[href="/"]{display:none!important}');});
 window.webContents.on('render-process-gone',()=>{dialog.showMessageBox(window,{type:'error',message:'A interface foi interrompida.',buttons:['Recarregar','Fechar']}).then(({response})=>response===0?window.loadURL(new URL('/channels/@me',base).href):window.close());});
 window.webContents.on('did-fail-load',(_event,code,_description,_url,isMain)=>{if(isMain&&code!==-3){window.show();dialog.showMessageBox(window,{type:'error',message:'Não foi possível conectar ao servidor vulcord.',detail:'Verifique sua conexão e se o servidor está ligado.',buttons:['Tentar novamente','Fechar']}).then(({response})=>response===0?window.loadURL(new URL('/channels/@me',base).href):window.close());}});
 window.once('ready-to-show',()=>window.show());
 window.loadURL(new URL('/channels/@me',base).href);
}
ipcMain.on('biscord:window-colors',(event,colors)=>{
 if(!window||window.isDestroyed()||event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)return;
 try{if(new URL(event.senderFrame.url).origin!==base.origin)return;}catch{return;}
 if(!colors||!/^#[\da-f]{6}$/i.test(colors.background)||!/^#[\da-f]{6}$/i.test(colors.foreground))return;
 window.webContents.send('biscord:window-symbols',colors.foreground);
});
ipcMain.on('biscord:window-action',(event,action)=>{
 if(!window||window.isDestroyed()||event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)return;
 try{if(new URL(event.senderFrame.url).origin!==base.origin)return;}catch{return;}
 if(action==='minimize')window.minimize();
 if(action==='maximize'){if(window.isMaximized())window.unmaximize();else window.maximize();}
 if(action==='close')window.close();
});
if(!app.requestSingleInstanceLock())app.quit();else{
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
 app.whenReady().then(create);
 app.on('window-all-closed',()=>app.quit());
}
