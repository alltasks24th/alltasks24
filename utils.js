
// utils.js
export const $ = (sel, root=document)=> root.querySelector(sel);
export const $$ = (sel, root=document)=> Array.from(root.querySelectorAll(sel));
export function tsToDate(x){
  return x?.toDate?.() ? x.toDate() : (x? new Date(x) : null);
}
