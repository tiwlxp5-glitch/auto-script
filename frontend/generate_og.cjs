const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function generateOG() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;500;700;800&family=Outfit:wght@700;900&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 1200px;
      height: 630px;
      background: radial-gradient(circle at top right, #e0e7ff 0%, #ffffff 40%, #f0f9ff 100%);
      font-family: 'Kanit', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      color: #0f172a;
    }
    .glow-1 {
      position: absolute;
      top: -150px;
      left: -150px;
      width: 600px;
      height: 600px;
      background: rgba(59, 130, 246, 0.2);
      border-radius: 50%;
      filter: blur(120px);
    }
    .glow-2 {
      position: absolute;
      bottom: -200px;
      right: -150px;
      width: 700px;
      height: 700px;
      background: rgba(99, 102, 241, 0.2);
      border-radius: 50%;
      filter: blur(140px);
    }
    .grid-bg {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(rgba(15, 23, 42, 0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px);
      background-size: 40px 40px;
      opacity: 0.8;
    }
    .content {
      z-index: 10;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .logo-badge {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 12px 28px;
      border-radius: 100px;
      font-size: 22px;
      font-weight: 500;
      letter-spacing: 3px;
      color: #2563eb;
      margin-bottom: 25px;
      box-shadow: 0 4px 20px rgba(59, 130, 246, 0.1);
    }
    .title {
      font-family: 'Outfit', sans-serif;
      font-size: 110px;
      font-weight: 900;
      margin: 0;
      line-height: 1.1;
      background: linear-gradient(to right, #2563eb, #4f46e5);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -2px;
    }
    .subtitle {
      font-size: 60px;
      font-weight: 800;
      margin: 15px 0 0 0;
      line-height: 1.2;
      color: #0f172a;
    }
    .description {
      font-size: 30px;
      font-weight: 300;
      color: #475569;
      margin-top: 25px;
      max-width: 900px;
      line-height: 1.4;
    }
    .features {
      display: flex;
      gap: 25px;
      margin-top: 45px;
    }
    .feature-chip {
      background: white;
      border: 1px solid #e2e8f0;
      padding: 16px 32px;
      border-radius: 16px;
      font-size: 24px;
      font-weight: 500;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
    }
    .feature-chip span {
      font-size: 28px;
    }
  </style>
</head>
<body>
  <div class="glow-1"></div>
  <div class="glow-2"></div>
  <div class="grid-bg"></div>
  <div class="content">
    <div class="logo-badge">POWERED BY AI</div>
    <h1 class="title">Auto Script</h1>
    <h2 class="subtitle">AI เขียนสคริปต์รีวิว <span style="color: #2563eb;">ปิดการขายง่ายขึ้น</span></h2>
    <p class="description">พิมพ์จุดเด่นสินค้า AI จะจัดโครงสร้างคลิปให้พร้อมถ่าย<br/>ฝัง 6 สูตรจิตวิทยาการขายระดับโลก (TikTok, Reels, Shopee)</p>
    <div class="features">
      <div class="feature-chip"><span>🔥</span> ฮุกหยุดนิ้ว</div>
      <div class="feature-chip"><span>🧠</span> จิตวิทยาการขาย</div>
      <div class="feature-chip"><span>🎬</span> บอกท่าทางพร้อมถ่าย</div>
    </div>
  </div>
</body>
</html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000); 

  const outPath = path.join(__dirname, 'public', 'og-image.png');
  await page.screenshot({ path: outPath });
  
  console.log('Light theme OG image generated at:', outPath);
  await browser.close();
}

generateOG().catch(console.error);
