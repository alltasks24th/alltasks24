// utils.js — ฟังก์ชันช่วย
export const el = (sel, parent=document) => parent.querySelector(sel);
export const els = (sel, parent=document) => [...parent.querySelectorAll(sel)];
export const fmtDate = (d) => new Date(d?.seconds?d.seconds*1000:d).toLocaleString('th-TH');
export const id = () => Math.random().toString(36).slice(2);
export function pill(text, cls='secondary'){ return `<span class="badge text-bg-${cls}">${text}</span>`; }
