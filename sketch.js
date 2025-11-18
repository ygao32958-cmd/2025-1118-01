let spriteSheet;
let frames = [];
const TOTAL_FRAMES = 26;
let currentFrame = 0;
let frameW = 0, frameH = 0;
let animating = false; // 預設不動作，按滑鼠切換
let song = null;
let amp = null;
let songLoaded = false;

function preload() {
  // 先嘗試載入資料夾裡的合併圖 `圖片.png`（部分使用者稱為照片.png）
  // 若該圖不存在或載入失敗，則備援載入單張幀檔 `0.png`..`25.png`。
  spriteSheet = loadImage('1/圖片.png',
    () => {
      // 成功載入合併圖
    },
    () => {
      // 載入失敗：嘗試載入各幀檔
      frames = [];
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        // 使用同步 preload 的 loadImage()；若檔案不存在則在 console 顯示警告
        // (第三個參數為 error callback)
        frames[i] = loadImage(`1/${i}.png`, () => {}, () => { console.warn(`無法載入 1/${i}.png`); });
      }
    }
  );

  // 嘗試載入音樂，先在專案目錄找檔名（請將 mp3 放到專案資料夾，或使用下方絕對路徑備援）
  // mp3 位於專案根目錄（和 index.html 同一層）
  // 請確保以本地伺服器啟動頁面以避免瀏覽器路徑限制。
  song = loadSound('MooveKa - Happy Toes.mp3',
    () => {
      songLoaded = true;
      console.log('已載入音訊：MooveKa - Happy Toes.mp3');
      // 若 amp 已建立，將其輸入指向 song
      if (amp) amp.setInput(song);
    },
    () => {
      console.warn('載入音訊失敗：MooveKa - Happy Toes.mp3（請確認檔案在專案資料夾內）');
    }
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  noSmooth();
  // 如果 frames 已由 preload 的備援機制填入（個別檔案），就不用切割
  if (frames.length === 0 && spriteSheet) {
    sliceFrames();
  }
  // 建立振幅分析器（smoothing 值可調）：若有 song 則會自動分析
  amp = new p5.Amplitude(0.6);
  if (song && song.isLoaded()) amp.setInput(song);
  frameRate(60);
}

function sliceFrames() {
  frames = [];
  if (!spriteSheet) return;
  // 優先嘗試橫向平均切割
  if (spriteSheet.width % TOTAL_FRAMES === 0) {
    frameW = spriteSheet.width / TOTAL_FRAMES;
    frameH = spriteSheet.height;
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      frames.push(spriteSheet.get(i * frameW, 0, frameW, frameH));
    }
  } else if (spriteSheet.height % TOTAL_FRAMES === 0) {
    // 或者縱向平均切割
    frameW = spriteSheet.width;
    frameH = spriteSheet.height / TOTAL_FRAMES;
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      frames.push(spriteSheet.get(0, i * frameH, frameW, frameH));
    }
  } else {
    // fallback：以近似寬度切割（若使用者提供精確尺寸可改寫）
    frameW = Math.floor(spriteSheet.width / TOTAL_FRAMES);
    frameH = spriteSheet.height;
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      let sx = i * frameW;
      let sw = (sx + frameW <= spriteSheet.width) ? frameW : (spriteSheet.width - sx);
      frames.push(spriteSheet.get(sx, 0, sw, frameH));
    }
    console.warn('Sprite sheet size not divisible by', TOTAL_FRAMES, '— used approximate slicing.');
  }
}

function draw() {
  // 馬卡龍粉背景
  background('#FFD1DC');
  if (frames.length === 0) return;
  let img = frames[currentFrame % frames.length];
  if (img) {
    image(img, width / 2, height / 2);
  }
  // 只有在 animating 為 true 時才切換幀（按滑鼠切換）
  if (animating) {
    // 透過振幅決定更新速度（振幅越大越快）
    let level = 0;
    if (amp) {
      level = amp.getLevel();
    }
    // map level -> interval (幀數間隔)，數值越小代表更新越快
    // 0 -> slowInterval (例如 12)，maxLevel -> fastInterval (例如 1)
    const maxLevel = 0.4; // 調整上限以匹配音量範圍
    const slowInterval = 12;
    const fastInterval = 1;
    let interval = Math.round(constrain(map(level, 0, maxLevel, slowInterval, fastInterval), fastInterval, slowInterval));
    if (interval <= 1) {
      // 每一幀都更新
      currentFrame = (currentFrame + 1) % frames.length;
    } else {
      if (frameCount % interval === 0) {
        currentFrame = (currentFrame + 1) % frames.length;
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function mousePressed() {
  // 每次點擊切換動畫狀態（開 -> 關 -> 開）
  animating = !animating;
  // 點擊啟動或暫停音樂
  if (song) {
    if (animating) {
      // play 或 resume
      if (!song.isPlaying()) {
        // 如果還沒被載入完成，等載入後再播放
        if (song.isLoaded && typeof song.isLoaded === 'function' ? song.isLoaded() : songLoaded) {
          song.loop();
          amp.setInput(song);
        } else {
          // 若還沒載入，嘗試在一小段時間後播放
          const tryPlay = setInterval(() => {
            if (song.isLoaded && song.isLoaded()) {
              song.loop();
              amp.setInput(song);
              clearInterval(tryPlay);
            }
          }, 200);
        }
      }
    } else {
      // 暫停音樂
      if (song.isPlaying && song.isPlaying()) {
        song.pause();
      }
    }
  } else {
    // 如果沒有音樂檔案，僅切換動畫（音訊不可用）
    console.warn('未找到音訊檔，僅切換動畫。請把 mp3 放到專案資料夾，或確認路徑正確。');
  }
}
