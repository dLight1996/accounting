import * as XLSX from 'xlsx';

export function exportToExcel(headers: string[], data: any[][], filename: string) {
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 将数据转换为工作表格式
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  
  // 导出为 Excel 文件并触发下载
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
  
  // 将二进制字符串转换为 Blob
  const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
  
  // 创建下载链接
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  // 清理
  window.URL.revokeObjectURL(url);
}

// 辅助函数：将字符串转换为 ArrayBuffer
function s2ab(s: string) {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < s.length; i++) {
    view[i] = s.charCodeAt(i) & 0xFF;
  }
  return buf;
}
