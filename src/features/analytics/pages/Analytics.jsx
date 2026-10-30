import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Clock3,
  FolderOpen,
  GraduationCap,
  LineChart,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";

import Sidebar from "../../dashboard/components/Sidebar";
import "../styles/analytics.css";

/* =========================================================
   TREND CHART (DYNAMIC)
========================================================= */

function TrendChart({ trend }) {
  const values = trend?.values || [];
  const labels = trend?.labels || [];

  const width = 560;
  const height = 190;

  const paddingLeft = 20;
  const paddingRight = 20;
  const paddingTop = 18;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  if (
    !values ||
    values.length === 0 ||
    (values.length === 1 && (labels[0] === "No Data" || values[0] === 0))
  ) {
    return (
      <div className="trend-chart">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="trend-svg"
          preserveAspectRatio="none"
        >
          {[0, 1, 2, 3, 4].map((line) => {
            const y = paddingTop + (line * chartHeight) / 4;
            return (
              <line
                key={line}
                x1={paddingLeft}
                x2={width - paddingRight}
                y1={y}
                y2={y}
                className="chart-grid-line"
              />
            );
          })}
        </svg>

        <div className="trend-chart-empty-msg">
          <span>No viva score trends recorded for this period yet</span>
        </div>
      </div>
    );
  }

  let minVal = Math.min(...values);
  let maxVal = Math.max(...values);
  let min = minVal;
  let max = maxVal;

  if (min === max) {
    min = Math.max(0, min - 10);
    max = Math.min(100, max + 10);
  } else {
    min = Math.max(0, min - 5);
    max = Math.min(100, max + 5);
  }

  const points = values.map((value, index) => {
    const x =
      values.length === 1
        ? paddingLeft + chartWidth / 2
        : paddingLeft + (index * chartWidth) / (values.length - 1);

    const y =
      paddingTop + ((max - value) / (max - min)) * chartHeight;

    return {
      x,
      y,
      value,
    };
  });

  const path =
    points.length === 1
      ? `M ${paddingLeft} ${points[0].y} L ${width - paddingRight} ${points[0].y}`
      : points
          .map((point, index) => {
            return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
          })
          .join(" ");

  return (
    <div className="trend-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="trend-svg"
        preserveAspectRatio="none"
      >
        {/* Horizontal grid lines */}
        {[0, 1, 2, 3, 4].map((line) => {
          const y = paddingTop + (line * chartHeight) / 4;

          return (
            <line
              key={line}
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={y}
              y2={y}
              className="chart-grid-line"
            />
          );
        })}

        {/* Trend line */}
        <path d={path} className="trend-path" fill="none" />

        {/* Points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3.5"
            className="trend-point"
          >
            <title>{`${labels[index] || ""}: ${point.value}%`}</title>
          </circle>
        ))}
      </svg>

      <div className="trend-labels">
        {labels.map((lbl, idx) => (
          <span key={idx}>{lbl}</span>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   DIFFICULTY DONUT (DYNAMIC)
========================================================= */

function DifficultyChart({ difficulty }) {
  const {
    total = 0,
    moderate = 0,
    easy = 0,
    hard = 0,
  } = difficulty || {};

  const radius = 55;
  const circumference = 2 * Math.PI * radius;

  const moderateLength = (moderate / 100) * circumference;
  const easyLength = (easy / 100) * circumference;
  const hardLength = (hard / 100) * circumference;

  return (
    <div className="difficulty-chart-wrapper">
      <div className="donut-chart">
        <svg viewBox="0 0 140 140" className="donut-svg">
          <circle
            cx="70"
            cy="70"
            r={radius}
            className="donut-background"
          />

          {total > 0 && (
            <>
              {/* Moderate */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="donut-moderate"
                strokeDasharray={`${moderateLength} ${
                  circumference - moderateLength
                }`}
                strokeDashoffset="0"
              />

              {/* Easy */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="donut-easy"
                strokeDasharray={`${easyLength} ${
                  circumference - easyLength
                }`}
                strokeDashoffset={-moderateLength}
              />

              {/* Hard */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="donut-hard"
                strokeDasharray={`${hardLength} ${
                  circumference - hardLength
                }`}
                strokeDashoffset={-(moderateLength + easyLength)}
              />
            </>
          )}
        </svg>

        <div className="donut-center">
          <strong>{total}</strong>
          <span>Assessed</span>
        </div>
      </div>

      <div className="difficulty-legend">
        <div>
          <span className="legend-dot moderate-dot" />
          <span>Moderate:</span>
          <strong>{moderate}%</strong>
        </div>

        <div>
          <span className="legend-dot easy-dot" />
          <span>Easy:</span>
          <strong>{easy}%</strong>
        </div>

        <div>
          <span className="legend-dot hard-dot" />
          <span>Hard:</span>
          <strong>{hard}%</strong>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ANALYTICS PAGE
========================================================= */

export default function Analytics() {
  const [selectedRoomId, setSelectedRoomId] = useState("all");
  const [period, setPeriod] = useState("Last 6 Months");
  const [examRooms, setExamRooms] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("teacherToken");
      if (!token) {
        setError("Teacher authentication required. Please sign in to view analytics.");
        setLoading(false);
        return;
      }

      const res = await axios.get("http://localhost:5000/api/teacher/analytics", {
        params: {
          examRoomId: selectedRoomId,
          period: period,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data && res.data.success) {
        const payload = res.data.data;
        setAnalyticsData(payload);
        if (payload.examRooms && Array.isArray(payload.examRooms)) {
          setExamRooms(payload.examRooms);
        }
      } else {
        setError(res.data?.message || "Failed to load analytics data.");
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Network error while loading analytics."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedRoomId, period]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Derive display values from current state & loaded analyticsData
  const isAll = !selectedRoomId || selectedRoomId === "all";

  const bannerTitle = isAll
    ? "All Exam Rooms (Consolidated)"
    : analyticsData?.subject?.name || "Exam Room Viva Analytics";

  const bannerSubtitle = isAll
    ? "Consolidated performance and AI viva evaluation metrics across all courses"
    : `${analyticsData?.subject?.code || "N/A"} • Room #${
        analyticsData?.subject?.roomCode || ""
      }`;

  const overview = analyticsData?.overview || {
    sessions: 0,
    scheduledNextWeek: 0,
    averageScore: 0,
    passRate: 0,
    duration: 0,
  };

  const topics = analyticsData?.topics || [];
  const students = analyticsData?.students || [];

  return (
    <div className="app-shell analytics-shell">
      <Sidebar />

      <div className="main-area">
        <main className="analytics-content">
          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <div className="analytics-header">
            <div>
              <h1>Analytics Overview</h1>
              <p>
                Subject-wise academic performance and AI viva evaluation
                metrics.
              </p>
            </div>

            <div className="analytics-controls">
              {/* EXAM ROOM / SUBJECT SELECTOR */}
              <div className="analytics-select">
                <BookOpenIcon />
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  disabled={loading && !analyticsData}
                >
                  <option value="all">All Exam Rooms (Consolidated)</option>
                  {examRooms.map((room) => {
                    const rId = room.id || room._id;
                    return (
                      <option key={rId} value={rId}>
                        {room.courseName} ({room.courseCode} • #{room.roomCode})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown size={13} />
              </div>

              {/* TIMELINE PERIOD SELECTOR */}
              <div className="analytics-select">
                <CalendarDays size={13} />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  disabled={loading && !analyticsData}
                >
                  <option value="Last 6 Months">Last 6 Months</option>
                  <option value="Last 3 Months">Last 3 Months</option>
                  <option value="Last Month">Last Month</option>
                  <option value="This Semester">This Semester</option>
                  <option value="This Year">This Year</option>
                  <option value="All Time">All Time</option>
                </select>
                <ChevronDown size={13} />
              </div>

              {/* REFRESH BUTTON */}
              <button
                className="analytics-refresh-button"
                onClick={fetchAnalyticsData}
                disabled={loading}
                title="Refresh Analytics"
              >
                <RefreshCw size={14} className={loading ? "spin" : ""} />
              </button>
            </div>
          </div>

          {/* ERROR ALERT BANNER */}
          {error && (
            <div className="analytics-error-banner">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
              <button
                className="analytics-retry-btn"
                onClick={fetchAnalyticsData}
              >
                Retry
              </button>
            </div>
          )}

          {/* =================================================
              SUBJECT BANNER
          ================================================= */}

          <div className="subject-banner">
            <div className="subject-banner-icon">
              <GraduationCap size={18} />
            </div>

            <div>
              <strong>{bannerTitle}</strong>
              <span>{bannerSubtitle}</span>
            </div>

            <div className="subject-banner-period">{period}</div>
          </div>

          {/* =================================================
              STAT CARDS
          ================================================= */}

          <section className="analytics-stats">
            <div className="analytics-stat-card">
              <div className="analytics-stat-icon purple">
                <FolderOpen size={17} />
              </div>

              <div>
                <span>Total Sessions Conducted</span>
                <strong>{overview.sessions}</strong>
                <small>
                  +{overview.scheduledNextWeek} scheduled next week
                </small>
              </div>
            </div>

            <div className="analytics-stat-card">
              <div className="analytics-stat-icon teal">
                <BarChart3 size={17} />
              </div>

              <div>
                <span>Overall Average Score</span>
                <strong>{overview.averageScore}%</strong>
                <small>
                  {overview.averageScore >= 50
                    ? "Syllabus standards met"
                    : overview.sessions === 0
                    ? "Awaiting completed sessions"
                    : "Below passing threshold"}
                </small>
              </div>
            </div>

            <div className="analytics-stat-card">
              <div className="analytics-stat-icon green">
                <TrendingUp size={17} />
              </div>

              <div>
                <span>Student Pass Rate</span>
                <strong>{overview.passRate}%</strong>
                <small>
                  {overview.passRate >= 70
                    ? "Standard oral delivery"
                    : overview.sessions === 0
                    ? "Awaiting evaluations"
                    : "Requires review"}
                </small>
              </div>
            </div>

            <div className="analytics-stat-card">
              <div className="analytics-stat-icon orange">
                <Clock3 size={17} />
              </div>

              <div>
                <span>Average Session Duration</span>
                <strong>{overview.duration} min</strong>
                <small>
                  {overview.duration > 0
                    ? "Optimized prompt timing"
                    : "No session logs"}
                </small>
              </div>
            </div>
          </section>

          {/* =================================================
              TOP ROW
          ================================================= */}

          <section className="analytics-grid-top">
            {/* SCORE BY TOPIC */}
            <div className="analytics-card topic-card">
              <div className="analytics-card-header">
                <div>
                  <h2>Score Distribution by Topic</h2>
                  <p>
                    Average student performance across {bannerTitle} topics.
                  </p>
                </div>
              </div>

              <div className="topic-list">
                {topics.length > 0 ? (
                  topics.map((topic) => (
                    <div className="topic-row" key={topic.name}>
                      <div className="topic-row-header">
                        <span>{topic.name}</span>
                        <strong>{topic.score}%</strong>
                      </div>

                      <div className="topic-progress">
                        <div
                          className={`topic-progress-value ${
                            topic.score >= 80
                              ? "high"
                              : topic.score >= 60
                              ? "medium"
                              : "low"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, topic.score)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="analytics-no-data-hint">
                    No topic evaluation data recorded for completed sessions in
                    this period.
                  </div>
                )}
              </div>
            </div>

            {/* PERFORMANCE TREND */}
            <div className="analytics-card trend-card">
              <div className="analytics-card-header">
                <div>
                  <h2>Performance Trend Over Time</h2>
                  <p>Average viva score progression.</p>
                </div>

                <LineChart size={17} />
              </div>

              <TrendChart trend={analyticsData?.trend} />
            </div>
          </section>

          {/* =================================================
              BOTTOM ROW
          ================================================= */}

          <section className="analytics-grid-bottom">
            {/* DIFFICULTY DISTRIBUTION */}
            <div className="analytics-card difficulty-card">
              <div className="analytics-card-header">
                <div>
                  <h2>Difficulty Distribution</h2>
                  <p>Questions used during viva sessions.</p>
                </div>
              </div>

              <DifficultyChart difficulty={analyticsData?.difficulty} />
            </div>

            {/* TOP STUDENTS LEADERBOARD */}
            <div className="analytics-card students-performance-card">
              <div className="analytics-card-header">
                <div>
                  <h2>Top Performing Students</h2>
                  <p>Highest average scores in this exam room / subject.</p>
                </div>

                <Users size={17} />
              </div>

              <div className="performance-table-wrapper">
                {students.length > 0 ? (
                  <table className="performance-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Name</th>
                        <th>Average Score</th>
                        <th>Sessions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {students.map((student) => (
                        <tr key={student.rank}>
                          <td>
                            <span className="rank">#{student.rank}</span>
                          </td>

                          <td>
                            <div className="student-name">
                              <div className="student-avatar">
                                {student.name
                                  ? student.name
                                      .split(" ")
                                      .filter(Boolean)
                                      .map((name) => name[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()
                                  : "ST"}
                              </div>

                              <span>{student.name}</span>
                            </div>
                          </td>

                          <td>
                            <strong className="student-score">
                              {student.score}%
                            </strong>
                          </td>

                          <td>
                            <span className="session-count">
                              {student.sessions}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="analytics-no-data-hint">
                    No student viva evaluations completed in this period.
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/* =========================================================
   SMALL ICON COMPONENT
========================================================= */

function BookOpenIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}