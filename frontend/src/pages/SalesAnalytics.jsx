import { useState, useEffect } from "react";
import { useToast } from "../components/ToastContainer";
import "./SalesAnalytics.css";

export default function SalesAnalytics() {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [chartType, setChartType] = useState("line"); // line or bar

  // Set default dates (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  // Load analytics data
  useEffect(() => {
    if (startDate && endDate) {
      loadAnalytics();
    }
    // eslint-disable-next-line
  }, [startDate, endDate]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      });

      const response = await fetch(
        `http://localhost:8000/api/orders/analytics/?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load analytics");
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      showError(error.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  function handleDateChange() {
    if (startDate && endDate) {
      loadAnalytics();
    }
  }

  if (loading && !analytics) {
    return (
      <div className="sales-analytics">
        <div className="analytics-header">
          <h1>Sales Analytics</h1>
        </div>
        <div className="loading-message">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="sales-analytics">
        <div className="analytics-header">
          <h1>Sales Analytics</h1>
        </div>
        <div className="error-message">No analytics data available</div>
      </div>
    );
  }

  const { summary, time_series } = analytics;

  // Calculate max value for chart scaling
  const maxRevenue = Math.max(...time_series.map(d => d.revenue), 0);
  const maxProfit = Math.max(...time_series.map(d => d.profit), 0);
  const maxValue = Math.max(maxRevenue, maxProfit);

  return (
    <div className="sales-analytics">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <h1>Sales Analytics Dashboard</h1>
          <p className="analytics-subtitle">
            Revenue and profit analysis for your store
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="date-range-picker">
          <label>
            From:
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label>
            To:
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          <button className="btn-primary" onClick={handleDateChange}>
            Update
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card revenue-card">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3>Total Revenue</h3>
            <p className="card-value">${summary.total_revenue.toFixed(2)}</p>
            <span className="card-detail">{summary.total_orders} orders</span>
          </div>
        </div>

        <div className="summary-card profit-card">
          <div className="card-icon">📈</div>
          <div className="card-content">
            <h3>Total Profit</h3>
            <p className="card-value">${summary.total_profit.toFixed(2)}</p>
            <span className="card-detail">
              {summary.profit_margin.toFixed(1)}% margin
            </span>
          </div>
        </div>

        <div className="summary-card cost-card">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <h3>Total Cost</h3>
            <p className="card-value">${summary.total_cost.toFixed(2)}</p>
            <span className="card-detail">50% of revenue</span>
          </div>
        </div>

        <div className="summary-card orders-card">
          <div className="card-icon">📦</div>
          <div className="card-content">
            <h3>Average Order Value</h3>
            <p className="card-value">${summary.average_order_value.toFixed(2)}</p>
            <span className="card-detail">{summary.total_orders} total orders</span>
          </div>
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div className="status-breakdown">
        <h2>Order Status Breakdown</h2>
        <div className="status-cards">
          <div className="status-card status-delivered">
            <span className="status-count">{summary.delivered_orders}</span>
            <span className="status-label">Delivered</span>
          </div>
          <div className="status-card status-processing">
            <span className="status-count">{summary.processing_orders}</span>
            <span className="status-label">Processing</span>
          </div>
          <div className="status-card status-transit">
            <span className="status-count">{summary.in_transit_orders}</span>
            <span className="status-label">In Transit</span>
          </div>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="chart-controls">
        <h2>Revenue & Profit Over Time</h2>
        <div className="chart-type-selector">
          <button
            className={chartType === "line" ? "active" : ""}
            onClick={() => setChartType("line")}
          >
            Line Chart
          </button>
          <button
            className={chartType === "bar" ? "active" : ""}
            onClick={() => setChartType("bar")}
          >
            Bar Chart
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="chart-container">
        {time_series.length === 0 ? (
          <div className="no-data-message">
            No data available for the selected date range
          </div>
        ) : chartType === "line" ? (
          <LineChart data={time_series} maxValue={maxValue} />
        ) : (
          <BarChart data={time_series} maxValue={maxValue} />
        )}
      </div>

      {/* Data Table */}
      <div className="data-table-container">
        <h2>Daily Breakdown</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Orders</th>
              <th>Revenue</th>
              <th>Cost</th>
              <th>Profit</th>
              <th>Margin</th>
            </tr>
          </thead>
          <tbody>
            {time_series.map((day) => (
              <tr key={day.date}>
                <td>{new Date(day.date).toLocaleDateString()}</td>
                <td>{day.orders}</td>
                <td className="revenue-cell">${day.revenue.toFixed(2)}</td>
                <td className="cost-cell">${day.cost.toFixed(2)}</td>
                <td className="profit-cell">${day.profit.toFixed(2)}</td>
                <td className="margin-cell">
                  {((day.profit / day.revenue) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td>Total</td>
              <td>{summary.total_orders}</td>
              <td className="revenue-cell">${summary.total_revenue.toFixed(2)}</td>
              <td className="cost-cell">${summary.total_cost.toFixed(2)}</td>
              <td className="profit-cell">${summary.total_profit.toFixed(2)}</td>
              <td className="margin-cell">{summary.profit_margin.toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// Simple Line Chart Component
function LineChart({ data, maxValue }) {
  const height = 300;
  const width = 800;
  const padding = 40;

  if (data.length === 0) return null;

  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  // Calculate points
  const revenuePoints = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - (d.revenue / maxValue) * chartHeight;
    return { x, y };
  });

  const profitPoints = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - (d.profit / maxValue) * chartHeight;
    return { x, y };
  });

  const revenueLine = revenuePoints.map((p, i) =>
    i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
  ).join(" ");

  const profitLine = profitPoints.map((p, i) =>
    i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
  ).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((percent) => {
        const y = padding + chartHeight * (1 - percent);
        return (
          <g key={percent}>
            <line
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text x={padding - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">
              ${(maxValue * percent).toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* Revenue line */}
      <path
        d={revenueLine}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Profit line */}
      <path
        d={profitLine}
        fill="none"
        stroke="#10b981"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {revenuePoints.map((p, i) => (
        <circle
          key={`r-${i}`}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="#3b82f6"
        />
      ))}

      {profitPoints.map((p, i) => (
        <circle
          key={`p-${i}`}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="#10b981"
        />
      ))}

      {/* Legend */}
      <g transform={`translate(${width - 150}, 20)`}>
        <rect x="0" y="0" width="15" height="3" fill="#3b82f6" />
        <text x="20" y="5" fontSize="12" fill="#374151">Revenue</text>

        <rect x="0" y="15" width="15" height="3" fill="#10b981" />
        <text x="20" y="20" fontSize="12" fill="#374151">Profit</text>
      </g>
    </svg>
  );
}

// Simple Bar Chart Component
function BarChart({ data, maxValue }) {
  const height = 300;
  const width = 800;
  const padding = 40;

  if (data.length === 0) return null;

  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  const barWidth = chartWidth / (data.length * 2.5);
  const barGap = barWidth * 0.3;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((percent) => {
        const y = padding + chartHeight * (1 - percent);
        return (
          <g key={percent}>
            <line
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text x={padding - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">
              ${(maxValue * percent).toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const x = padding + (i / data.length) * chartWidth + barGap;
        const revenueHeight = (d.revenue / maxValue) * chartHeight;
        const profitHeight = (d.profit / maxValue) * chartHeight;

        return (
          <g key={i}>
            {/* Revenue bar */}
            <rect
              x={x}
              y={padding + chartHeight - revenueHeight}
              width={barWidth}
              height={revenueHeight}
              fill="#3b82f6"
              opacity="0.8"
            />

            {/* Profit bar */}
            <rect
              x={x + barWidth + barGap / 2}
              y={padding + chartHeight - profitHeight}
              width={barWidth}
              height={profitHeight}
              fill="#10b981"
              opacity="0.8"
            />
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${width - 150}, 20)`}>
        <rect x="0" y="0" width="15" height="15" fill="#3b82f6" opacity="0.8" />
        <text x="20" y="12" fontSize="12" fill="#374151">Revenue</text>

        <rect x="0" y="20" width="15" height="15" fill="#10b981" opacity="0.8" />
        <text x="20" y="32" fontSize="12" fill="#374151">Profit</text>
      </g>
    </svg>
  );
}
