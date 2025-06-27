export const formatJP = (iso: string) => {
  const d = new Date(iso);
  const w = '日月火水木金土'[d.getDay()];
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}/${p(d.getDate())}(${w})${p(d.getHours())}:${p(d.getMinutes())}`;
};
