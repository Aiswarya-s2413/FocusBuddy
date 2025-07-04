import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';
import { adminAxios } from '../../utils/axios';
import { 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  Activity,
  RefreshCw,
  Loader2,
  AlertCircle 
} from 'lucide-react';

const UsageGraph = ({ usageData: propUsageData }) => {
  const [usageData, setUsageData] = useState(propUsageData || null);
  const [loading, setLoading] = useState(!propUsageData);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [chartType, setChartType] = useState('line');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch usage data from backend
  const fetchUsageData = async (period = 'daily') => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await adminAxios.get('/usage-graph/', {
        params: { period }
      });
      
      setUsageData(response.data);
      setSelectedPeriod(period);
    } catch (err) {
      console.error('Error fetching usage data:', err);
      setError(err.response?.data?.error || 'Failed to fetch usage data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle period change
  const handlePeriodChange = (period) => {
    if (period !== selectedPeriod) {
      fetchUsageData(period);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsageData(selectedPeriod);
  };

  // Initialize component
  useEffect(() => {
    if (!propUsageData) {
      fetchUsageData();
    } else {
      setUsageData(propUsageData);
      setSelectedPeriod(propUsageData.period || 'daily');
    }
  }, [propUsageData]);

  // Data validation and sanitization
  const sanitizeData = (data) => {
    if (!data || !Array.isArray(data)) return [];
    
    return data.filter(item => item != null).map(item => ({
      ...item,
      sessions: typeof item.sessions === 'number' ? item.sessions : 0,
      hours: typeof item.hours === 'number' ? item.hours : 0,
      day: item.day || '',
      week: item.week || ''
    }));
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) {
      return null;
    }
    
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-2">{label || 'N/A'}</p>
        {payload.filter(entry => entry && entry.value != null).map((entry, index) => (
          <p key={`${entry.dataKey}-${index}`} className="text-sm" style={{ color: entry.color }}>
            {entry.name || entry.dataKey}: {entry.value}
            {entry.dataKey === 'hours' && ' hours'}
            {entry.dataKey === 'sessions' && ' sessions'}
          </p>
        ))}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading usage data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-2">Error Loading Data</p>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchUsageData(selectedPeriod)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Sanitize and validate chart data
  const chartData = sanitizeData(usageData?.data);

  // No data state - check after sanitization
  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No usage data available</p>
        </div>
      </div>
    );
  }

  // Safe calculation functions
  const calculateTotal = (field) => {
    return chartData.reduce((sum, item) => sum + (item[field] || 0), 0);
  };

  const calculateAverage = (field) => {
    if (chartData.length === 0) return 0;
    return calculateTotal(field) / chartData.length;
  };

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        {/* Period Selection */}
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 mr-2">Period:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handlePeriodChange('daily')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedPeriod === 'daily'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => handlePeriodChange('weekly')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedPeriod === 'weekly'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        {/* Chart Type and Refresh */}
        <div className="flex items-center space-x-4">
          {/* Chart Type Selection */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Chart:</span>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="area">Area Chart</option>
              <option value="composed">Combined Chart</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-md transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {(() => {
            // Ensure we have valid data before rendering any chart
            if (!chartData || chartData.length === 0) {
              return <div className="flex items-center justify-center h-full text-gray-500">No data to display</div>;
            }

            const commonProps = {
              data: chartData,
              margin: { top: 5, right: 30, left: 20, bottom: 5 }
            };

            switch (chartType) {
              case 'line':
                return (
                  <LineChart {...commonProps}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey={selectedPeriod === 'daily' ? 'day' : 'week'} 
                      tick={{ fontSize: 12 }}
                      stroke="#666"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sessions"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                      name="Sessions"
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                      name="Hours"
                      connectNulls={false}
                    />
                  </LineChart>
                );

              case 'bar':
                return (
                  <BarChart {...commonProps}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey={selectedPeriod === 'daily' ? 'day' : 'week'} 
                      tick={{ fontSize: 12 }}
                      stroke="#666"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="sessions" fill="#3b82f6" name="Sessions" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="hours" fill="#10b981" name="Hours" radius={[4, 4, 0, 0]} />
                  </BarChart>
                );

              case 'area':
                return (
                  <AreaChart {...commonProps}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey={selectedPeriod === 'daily' ? 'day' : 'week'} 
                      tick={{ fontSize: 12 }}
                      stroke="#666"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="sessions"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      name="Sessions"
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stackId="2"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                      name="Hours"
                      connectNulls={false}
                    />
                  </AreaChart>
                );

              case 'composed':
                return (
                  <ComposedChart {...commonProps}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey={selectedPeriod === 'daily' ? 'day' : 'week'} 
                      tick={{ fontSize: 12 }}
                      stroke="#666"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="sessions" fill="#3b82f6" name="Sessions" radius={[4, 4, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      name="Hours"
                      connectNulls={false}
                    />
                  </ComposedChart>
                );

              default:
                return <div className="flex items-center justify-center h-full text-gray-500">Invalid chart type</div>;
            }
          })()}
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Sessions</p>
              <p className="text-2xl font-bold text-blue-900">
                {calculateTotal('sessions')}
              </p>
            </div>
            <Activity className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Total Hours</p>
              <p className="text-2xl font-bold text-green-900">
                {calculateTotal('hours').toFixed(1)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Avg Sessions/Day</p>
              <p className="text-2xl font-bold text-purple-900">
                {calculateAverage('sessions').toFixed(1)}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Avg Hours/Day</p>
              <p className="text-2xl font-bold text-orange-900">
                {calculateAverage('hours').toFixed(1)}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageGraph;