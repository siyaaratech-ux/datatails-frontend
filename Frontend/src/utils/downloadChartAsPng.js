export function downloadSvgChartAsPng(svgElement, filename = 'chart.png') {
  if (!svgElement) return;
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement('canvas');
  const svgRect = svgElement.getBoundingClientRect();
  canvas.width = svgRect.width || 600;
  canvas.height = svgRect.height || 400;
  const ctx = canvas.getContext('2d');
  const img = new window.Image();
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const pngFile = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngFile;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };
  img.onerror = function () {
    alert('Failed to convert chart to PNG.');
    URL.revokeObjectURL(url);
  };
  img.src = url;
} 