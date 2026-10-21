import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Clock3,
  FolderOpen,
  GraduationCap,
  LineChart,
  TrendingUp,
  Users,
} from "lucide-react";

import Sidebar from "../../dashboard/components/Sidebar";

import "../styles/analytics.css";

/* =========================================================
   SUBJECT DATA
========================================================= */

const subjectData = {
  "Computer Networks": {
    code: "CS-401",

    overview: {
      sessions: 24,
      scheduledNextWeek: 3,
      averageScore: 78,
      passRate: 91,
      duration: 18,
    },

    topics: [
      {
        name: "Transport Layer",
        score: 86,
      },
      {
        name: "Routing Algorithms",
        score: 72,
      },
      {
        name: "TCP/IP Protocols",
        score: 81,
      },
      {
        name: "Network Security",
        score: 64,
      },
      {
        name: "Congestion Control",
        score: 78,
      },
    ],

    trend: [68, 74, 79, 71, 83, 88],

    difficulty: {
      total: 186,
      moderate: 45,
      easy: 33,
      hard: 22,
    },

    students: [
      {
        rank: 1,
        name: "Albert Einstein",
        score: 96.4,
        sessions: "4 of 4 Completed",
      },
      {
        rank: 2,
        name: "Marie Curie",
        score: 94.8,
        sessions: "4 of 4 Completed",
      },
      {
        rank: 3,
        name: "Grace Hopper",
        score: 91.2,
        sessions: "3 of 4 Completed",
      },
    ],
  },

  "Data Structures": {
    code: "CS-202",

    overview: {
      sessions: 18,
      scheduledNextWeek: 2,
      averageScore: 82,
      passRate: 94,
      duration: 16,
    },

    topics: [
      {
        name: "Arrays & Linked Lists",
        score: 91,
      },
      {
        name: "Trees & BST Graphs",
        score: 84,
      },
      {
        name: "Sorting & Searching",
        score: 88,
      },
      {
        name: "Hash Tables",
        score: 76,
      },
      {
        name: "Graph Algorithms",
        score: 81,
      },
    ],

    trend: [72, 78, 81, 79, 87, 91],

    difficulty: {
      total: 142,
      moderate: 42,
      easy: 36,
      hard: 22,
    },

    students: [
      {
        rank: 1,
        name: "Albert Einstein",
        score: 98.1,
        sessions: "4 of 4 Completed",
      },
      {
        rank: 2,
        name: "Marie Curie",
        score: 95.3,
        sessions: "4 of 4 Completed",
      },
      {
        rank: 3,
        name: "Alan Turing",
        score: 92.7,
        sessions: "4 of 4 Completed",
      },
    ],
  },

  "Artificial Intelligence": {
    code: "CS-480",

    overview: {
      sessions: 15,
      scheduledNextWeek: 2,
      averageScore: 84,
      passRate: 96,
      duration: 21,
    },

    topics: [
      {
        name: "Machine Learning",
        score: 89,
      },
      {
        name: "Search Algorithms",
        score: 83,
      },
      {
        name: "Neural Networks",
        score: 86,
      },
      {
        name: "Natural Language Processing",
        score: 74,
      },
      {
        name: "Computer Vision",
        score: 80,
      },
    ],

    trend: [75, 79, 84, 82, 89, 93],

    difficulty: {
      total: 124,
      moderate: 48,
      easy: 30,
      hard: 22,
    },

    students: [
      {
        rank: 1,
        name: "Grace Hopper",
        score: 97.6,
        sessions: "4 of 4 Completed",
      },
      {
        rank: 2,
        name: "Alan Turing",
        score: 95.1,
        sessions: "4 of 4 Completed",
      },
      {
        rank: 3,
        name: "Marie Curie",
        score: 93.8,
        sessions: "3 of 3 Completed",
      },
    ],
  },
};

/* =========================================================
   TREND CHART
========================================================= */

function TrendChart({ values }) {
  const width = 560;
  const height = 190;

  const paddingLeft = 20;
  const paddingRight = 20;
  const paddingTop = 18;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const min = Math.min(...values) - 5;
  const max = Math.max(...values) + 5;

  const points = values.map((value, index) => {
    const x =
      paddingLeft +
      (index * chartWidth) / (values.length - 1);

    const y =
      paddingTop +
      ((max - value) / (max - min)) * chartHeight;

    return {
      x,
      y,
      value,
    };
  });

  const path = points
    .map((point, index) => {
      return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
    })
    .join(" ");

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

  return (
    <div className="trend-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="trend-svg"
        preserveAspectRatio="none"
      >
        {/* Horizontal grid lines */}
        {[0, 1, 2, 3, 4].map((line) => {
          const y =
            paddingTop +
            (line * chartHeight) / 4;

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
        <path
          d={path}
          className="trend-path"
          fill="none"
        />

        {/* Points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3.5"
            className="trend-point"
          />
        ))}
      </svg>

      <div className="trend-labels">
        {months.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   DIFFICULTY DONUT
========================================================= */

function DifficultyChart({ difficulty }) {
  const {
    total,
    moderate,
    easy,
    hard,
  } = difficulty;

  const radius = 55;
  const circumference = 2 * Math.PI * radius;

  const moderateLength =
    (moderate / 100) * circumference;

  const easyLength =
    (easy / 100) * circumference;

  const hardLength =
    (hard / 100) * circumference;

  return (
    <div className="difficulty-chart-wrapper">

      <div className="donut-chart">

        <svg
          viewBox="0 0 140 140"
          className="donut-svg"
        >
          <circle
            cx="70"
            cy="70"
            r={radius}
            className="donut-background"
          />

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
            strokeDashoffset={
              -(moderateLength + easyLength)
            }
          />
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
  const [selectedSubject, setSelectedSubject] =
    useState("Computer Networks");

  const [period, setPeriod] =
    useState("Last 6 Months");

  const data = useMemo(() => {
    return subjectData[selectedSubject];
  }, [selectedSubject]);

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
                Subject-wise academic performance and
                AI viva evaluation metrics.
              </p>
            </div>

            <div className="analytics-controls">

              {/* SUBJECT */}
              <div className="analytics-select">

                <BookOpenIcon />

                <select
                  value={selectedSubject}
                  onChange={(e) =>
                    setSelectedSubject(e.target.value)
                  }
                >
                  {Object.keys(subjectData).map(
                    (subject) => (
                      <option
                        key={subject}
                        value={subject}
                      >
                        {subject}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown size={13} />
              </div>

              {/* PERIOD */}
              <div className="analytics-select">

                <CalendarDays size={13} />

                <select
                  value={period}
                  onChange={(e) =>
                    setPeriod(e.target.value)
                  }
                >
                  <option>Last 6 Months</option>
                  <option>Last 3 Months</option>
                  <option>Last Month</option>
                  <option>This Semester</option>
                  <option>This Year</option>
                </select>

                <ChevronDown size={13} />

              </div>

            </div>

          </div>

          {/* =================================================
              SUBJECT BANNER
          ================================================= */}

          <div className="subject-banner">

            <div className="subject-banner-icon">
              <GraduationCap size={18} />
            </div>

            <div>
              <strong>{selectedSubject}</strong>

              <span>
                {data.code} • Subject-wise Analytics
              </span>
            </div>

            <div className="subject-banner-period">
              {period}
            </div>

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

                <strong>
                  {data.overview.sessions}
                </strong>

                <small>
                  +{data.overview.scheduledNextWeek}
                  {" "}scheduled next week
                </small>
              </div>

            </div>

            <div className="analytics-stat-card">

              <div className="analytics-stat-icon teal">
                <BarChart3 size={17} />
              </div>

              <div>
                <span>Overall Average Score</span>

                <strong>
                  {data.overview.averageScore}%
                </strong>

                <small>
                  Syllabus standards met
                </small>
              </div>

            </div>

            <div className="analytics-stat-card">

              <div className="analytics-stat-icon green">
                <TrendingUp size={17} />
              </div>

              <div>
                <span>Student Pass Rate</span>

                <strong>
                  {data.overview.passRate}%
                </strong>

                <small>
                  Highly standard oral delivery
                </small>
              </div>

            </div>

            <div className="analytics-stat-card">

              <div className="analytics-stat-icon orange">
                <Clock3 size={17} />
              </div>

              <div>
                <span>Average Session Duration</span>

                <strong>
                  {data.overview.duration} min
                </strong>

                <small>
                  Optimized prompt timing
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
                  <h2>
                    Score Distribution by Topic
                  </h2>

                  <p>
                    Average student performance across
                    {selectedSubject} topics.
                  </p>
                </div>

              </div>

              <div className="topic-list">

                {data.topics.map((topic) => (
                  <div
                    className="topic-row"
                    key={topic.name}
                  >

                    <div className="topic-row-header">

                      <span>
                        {topic.name}
                      </span>

                      <strong>
                        {topic.score}%
                      </strong>

                    </div>

                    <div className="topic-progress">

                      <div
                        className={`topic-progress-value ${
                          topic.score >= 85
                            ? "high"
                            : topic.score >= 75
                            ? "medium"
                            : "low"
                        }`}
                        style={{
                          width: `${topic.score}%`,
                        }}
                      />

                    </div>

                  </div>
                ))}

              </div>

            </div>

            {/* TREND */}

            <div className="analytics-card trend-card">

              <div className="analytics-card-header">

                <div>
                  <h2>
                    Performance Trend Over Time
                  </h2>

                  <p>
                    Average viva score by month.
                  </p>
                </div>

                <LineChart size={17} />

              </div>

              <TrendChart
                values={data.trend}
              />

            </div>

          </section>

          {/* =================================================
              BOTTOM ROW
          ================================================= */}

          <section className="analytics-grid-bottom">

            {/* DIFFICULTY */}

            <div className="analytics-card difficulty-card">

              <div className="analytics-card-header">

                <div>
                  <h2>
                    Difficulty Distribution
                  </h2>

                  <p>
                    Questions used during {selectedSubject}
                    {" "}viva sessions.
                  </p>
                </div>

              </div>

              <DifficultyChart
                difficulty={data.difficulty}
              />

            </div>

            {/* TOP STUDENTS */}

            <div className="analytics-card students-performance-card">

              <div className="analytics-card-header">

                <div>
                  <h2>
                    Top Performing Students
                  </h2>

                  <p>
                    Highest average scores in this subject.
                  </p>
                </div>

                <Users size={17} />

              </div>

              <div className="performance-table-wrapper">

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

                    {data.students.map((student) => (
                      <tr key={student.rank}>

                        <td>
                          <span className="rank">
                            #{student.rank}
                          </span>
                        </td>

                        <td>
                          <div className="student-name">
                            <div className="student-avatar">
                              {student.name
                                .split(" ")
                                .map((name) =>
                                  name[0]
                                )
                                .join("")
                                .slice(0, 2)}
                            </div>

                            <span>
                              {student.name}
                            </span>
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