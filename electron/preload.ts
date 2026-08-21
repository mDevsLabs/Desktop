import { contextBridge, ipcRenderer } from 'electron';
const on = <T>(channel: string, callback: (payload: T) => void) => { const fn=(_:unknown,p:T)=>callback(p); ipcRenderer.on(channel,fn); return()=>ipcRenderer.removeListener(channel,fn); };
contextBridge.exposeInMainWorld('maiDesktop', {
  platform: process.platform,
  newWindow: (kind='home') => ipcRenderer.invoke('app:new-window',kind),
  openExternal: (url:string) => ipcRenderer.invoke('app:open-external',url),
  cliStatus: () => ipcRenderer.invoke('cli:status'),
  startTerminal: (id:string,mode:'mai'|'install') => ipcRenderer.invoke('terminal:start',{id,mode}),
  writeTerminal: (id:string,data:string) => ipcRenderer.send('terminal:write',{id,data}),
  resizeTerminal: (id:string,cols:number,rows:number) => ipcRenderer.send('terminal:resize',{id,cols,rows}),
  killTerminal: (id:string) => ipcRenderer.send('terminal:kill',id),
  onTerminalData: (cb:(p:{id:string;data:string})=>void) => on('terminal:data',cb),
  onTerminalExit: (cb:(p:{id:string;exitCode:number})=>void) => on('terminal:exit',cb),
  getWorkspace: () => ipcRenderer.invoke('workspace:get'),
  saveWorkspace: (state:unknown) => ipcRenderer.send('workspace:save',state),
  onWorkspaceRestored: (cb:(p:unknown)=>void) => on('workspace:restored',cb),
  setNotifications: (enabled:boolean) => ipcRenderer.send('preferences:notifications',enabled),
  listDownloads: () => ipcRenderer.invoke('download:list'),
  downloadAction: (id:string,action:string) => ipcRenderer.invoke('download:action',{id,action}),
  onDownloadUpdate: (cb:(p:unknown)=>void) => on('download:update',cb),
  onDownloadRemove: (cb:(id:string)=>void) => on('download:remove',cb),
  onMenuNewTab: (cb:()=>void) => on('menu:new-tab',cb),
  onMenuNewTerminal: (cb:()=>void) => on('menu:new-terminal',cb),
  onMenuCloseTab: (cb:()=>void) => on('menu:close-tab',cb)
});
