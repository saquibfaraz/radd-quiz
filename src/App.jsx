import { useState, useEffect, useRef } from "react";

const RADD_PROMPT = `You are an IIBA-certified ECBA exam question writer with deep expertise in BABOK v3 Chapter 7 (Requirements Analysis and Design Definition — RADD).

Generate exactly 20 ECBA exam questions covering RADD tasks:
- Task 7.1 Specify and Model Requirements (4 questions)
- Task 7.2 Verify Requirements (3 questions)
- Task 7.3 Validate Requirements (3 questions)
- Task 7.4 Define Requirements Architecture (3 questions)
- Task 7.5 Define Design Options (3 questions)
- Task 7.6 Analyze Potential Value and Recommend Solution (4 questions)

STRICT 2026 IIBA ECBA FORMAT — follow these rules exactly:
1. Every question MUST start with a workplace scenario (2-4 sentences describing a real situation)
2. The question stem asks what the BA should do NEXT or what is MOST appropriate
3. All 4 options must be plausible — include at least 2 strong distractors from adjacent RADD tasks
4. Correct answer should require application of BABOK, not just recall
5. Difficulty: mix of Medium (60%) and Hard (40%) — no Easy questions
6. Traps to include: Verify vs Validate confusion, Specify vs Architecture, Design Options vs Recommend Solution

CRITICAL EXAM TRAPS TO TEST:
- Verify = quality check (complete, consistent, testable, unambiguous, feasible, modifiable, prioritized, atomic)
- Validate = business value check (does it support goals? does it deliver value?)
- Specify & Model = analytical techniques, models, diagrams
- Define Requirements Architecture = how requirements relate to each other as a WHOLE
- Define Design Options = identify build/buy/outsource/change process options
- Analyze & Recommend = compare options on value, cost, risk, time; recommend HIGHEST VALUE

BABOK quality attributes for Verify (7.2): atomic, complete, consistent, concise, feasible, unambiguous, testable, prioritized, understandable.

Return ONLY a valid JSON array, no markdown fences, no preamble:
[
  {
    "task": "7.1",
    "taskName": "Specify and Model Requirements",
    "question": "scenario + question stem here",
    "options": ["option A", "option B", "option C", "option D"],
    "answer": 0,
    "explanation": "Detailed BABOK v3 explanation citing the specific task, element, or quality attribute",
    "difficulty": "Medium|Hard",
    "trap": "brief note on what distractor was designed to catch"
  }
]`;

const TASK_META = {
  "7.1": { name: "Specify & Model",       color: "#10b981", icon: "📝" },
  "7.2": { name: "Verify Requirements",   color: "#3b82f6", icon: "✅" },
  "7.3": { name: "Validate Requirements", color: "#f97316", icon: "🎯" },
  "7.4": { name: "Define Architecture",   color: "#8b5cf6", icon: "🏗️" },
  "7.5": { name: "Design Options",        color: "#ec4899", icon: "⚙️" },
  "7.6": { name: "Recommend Solution",    color: "#f59e0b", icon: "💡" },
};

async function fetchQuestions() {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: "You are an expert IIBA ECBA exam question writer. Return ONLY valid JSON arrays. No markdown. No explanation outside the JSON.",
      messages: [{ role: "user", content: RADD_PROMPT }],
    }),
  });
  const data = await res.json();
  const raw = data.content?.[0]?.text || "[]";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

const LOADING_STAGES = [
  { pct: 5,  msg: "Initialising RADD question engine…" },
  { pct: 20, msg: "Loading BABOK v3 Chapter 7 context…" },
  { pct: 40, msg: "Crafting workplace scenarios…" },
  { pct: 60, msg: "Designing Verify vs Validate traps…" },
  { pct: 75, msg: "Calibrating 2026 IIBA format…" },
  { pct: 88, msg: "Running quality checks on 20 questions…" },
  { pct: 95, msg: "Almost ready…" },
];

export default function RADDQuiz() {
  const [phase, setPhase]     = useState("loading"); // loading | quiz | results
  const [questions, setQ]     = useState([]);
  const [current, setCur]     = useState(0);
  const [selected, setSel]    = useState(null);
  const [answered, setAns]    = useState(false);
  const [showExpl, setExpl]   = useState(false);
  const [score, setScore]     = useState(0);
  const [results, setResults] = useState([]);
  const [error, setError]     = useState("");
  const [loadPct, setLoadPct] = useState(0);
  const [loadMsg, setLoadMsg] = useState(LOADING_STAGES[0].msg);
  const stageRef = useRef(0);

  useEffect(() => {
    // Animate loading bar while fetching
    const interval = setInterval(() => {
      stageRef.current = Math.min(stageRef.current + 1, LOADING_STAGES.length - 1);
      const s = LOADING_STAGES[stageRef.current];
      setLoadPct(s.pct);
      setLoadMsg(s.msg);
    }, 900);

    fetchQuestions()
      .then(qs => {
        clearInterval(interval);
        setLoadPct(100);
        setLoadMsg("✓ 20 questions ready!");
        setTimeout(() => { setQ(qs); setPhase("quiz"); }, 600);
      })
      .catch(e => {
        clearInterval(interval);
        setError(e.message || "Failed to generate questions. Please reload.");
      });

    return () => clearInterval(interval);
  }, []);

  const q = questions[current];

  const select = (i) => {
    if (answered) return;
    const correct = i === q.answer;
    setSel(i);
    setAns(true);
    if (correct) setScore(s => s + 1);
    setResults(r => [...r, { ...q, selected: i, correct }]);
  };

  const next = () => {
    if (current + 1 >= questions.length) { setPhase("results"); return; }
    setCur(c => c + 1);
    setSel(null); setAns(false); setExpl(false);
  };

  const restart = () => {
    setPhase("loading"); setQ([]); setCur(0); setSel(null);
    setAns(false); setExpl(false); setScore(0); setResults([]);
    setError(""); setLoadPct(0); stageRef.current = 0;
    setLoadMsg(LOADING_STAGES[0].msg);

    const interval = setInterval(() => {
      stageRef.current = Math.min(stageRef.current + 1, LOADING_STAGES.length - 1);
      const s = LOADING_STAGES[stageRef.current];
      setLoadPct(s.pct);
      setLoadMsg(s.msg);
    }, 900);

    fetchQuestions()
      .then(qs => {
        clearInterval(interval);
        setLoadPct(100);
        setLoadMsg("✓ 20 fresh questions ready!");
        setTimeout(() => { setQ(qs); setPhase("quiz"); }, 600);
      })
      .catch(e => {
        clearInterval(interval);
        setError(e.message || "Failed. Please try again.");
      });
  };

  // ── LOADING ──────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div style={S.root}>
        <div style={S.loadWrap}>
          <div style={S.loadLogo}>
            <span style={{ fontSize: 48 }}>📐</span>
          </div>
          <h1 style={S.loadTitle}>RADD Quiz</h1>
          <p style={S.loadSub}>Requirements Analysis & Design Definition</p>
          <p style={S.loadSub2}>BABOK v3 • 2026 IIBA ECBA Format • 20 Questions</p>

          {error ? (
            <div style={S.errorBox}>{error}</div>
          ) : (
            <>
              <div style={S.progWrap}>
                <div style={{ ...S.progFill, width: loadPct + "%" }} />
              </div>
              <p style={S.loadStage}>{loadMsg}</p>
              <div style={S.taskGrid}>
                {Object.entries(TASK_META).map(([k, v]) => (
                  <div key={k} style={{ ...S.taskPill, borderColor: v.color + "44", background: v.color + "11" }}>
                    <span>{v.icon}</span>
                    <span style={{ color: v.color, fontSize: 11, fontWeight: 700 }}>{k}</span>
                    <span style={{ color: "#475569", fontSize: 10 }}>{v.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────
  if (phase === "results") {
    const pct  = Math.round((score / questions.length) * 100);
    const pass = pct >= 65;
    const byTask = {};
    results.forEach(r => {
      if (!byTask[r.task]) byTask[r.task] = { correct: 0, total: 0 };
      byTask[r.task].total++;
      if (r.correct) byTask[r.task].correct++;
    });
    const wrong = results.filter(r => !r.correct);

    return (
      <div style={S.root}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          {/* Score hero */}
          <div style={S.resultHero}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>
              {pct >= 80 ? "🏆" : pct >= 65 ? "✅" : "📚"}
            </div>
            <h1 style={{ ...S.loadTitle, fontSize: 26, marginBottom: 4 }}>
              {pct >= 80 ? "Excellent!" : pct >= 65 ? "Passed!" : "Keep Studying"}
            </h1>
            <div style={{ fontSize: 56, fontWeight: 900, color: pass ? "#10b981" : "#f97316", lineHeight: 1 }}>
              {pct}%
            </div>
            <p style={{ color: "#475569", fontSize: 14, marginTop: 6 }}>
              {score}/{questions.length} correct · Pass mark: 65%
            </p>
          </div>

          {/* Task breakdown */}
          <div style={S.card}>
            <div style={S.cardLabel}>📊 SCORE BY RADD TASK</div>
            {Object.entries(byTask).sort().map(([task, data]) => {
              const tp  = Math.round((data.correct / data.total) * 100);
              const tm  = TASK_META[task];
              return (
                <div key={task} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "#e2e8f0" }}>
                      {tm?.icon} {task} — {tm?.name}
                    </span>
                    <span style={{ color: tp >= 65 ? "#10b981" : "#ef4444", fontWeight: 700 }}>
                      {data.correct}/{data.total} ({tp}%)
                    </span>
                  </div>
                  <div style={S.scoreWrap}>
                    <div style={{ ...S.scoreFill, width: tp + "%", background: tp >= 65 ? (tm?.color || "#10b981") : "#ef4444" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Missed questions */}
          {wrong.length > 0 && (
            <div style={S.card}>
              <div style={S.cardLabel}>❌ MISSED QUESTIONS — STUDY THESE</div>
              {wrong.map((r, i) => {
                const tm = TASK_META[r.task];
                return (
                  <div key={i} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #1e293b" }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ ...S.tag, background: tm?.color + "22", color: tm?.color, border: `1px solid ${tm?.color}44` }}>
                        {r.task} {tm?.name}
                      </span>
                      <span style={{ ...S.tag, background: "#1e293b", color: "#64748b" }}>{r.difficulty}</span>
                    </div>
                    <p style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.7, marginBottom: 8 }}>{r.question}</p>
                    <p style={{ color: "#fca5a5", fontSize: 12, marginBottom: 2 }}>❌ Your answer: {r.options[r.selected]}</p>
                    <p style={{ color: "#6ee7b7", fontSize: 12, marginBottom: 8 }}>✓ Correct: {r.options[r.answer]}</p>
                    <div style={S.explBox}>
                      <div style={S.explLabel}>📖 BABOK v3 EXPLANATION</div>
                      {r.explanation}
                      {r.trap && (
                        <div style={{ marginTop: 8, padding: "6px 10px", background: "#0f1929", borderRadius: 6, borderLeft: "3px solid #f59e0b" }}>
                          <span style={{ color: "#f59e0b", fontSize: 11, fontWeight: 700 }}>⚠️ EXAM TRAP: </span>
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>{r.trap}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {wrong.length === 0 && (
            <div style={{ ...S.card, textAlign: "center" }}>
              <p style={{ color: "#6ee7b7", fontSize: 16, fontWeight: 700 }}>🎯 Perfect score on RADD! Outstanding!</p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
            <button onClick={restart} style={{ ...S.btnGreen, padding: "13px" }}>
              🔄 New 20 Questions
            </button>
            <button onClick={() => { setPhase("quiz"); setCur(0); setSel(null); setAns(false); setExpl(false); }}
              style={{ ...S.btnGhost, padding: "13px" }}>
              📋 Review Answers
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── QUIZ ──────────────────────────────────────────────────────
  if (!q) return null;
  const tm      = TASK_META[q.task] || {};
  const progress = ((current) / questions.length) * 100;
  const dc       = q.difficulty === "Hard" ? "#ef4444" : "#f59e0b";

  return (
    <div style={S.root}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>

        {/* Top bar */}
        <div style={S.topBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>📐</span>
            <span style={{ color: "#f97316", fontWeight: 900, fontSize: 14 }}>RADD</span>
            <span style={{ color: "#334155", fontSize: 13 }}>Chapter 7</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: "#475569", fontSize: 13 }}>{current + 1} / {questions.length}</span>
            <span style={S.scorePill}>✓ {score}</span>
          </div>
        </div>

        {/* Progress */}
        <div style={S.progWrap2}>
          <div style={{ ...S.progFill2, width: progress + "%", background: `linear-gradient(90deg, ${tm.color || "#10b981"}, #f97316)` }} />
        </div>

        {/* Task badge */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ ...S.tag, background: (tm.color || "#10b981") + "22", color: tm.color || "#10b981", border: `1px solid ${(tm.color || "#10b981")}44` }}>
            {tm.icon} Task {q.task} — {tm.name}
          </span>
          <span style={{ ...S.tag, background: dc + "22", color: dc, border: `1px solid ${dc}44` }}>
            {q.difficulty}
          </span>
          <span style={{ ...S.tag, background: "#0f1929", color: "#475569" }}>
            Q{current + 1}
          </span>
        </div>

        {/* Question */}
        <div style={S.qCard}>
          <p style={S.qText}>{q.question}</p>
        </div>

        {/* Options */}
        <div style={{ marginBottom: 14 }}>
          {q.options.map((opt, i) => {
            let border = "1.5px solid #1e293b", bg = "#0f1929", color = "#cbd5e1", iconBg = "#1e293b";
            let iconTxt = String.fromCharCode(65 + i);
            if (answered) {
              if (i === q.answer)                              { bg = "#052e16"; border = "1.5px solid #10b981"; color = "#6ee7b7"; iconBg = "#10b981"; iconTxt = "✓"; }
              else if (i === selected && i !== q.answer)       { bg = "#1c0505"; border = "1.5px solid #ef4444"; color = "#fca5a5"; iconBg = "#ef4444"; iconTxt = "✗"; }
              else                                             { color = "#374151"; }
            } else if (selected === i) {
              border = `1.5px solid ${tm.color || "#10b981"}`;
            }
            return (
              <button key={i} disabled={answered} onClick={() => select(i)}
                style={{ ...S.optBtn, background: bg, border, color }}>
                <span style={{ ...S.optIcon, background: iconBg }}>{iconTxt}</span>
                <span style={{ lineHeight: 1.55 }}>{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {answered && (
          <div>
            <div style={{ background: selected === q.answer ? "#052e16" : "#1c0505", border: `1px solid ${selected === q.answer ? "#10b981" : "#ef4444"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
              <p style={{ fontWeight: 800, fontSize: 14, color: selected === q.answer ? "#6ee7b7" : "#fca5a5", margin: 0 }}>
                {selected === q.answer ? "✅ Correct!" : "❌ Incorrect"}
              </p>
            </div>

            <button onClick={() => setExpl(e => !e)}
              style={{ ...S.btnSm, marginBottom: 8 }}>
              {showExpl ? "▼ Hide" : "▶ Show"} BABOK v3 Explanation
            </button>

            {showExpl && (
              <div style={S.explBox}>
                <div style={S.explLabel}>📖 BABOK v3 · TASK {q.task}</div>
                <p style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.75, margin: 0 }}>{q.explanation}</p>
                {q.trap && (
                  <div style={{ marginTop: 10, padding: "8px 12px", background: "#0a0f1a", borderRadius: 8, borderLeft: "3px solid #f59e0b" }}>
                    <span style={{ color: "#f59e0b", fontSize: 11, fontWeight: 700 }}>⚠️ EXAM TRAP: </span>
                    <span style={{ color: "#94a3b8", fontSize: 12 }}>{q.trap}</span>
                  </div>
                )}
              </div>
            )}

            <button onClick={next}
              style={{ ...S.btnGreen, marginTop: 10 }}>
              {current + 1 >= questions.length ? "🏁 View Results & Task Breakdown" : "Next Question →"}
            </button>
          </div>
        )}

        {/* Task legend */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 20, paddingTop: 16, borderTop: "1px solid #0f1929" }}>
          {Object.entries(TASK_META).map(([k, v]) => (
            <div key={k} style={{ ...S.legendPill, background: k === q.task ? v.color + "22" : "#0a0f1a", border: `1px solid ${k === q.task ? v.color : "#1e293b"}`, color: k === q.task ? v.color : "#334155" }}>
              {v.icon} {k}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const S = {
  root: {
    minHeight: "100vh",
    background: "#060c18",
    color: "#f1f5f9",
    fontFamily: "'Georgia', 'Times New Roman', serif",
    padding: "20px 16px",
  },
  loadWrap: {
    maxWidth: 520, margin: "40px auto 0", textAlign: "center",
  },
  loadLogo: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 80, height: 80, background: "linear-gradient(135deg,#10b981,#3b82f6)",
    borderRadius: 20, marginBottom: 16,
  },
  loadTitle: {
    fontSize: 30, fontWeight: 900, margin: "0 0 4px",
    background: "linear-gradient(135deg,#10b981,#3b82f6)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  loadSub:  { color: "#64748b", fontSize: 14, margin: "0 0 2px", fontFamily: "system-ui,sans-serif" },
  loadSub2: { color: "#334155", fontSize: 12, margin: "0 0 28px", fontFamily: "system-ui,sans-serif" },
  loadStage: { color: "#64748b", fontSize: 13, marginTop: 10, fontFamily: "system-ui,sans-serif" },
  progWrap: {
    height: 8, background: "#0f1929", borderRadius: 4, overflow: "hidden", marginBottom: 8,
  },
  progFill: {
    height: "100%", background: "linear-gradient(90deg,#10b981,#3b82f6)",
    borderRadius: 4, transition: "width 0.8s ease",
  },
  progWrap2: {
    height: 4, background: "#0f1929", borderRadius: 2, marginBottom: 14,
  },
  progFill2: {
    height: "100%", borderRadius: 2, transition: "width 0.3s",
  },
  taskGrid: {
    display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 24,
  },
  taskPill: {
    border: "1px solid", borderRadius: 8, padding: "8px 6px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    fontFamily: "system-ui,sans-serif",
  },
  topBar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 12, fontFamily: "system-ui,sans-serif",
  },
  scorePill: {
    background: "#052e16", color: "#6ee7b7", border: "1px solid #10b981",
    padding: "3px 10px", borderRadius: 8, fontWeight: 700, fontSize: 12,
    fontFamily: "system-ui,sans-serif",
  },
  tag: {
    display: "inline-block", padding: "3px 10px", borderRadius: 10,
    fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif",
  },
  qCard: {
    background: "#0f1929", border: "1px solid #1e293b",
    borderRadius: 14, padding: "18px 20px", marginBottom: 14,
    borderLeft: "3px solid #10b981",
  },
  qText: {
    fontSize: 15, lineHeight: 1.8, margin: 0, color: "#f1f5f9",
  },
  optBtn: {
    width: "100%", borderRadius: 10, padding: "13px 16px", cursor: "pointer",
    textAlign: "left", fontSize: 14, transition: "all 0.15s",
    display: "flex", alignItems: "flex-start", gap: 10,
    fontFamily: "'Georgia','Times New Roman',serif", marginBottom: 8,
  },
  optIcon: {
    minWidth: 24, height: 24, borderRadius: 6, display: "flex",
    alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0,
  },
  explBox: {
    background: "#0b1628", border: "1px solid #1e3a5f",
    borderRadius: 10, padding: 14, marginBottom: 8,
    fontFamily: "system-ui,sans-serif",
  },
  explLabel: {
    color: "#3b82f6", fontSize: 10, fontWeight: 700,
    letterSpacing: "1px", marginBottom: 8,
  },
  btnSm: {
    background: "#0f1929", color: "#60a5fa", border: "1px solid #1e3a5f",
    borderRadius: 8, padding: "8px 14px", cursor: "pointer",
    fontSize: 13, fontFamily: "system-ui,sans-serif", fontWeight: 600, display: "block",
  },
  btnGreen: {
    background: "linear-gradient(135deg,#10b981,#3b82f6)",
    color: "#fff", border: "none", borderRadius: 10, padding: "14px",
    cursor: "pointer", fontSize: 15, fontWeight: 800, width: "100%",
    fontFamily: "system-ui,sans-serif", display: "block",
  },
  btnGhost: {
    background: "#0f1929", color: "#94a3b8", border: "1px solid #1e293b",
    borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700,
    fontFamily: "system-ui,sans-serif", display: "block", textAlign: "center",
  },
  legendPill: {
    padding: "4px 10px", borderRadius: 8, fontSize: 11,
    fontFamily: "system-ui,sans-serif", fontWeight: 600, transition: "all 0.2s",
  },
  card: {
    background: "#0f1929", border: "1px solid #1e293b",
    borderRadius: 14, padding: 18, marginBottom: 14,
    fontFamily: "system-ui,sans-serif",
  },
  cardLabel: {
    color: "#10b981", fontSize: 11, fontWeight: 700,
    letterSpacing: "1.5px", marginBottom: 14,
  },
  scoreWrap: { height: 7, background: "#1e293b", borderRadius: 4 },
  scoreFill: { height: "100%", borderRadius: 4, transition: "width 0.5s" },
  resultHero: {
    textAlign: "center", marginBottom: 20,
    fontFamily: "system-ui,sans-serif",
  },
  errorBox: {
    background: "#1c0505", border: "1px solid #ef4444", borderRadius: 10,
    padding: 14, color: "#fca5a5", fontSize: 13, marginTop: 16,
    fontFamily: "system-ui,sans-serif",
  },
};
