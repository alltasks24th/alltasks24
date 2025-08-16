// assets/js/utils.js
export const el = (sel, parent=document) => parent.querySelector(sel);
export const els = (sel, parent=document) => Array.from(parent.querySelectorAll(sel));
export const fmtDate = d => new Date(d).toLocaleString('th-TH');
