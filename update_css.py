import re

with open(r'C:\Users\juan_\OneDrive\Documentos\Doctorado\STEAM\STEAM\src\Css\styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

new_css = """
/* --- nodos --- */
.path-container {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lesson-nodes {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  gap: 30px;
  position: relative;
  z-index: 1;
  width: 100%;
}

.node-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
  width: 140px;
}

/* Offset positioning for serpentine */
.node-col.center { transform: translateX(0); }
.node-col.left { transform: translateX(-50px); }
.node-col.right { transform: translateX(50px); }

/* Vertical connecting line */
.node-col::before {
  content: "";
  position: absolute;
  top: 35px;
  left: 50%;
  width: 14px;
  margin-left: -7px;
  background-color: var(--border-mid);
  z-index: -1;
  border-radius: 7px;
}

.node-col:last-child::before {
  display: none;
}

/* 1(center) to 2(left) */
.node-col:nth-child(1)::before { height: 115px; transform: rotate(-25deg); transform-origin: top center; }
/* 2(left) to 3(center) */
.node-col:nth-child(2)::before { height: 115px; transform: rotate(25deg); transform-origin: top center; }
/* 3(center) to 4(right) */
.node-col:nth-child(3)::before { height: 115px; transform: rotate(25deg); transform-origin: top center; }
/* 4(right) to 5(center) */
.node-col:nth-child(4)::before { height: 115px; transform: rotate(-25deg); transform-origin: top center; }
/* 5(center) to 6(left) */
.node-col:nth-child(5)::before { height: 115px; transform: rotate(-25deg); transform-origin: top center; }

.lesson-cube {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 4px solid;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: default;
  background: #ffffff;
  box-shadow: 0 5px 0px rgba(0,0,0,0.15);
}

.lesson-cube:active {
  transform: translateY(4px);
  box-shadow: 0 1px 0px rgba(0,0,0,0.15);
}

.lesson-num {
  font-family: 'Syne', sans-serif;
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
}

.lesson-label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-top: 4px;
}

.lock-icon {
  position: absolute;
  top: -5px;
  right: -5px;
  font-size: 18px;
  background: var(--surface);
  border-radius: 50%;
  padding: 2px;
}

.check-icon {
  position: absolute;
  top: -5px;
  right: -5px;
  font-size: 16px;
  font-weight: 700;
  background: #fff;
  border-radius: 50%;
  padding: 2px;
}

.node-subtitle {
  text-align: center;
  max-width: 140px;
  margin-top: 12px;
}

.sub-line {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: var(--text-light);
  letter-spacing: 0.08em;
  margin-bottom: 4px;
  text-transform: uppercase;
  font-weight: 600;
}

.sub-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  line-height: 1.4;
}

/* -- ESTADO BLOQUEADO -- */
.lesson-cube.locked {
  background: #e5e5e5;
  border-color: #d4d4d4;
  box-shadow: 0 4px 0px #c4c4c4;
}
.lesson-cube.locked .lesson-num { color: #a3a3a3; }

/* -- MODULOS -- */

/* INTRODUCCION */
.intro .node-col::before { background-color: var(--intro-accent); opacity: 0.3; }
.intro .node-col:has(.completed)::before, .intro .node-col:has(.next-up)::before { opacity: 1; }

.intro .lesson-cube.next-up {
  width: 84px;
  height: 84px;
  border-width: 5px;
  background: #ffffff;
  border-color: var(--intro-accent);
  box-shadow: 0 6px 0px var(--intro-accent), 0 0 25px var(--intro-glow);
  cursor: pointer;
}
.intro .lesson-cube.next-up .lesson-num,
.intro .lesson-cube.next-up .lesson-label { color: var(--intro-accent); }

.intro .lesson-cube.completed {
  background: var(--intro-accent);
  border-color: var(--intro-accent);
  box-shadow: 0 5px 0px rgba(0,0,0,0.15);
  cursor: pointer;
}
.intro .lesson-cube.completed .lesson-num,
.intro .lesson-cube.completed .lesson-label { color: #ffffff; }
.intro .lesson-cube.completed .check-icon { color: var(--intro-accent); }

/* MATEMATICAS */
.math .node-col::before { background-color: var(--math-accent); opacity: 0.3; }
.math .node-col:has(.completed)::before, .math .node-col:has(.next-up)::before { opacity: 1; }

.math .lesson-cube.next-up {
  width: 84px;
  height: 84px;
  border-width: 5px;
  background: #ffffff;
  border-color: var(--math-accent);
  box-shadow: 0 6px 0px var(--math-accent), 0 0 25px var(--math-glow);
  cursor: pointer;
}
.math .lesson-cube.next-up .lesson-num,
.math .lesson-cube.next-up .lesson-label { color: var(--math-accent); }

.math .lesson-cube.completed {
  background: var(--math-accent);
  border-color: var(--math-accent);
  box-shadow: 0 5px 0px rgba(0,0,0,0.15);
  cursor: pointer;
}
.math .lesson-cube.completed .lesson-num,
.math .lesson-cube.completed .lesson-label { color: #ffffff; }
.math .lesson-cube.completed .check-icon { color: var(--math-accent); }

/* CIENCIA */
.science .node-col::before { background-color: var(--science-accent); opacity: 0.3; }
.science .node-col:has(.completed)::before, .science .node-col:has(.next-up)::before { opacity: 1; }

.science .lesson-cube.next-up {
  width: 84px;
  height: 84px;
  border-width: 5px;
  background: #ffffff;
  border-color: var(--science-accent);
  box-shadow: 0 6px 0px var(--science-accent), 0 0 25px var(--science-glow);
  cursor: pointer;
}
.science .lesson-cube.next-up .lesson-num,
.science .lesson-cube.next-up .lesson-label { color: var(--science-accent); }

.science .lesson-cube.completed {
  background: var(--science-accent);
  border-color: var(--science-accent);
  box-shadow: 0 5px 0px rgba(0,0,0,0.15);
  cursor: pointer;
}
.science .lesson-cube.completed .lesson-num,
.science .lesson-cube.completed .lesson-label { color: #ffffff; }
.science .lesson-cube.completed .check-icon { color: var(--science-accent); }

/* INGENIERIA */
.engineering .node-col::before { background-color: var(--eng-accent); opacity: 0.3; }
.engineering .node-col:has(.completed)::before, .engineering .node-col:has(.next-up)::before { opacity: 1; }

.engineering .lesson-cube.next-up {
  width: 84px;
  height: 84px;
  border-width: 5px;
  background: #ffffff;
  border-color: var(--eng-accent);
  box-shadow: 0 6px 0px var(--eng-accent), 0 0 25px var(--eng-glow);
  cursor: pointer;
}
.engineering .lesson-cube.next-up .lesson-num,
.engineering .lesson-cube.next-up .lesson-label { color: var(--eng-accent); }

.engineering .lesson-cube.completed {
  background: var(--eng-accent);
  border-color: var(--eng-accent);
  box-shadow: 0 5px 0px rgba(0,0,0,0.15);
  cursor: pointer;
}
.engineering .lesson-cube.completed .lesson-num,
.engineering .lesson-cube.completed .lesson-label { color: #ffffff; }
.engineering .lesson-cube.completed .check-icon { color: var(--eng-accent); }

/* TECNOLOGIA */
.tech .node-col::before { background-color: var(--tech-accent); opacity: 0.3; }
.tech .node-col:has(.completed)::before, .tech .node-col:has(.next-up)::before { opacity: 1; }

.tech .lesson-cube.next-up {
  width: 84px;
  height: 84px;
  border-width: 5px;
  background: #ffffff;
  border-color: var(--tech-accent);
  box-shadow: 0 6px 0px var(--tech-accent), 0 0 25px var(--tech-glow);
  cursor: pointer;
}
.tech .lesson-cube.next-up .lesson-num,
.tech .lesson-cube.next-up .lesson-label { color: var(--tech-accent); }

.tech .lesson-cube.completed {
  background: var(--tech-accent);
  border-color: var(--tech-accent);
  box-shadow: 0 5px 0px rgba(0,0,0,0.15);
  cursor: pointer;
}
.tech .lesson-cube.completed .lesson-num,
.tech .lesson-cube.completed .lesson-label { color: #ffffff; }
.tech .lesson-cube.completed .check-icon { color: var(--tech-accent); }

/* ARTES */
.arts .node-col::before { background-color: var(--arts-accent); opacity: 0.3; }
.arts .node-col:has(.completed)::before, .arts .node-col:has(.next-up)::before { opacity: 1; }

.arts .lesson-cube.next-up {
  width: 84px;
  height: 84px;
  border-width: 5px;
  background: #ffffff;
  border-color: var(--arts-accent);
  box-shadow: 0 6px 0px var(--arts-accent), 0 0 25px var(--arts-glow);
  cursor: pointer;
}
.arts .lesson-cube.next-up .lesson-num,
.arts .lesson-cube.next-up .lesson-label { color: var(--arts-accent); }

.arts .lesson-cube.completed {
  background: var(--arts-accent);
  border-color: var(--arts-accent);
  box-shadow: 0 5px 0px rgba(0,0,0,0.15);
  cursor: pointer;
}
.arts .lesson-cube.completed .lesson-num,
.arts .lesson-cube.completed .lesson-label { color: #ffffff; }
.arts .lesson-cube.completed .check-icon { color: var(--arts-accent); }

/* -- ANIMACIONES -- */
@keyframes pulse-intro {
  0%,100% { box-shadow: 0 6px 0px var(--intro-accent), 0 0 12px var(--intro-glow); transform: scale(1); }
  50%      { box-shadow: 0 6px 0px var(--intro-accent), 0 0 28px var(--intro-glow), 0 0 6px var(--intro-accent); transform: scale(1.05); }
}
@keyframes pulse-math {
  0%,100% { box-shadow: 0 6px 0px var(--math-accent), 0 0 12px var(--math-glow); transform: scale(1); }
  50%      { box-shadow: 0 6px 0px var(--math-accent), 0 0 28px var(--math-glow), 0 0 6px var(--math-accent); transform: scale(1.05); }
}
@keyframes pulse-science {
  0%,100% { box-shadow: 0 6px 0px var(--science-accent), 0 0 12px var(--science-glow); transform: scale(1); }
  50%      { box-shadow: 0 6px 0px var(--science-accent), 0 0 28px var(--science-glow), 0 0 6px var(--science-accent); transform: scale(1.05); }
}
@keyframes pulse-eng {
  0%,100% { box-shadow: 0 6px 0px var(--eng-accent), 0 0 12px var(--eng-glow); transform: scale(1); }
  50%      { box-shadow: 0 6px 0px var(--eng-accent), 0 0 28px var(--eng-glow), 0 0 6px var(--eng-accent); transform: scale(1.05); }
}
@keyframes pulse-tech {
  0%,100% { box-shadow: 0 6px 0px var(--tech-accent), 0 0 12px var(--tech-glow); transform: scale(1); }
  50%      { box-shadow: 0 6px 0px var(--tech-accent), 0 0 28px var(--tech-glow), 0 0 6px var(--tech-accent); transform: scale(1.05); }
}
@keyframes pulse-arts {
  0%,100% { box-shadow: 0 6px 0px var(--arts-accent), 0 0 12px var(--arts-glow); transform: scale(1); }
  50%      { box-shadow: 0 6px 0px var(--arts-accent), 0 0 28px var(--arts-glow), 0 0 6px var(--arts-accent); transform: scale(1.05); }
}

.intro.lesson-cube.next-up, .intro .lesson-cube.next-up { animation: pulse-intro 2.2s ease-in-out infinite; }
.math .lesson-cube.next-up       { animation: pulse-math    2.2s ease-in-out infinite; }
.science .lesson-cube.next-up    { animation: pulse-science 2.2s ease-in-out infinite; }
.engineering .lesson-cube.next-up{ animation: pulse-eng     2.2s ease-in-out infinite; }
.tech .lesson-cube.next-up       { animation: pulse-tech    2.2s ease-in-out infinite; }
.arts .lesson-cube.next-up       { animation: pulse-arts    2.2s ease-in-out infinite; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.node-col { animation: fadeUp 0.5s ease both; }
.node-col:nth-child(1) { animation-delay: 0.05s; }
.node-col:nth-child(2) { animation-delay: 0.12s; }
.node-col:nth-child(3) { animation-delay: 0.19s; }
.node-col:nth-child(4) { animation-delay: 0.26s; }
.node-col:nth-child(5) { animation-delay: 0.33s; }
.node-col:nth-child(6) { animation-delay: 0.40s; }
"""

pattern = re.compile(r'\/\* --- nodos --- \*\/[\s\S]*?\.node-col:nth-child\(6\) \{ animation-delay: 0\.40s; \}', re.MULTILINE)

css = pattern.sub(new_css.strip(), css)

with open(r'C:\Users\juan_\OneDrive\Documentos\Doctorado\STEAM\STEAM\src\Css\styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print('CSS updated successfully.')
