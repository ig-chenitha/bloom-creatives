/* BLOOM CREATIVES — visual effects layer.
   Everything here is progressive enhancement: the site works without it.
   - header state + scroll progress
   - hero: dependency-free WebGL "liquid chrome" sculpture (palette switcher, pointer reactive)
   - hero poster parallax, magnetic buttons, drag-scroll work track, soft cursor
*/
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover:hover) and (pointer:fine)").matches;

  /* ---------- header + progress ---------- */
  const header = document.querySelector(".site-header");
  const bar = document.createElement("div");
  bar.className = "fx-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(scrollY / max, 1) : 0) + ")";
      if (header) header.classList.toggle("scrolled", scrollY > 30);
      ticking = false;
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- soft cursor ---------- */
  if (finePointer && !reduceMotion) {
    const cur = document.createElement("div");
    cur.className = "fx-cursor";
    cur.setAttribute("aria-hidden", "true");
    document.body.appendChild(cur);
    let x = -100, y = -100, cx = x, cy = y;
    addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; cur.classList.add("is-on"); }, { passive: true });
    document.addEventListener("pointerleave", () => cur.classList.remove("is-on"));
    document.addEventListener("pointerover", (e) => {
      cur.classList.toggle("is-hover", !!(e.target.closest && e.target.closest("a,button,.wp-card,.work-image-button,select")));
    });
    const loop = () => {
      cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
      cur.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ---------- magnetic buttons ---------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".primary-btn,.text-link,.nav-cta,.wp-all,.bloom-about-button").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.translate = ((e.clientX - r.left - r.width / 2) * 0.16) + "px " + ((e.clientY - r.top - r.height / 2) * 0.28) + "px";
      });
      el.addEventListener("pointerleave", () => { el.style.translate = ""; });
    });
  }

  /* ---------- drag-to-scroll work track ---------- */
  const track = document.querySelector(".wp-track");
  if (track) {
    let down = false, startX = 0, startLeft = 0, moved = 0;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") return;
      down = true; moved = 0; startX = e.clientX; startLeft = track.scrollLeft;
    });
    addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      if (moved > 5) track.classList.add("is-dragging");
      track.scrollLeft = startLeft - dx;
    });
    addEventListener("pointerup", () => {
      down = false;
      setTimeout(() => track.classList.remove("is-dragging"), 0);
    });
  }

  /* ---------- hero ---------- */
  const stage = document.querySelector(".hero-stage");
  const canvas = document.getElementById("hero-canvas");
  if (!stage) return;

  // pointer state shared by posters + shader
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ptr.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (!reduceMotion) {
      stage.querySelectorAll(".hero-poster").forEach((p) => {
        const k = Number(getComputedStyle(p).getPropertyValue("--k")) || 1;
        p.style.setProperty("--px", (ptr.x * -18 * k).toFixed(1));
        p.style.setProperty("--py", (ptr.y * -14 * k).toFixed(1));
      });
    }
  }, { passive: true });

  // palette switcher (01–04)
  const palettes = [
    { phase: [0.00, 0.10, 0.20], tint: [0.55, 0.40, 1.00] },   // violet / aqua
    { phase: [0.35, 0.55, 0.75], tint: [1.00, 0.45, 0.80] },   // rose / gold
    { phase: [0.60, 0.75, 0.90], tint: [0.30, 0.90, 0.95] },   // aqua / mint
    { phase: [0.15, 0.30, 0.05], tint: [1.00, 0.75, 0.35] }    // amber / violet
  ];
  let pal = 0;
  const target = { phase: palettes[0].phase.slice(), tint: palettes[0].tint.slice() };
  const cur = { phase: palettes[0].phase.slice(), tint: palettes[0].tint.slice() };
  const pagerButtons = [...stage.querySelectorAll(".hero-pager button")];
  const caption = stage.querySelector("[data-hero-count]");
  const setPalette = (i) => {
    pal = i;
    target.phase = palettes[i].phase.slice();
    target.tint = palettes[i].tint.slice();
    pagerButtons.forEach((b, n) => { b.classList.toggle("is-active", n === i); b.setAttribute("aria-pressed", String(n === i)); });
    if (caption) caption.textContent = String(i + 1).padStart(2, "0") + " / " + String(palettes.length).padStart(2, "0");
    if (reduceMotion) { cur.phase = target.phase.slice(); cur.tint = target.tint.slice(); draw && draw(performance.now()); }
  };
  pagerButtons.forEach((b, n) => b.addEventListener("click", () => setPalette(n)));

  /* ---------- WebGL liquid chrome ---------- */
  let draw = null;
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "high-performance" });
  if (!gl) return; // CSS fallback orb stays visible

  const vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const fs = `
precision highp float;
uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform vec3 uPhase;uniform vec3 uTint;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;}
float map(vec3 p){
  p.xz*=rot(uTime*.18+uMouse.x*1.1);
  p.yz*=rot(uMouse.y*.6+.25);
  float d=length(p*vec3(1.,.92,1.))-.66;
  for(int i=0;i<4;i++){
    float fi=float(i);
    vec3 q=vec3(sin(uTime*.55+fi*1.9)*.78,cos(uTime*.43+fi*2.3)*.58,sin(uTime*.47+fi*1.3)*.52);
    d=smin(d,length(p-q)-(.27+.045*fi),.5);
  }
  d+=sin(p.x*4.6+uTime*.9)*sin(p.y*4.2+uTime*.8)*sin(p.z*4.4-uTime*.7)*.035;
  return d;
}
vec3 nrm(vec3 p){
  vec2 e=vec2(.0016,-.0016);
  return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));
}
vec3 env(vec3 r){
  float h=r.y*.5+.5;
  vec3 c=mix(vec3(.015,.008,.05),vec3(.36,.28,.78),smoothstep(.05,1.,h));
  c+=vec3(1.)*smoothstep(.82,.94,sin(r.x*3.4+r.y*2.2+1.)*.5+.5)*.85;
  c+=vec3(.7,.9,1.)*pow(max(dot(r,normalize(vec3(.5,.75,.45))),0.),22.)*2.4;
  c+=uTint*pow(max(dot(r,normalize(vec3(-.65,.25,.6))),0.),14.)*1.8;
  c+=vec3(1.)*pow(max(dot(r,normalize(vec3(.1,-.8,.5))),0.),30.)*.9;
  return c;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y*2.15;
  vec3 ro=vec3(0.,0.,3.4);
  vec3 rd=normalize(vec3(uv,-1.9));
  float t=1.4,md=1e3;bool hit=false;
  for(int i=0;i<60;i++){
    float d=map(ro+rd*t);
    md=min(md,d);
    if(d<.0012){hit=true;break;}
    t+=d*.92;
    if(t>6.)break;
  }
  float px=2.15*2./uRes.y;
  float a=hit?1.:1.-smoothstep(0.,px*1.6,md);
  if(a<=.002){gl_FragColor=vec4(0.);return;}
  vec3 p=ro+rd*t;
  vec3 n=nrm(p);
  float ndv=clamp(dot(n,-rd),0.,1.);
  float fres=pow(1.-ndv,2.6);
  vec3 r=reflect(rd,n);
  vec3 film=.5+.5*cos(6.28318*(vec3(ndv*1.15)+uPhase+vec3(0.,.33,.67)+n.y*.25));
  vec3 refl=env(r);
  vec3 col=refl*mix(vec3(1.),film*1.55,.78);
  col+=film*fres*.7;
  col+=pow(max(dot(r,normalize(vec3(.4,.8,.5))),0.),90.)*1.4;
  col=col/(1.+col*.32);
  col=pow(col,vec3(.92));
  gl_FragColor=vec4(col*a,a);
}`;
  const mk = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const v = mk(gl.VERTEX_SHADER, vs), f = mk(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uRes = U("uRes"), uTime = U("uTime"), uMouse = U("uMouse"), uPhase = U("uPhase"), uTint = U("uTint");

  let scale = Math.min(window.devicePixelRatio || 1, 1.5) * (innerWidth < 700 ? 0.8 : 1);
  const resize = () => {
    const w = Math.max(2, Math.round(canvas.clientWidth * scale));
    const h = Math.max(2, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  const t0 = performance.now();
  draw = (now) => {
    resize();
    ptr.sx += (ptr.x - ptr.sx) * 0.06; ptr.sy += (ptr.y - ptr.sy) * 0.06;
    for (let i = 0; i < 3; i++) {
      cur.phase[i] += (target.phase[i] - cur.phase[i]) * 0.06;
      cur.tint[i] += (target.tint[i] - cur.tint[i]) * 0.06;
    }
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, reduceMotion ? 2.4 : (now - t0) / 1000);
    gl.uniform2f(uMouse, ptr.sx, -ptr.sy);
    gl.uniform3fv(uPhase, cur.phase);
    gl.uniform3fv(uTint, cur.tint);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  draw(performance.now());
  canvas.classList.add("is-live");

  if (reduceMotion) return;
  let visible = true, last = performance.now(), slow = 0, frames = 0;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0 }).observe(stage);
  const frame = (now) => {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    draw(now);
    // adaptive quality: drop render resolution on slow devices
    const dt = now - last; last = now; frames++;
    if (frames > 20) { slow += dt > 30 ? 1 : -1; slow = Math.max(slow, 0); }
    if (slow > 40 && scale > 0.5) { scale *= 0.8; slow = 0; }
  };
  requestAnimationFrame(frame);
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); canvas.classList.remove("is-live"); });
})();
