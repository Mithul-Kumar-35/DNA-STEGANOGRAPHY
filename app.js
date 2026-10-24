const $ = (id) => document.getElementById(id);

// ==================== ENHANCED CANVAS BACKGROUND ====================
const bg = $("bg");
const bgCtx = bg.getContext("2d", { alpha: true });

function resizeBg() {
  bg.width = window.innerWidth * devicePixelRatio;
  bg.height = window.innerHeight * devicePixelRatio;
  bgCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener("resize", resizeBg);
resizeBg();

// Binary rain with particles
const cols = () => Math.floor(window.innerWidth / 16);
let drops = new Array(cols()).fill(0).map(() => Math.random() * window.innerHeight);
let particles = [];

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = Math.random() * 0.5;
    this.life = 1;
    this.decay = Math.random() * 0.02 + 0.01;
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }
  
  draw(ctx) {
    ctx.fillStyle = `rgba(80,160,255,${this.life * 0.5})`;
    ctx.fillRect(this.x, this.y, 2, 2);
  }
}

function resetDrops() {
  drops = new Array(cols()).fill(0).map(() => Math.random() * window.innerHeight);
}
window.addEventListener("resize", resetDrops);

let frameCount = 0;
function tickBg() {
  bgCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  bgCtx.fillStyle = "rgba(0, 0, 0, 0.24)";
  bgCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  bgCtx.font =
    "14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
  bgCtx.shadowBlur = 8;
  bgCtx.shadowColor = "rgba(110,190,255,0.65)";

  for (let i = 0; i < drops.length; i++) {
    const x = i * 16;
    const y = drops[i];

    const bit = Math.random() > 0.5 ? "1" : "0";
    bgCtx.fillStyle =
      Math.random() > 0.94 ? "rgba(210,240,255,0.98)" : "rgba(135,195,255,0.9)";
    bgCtx.fillText(bit, x, y);

    drops[i] += 14 + Math.random() * 10;
    if (drops[i] > window.innerHeight && Math.random() > 0.985) {
      drops[i] = 0;
      // Create particles on reset
      if (Math.random() > 0.7) {
        particles.push(new Particle(x, 0));
      }
    }
  }
  
  // Update and draw particles
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    p.update();
    p.draw(bgCtx);
  });

  bgCtx.shadowBlur = 0;

  frameCount++;
  requestAnimationFrame(tickBg);
}
tickBg();

// ==================== INTERSECTION OBSERVER FOR ANIMATIONS ====================
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animation = 'slideInUp 0.6s ease-out forwards';
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.card, .mini').forEach(el => {
  observer.observe(el);
});

// ==================== SMOOTH SCROLL ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ==================== FOOTER YEAR ====================
const yearEl = $("year");
if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}
