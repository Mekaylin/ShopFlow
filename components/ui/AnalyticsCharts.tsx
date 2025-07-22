
import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Svg, { G, Path, Polyline, Rect, Line as SvgLine, Text as SvgText } from 'react-native-svg';

interface AnalyticsChartsProps {
  performanceData: { date: string; value: number }[];
  materialUsageData: { material: string; used: number }[];
  attendanceData: { date: string; present: number; absent: number }[];
}

/**
 * AnalyticsCharts - shows bar, line, and pie charts for analytics & trends.
 * Usage:
 * <AnalyticsCharts performanceData={...} materialUsageData={...} attendanceData={...} />
 */
export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  performanceData,
  materialUsageData,
  attendanceData,
}) => {
  // Filter tab state
  const [filterTab, setFilterTab] = useState<'day' | 'week' | 'month'>('day');

  // Date range calculation
  const today = new Date();
  let startDate = today;
  if (filterTab === 'week') {
    startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay()); // Sunday
  } else if (filterTab === 'month') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  }
  // Helper: is date in range
  const inRange = (dateStr: string | undefined) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= startDate && d <= today;
  };

  // Filtered data
  const filteredPerformance = performanceData.filter(d => inRange(d.date));
  const filteredAttendance = attendanceData.filter(d => inRange(d.date));
  // For material usage, assume each entry is for a task with a date, so filter by date if available
  // If materialUsageData has no date, use all
  // If it does, filter by date
  const filteredMaterialUsage = materialUsageData[0] && 'date' in materialUsageData[0]
    ? (materialUsageData as any[]).filter((d: any) => inRange(d.date))
    : materialUsageData;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  // Responsive chart width
  const [chartWidth, setChartWidth] = useState(0);
  const perfHeight = 220, otherHeight = 160, padding = 32;

  // Only render charts after width is known
  const onLayout = (e: LayoutChangeEvent) => {
    if (e.nativeEvent.layout.width !== chartWidth) {
      setChartWidth(e.nativeEvent.layout.width);
    }
  };

  // Performance line chart points
  const maxPerf = Math.max(...filteredPerformance.map(d => d.value), 1);
  const pointsArr = filteredPerformance.map((d, i) => {
    const x = padding + (i * (chartWidth - 2 * padding)) / (filteredPerformance.length - 1 || 1);
    const y = perfHeight - padding - ((d.value / maxPerf) * (perfHeight - 2 * padding));
    return `${x},${y}`;
  });
  const points = pointsArr.join(' ');
  // Attendance bar chart
  const maxAtt = Math.max(...filteredAttendance.map(d => d.present + d.absent), 1);
  // Material usage pie chart
  const totalUsed = filteredMaterialUsage.reduce((a, b) => a + b.used, 0) || 1;
  // Material usage for today (horizontal bar chart)
  const todayMaterialUsage: { material: string; used: number }[] = filteredMaterialUsage;
  const maxMaterialUsed = Math.max(...todayMaterialUsage.map((d: { used: number }) => d.used), 1);
  let acc = 0;
  const pieCenter = 140, pieRadius = 110;
  const pieSlices = filteredMaterialUsage.map((d, i) => {
    const startAngle = (acc / totalUsed) * 2 * Math.PI;
    acc += d.used;
    const endAngle = (acc / totalUsed) * 2 * Math.PI;
    const midAngle = (startAngle + endAngle) / 2;
    const x1 = pieCenter + pieRadius * Math.cos(startAngle - Math.PI / 2);
    const y1 = pieCenter + pieRadius * Math.sin(startAngle - Math.PI / 2);
    const x2 = pieCenter + pieRadius * Math.cos(endAngle - Math.PI / 2);
    const y2 = pieCenter + pieRadius * Math.sin(endAngle - Math.PI / 2);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const color = ['#1976d2', '#4CAF50', '#FFD700', '#d32f2f', '#888'][i % 5];
    // Label position: centroid of the arc
    const labelRadius = pieRadius * 0.65;
    const labelX = pieCenter + labelRadius * Math.cos(midAngle - Math.PI / 2);
    const labelY = pieCenter + labelRadius * Math.sin(midAngle - Math.PI / 2);
    const percent = ((d.used / totalUsed) * 100).toFixed(0);
    return (
      <G key={d.material}>
        <Path
          d={`M${pieCenter},${pieCenter} L${x1},${y1} A${pieRadius},${pieRadius} 0 ${largeArc} 1 ${x2},${y2} Z`}
          fill={color}
          stroke="#fff"
          strokeWidth={1}
        />
        <SvgText
          x={labelX}
          y={labelY - 12}
          fontSize={16}
          fill="#fff"
          fontWeight="bold"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {d.material}
        </SvgText>
        <SvgText
          x={labelX}
          y={labelY + 14}
          fontSize={13}
          fill="#fff"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {`${d.used} (${percent}%)`}
        </SvgText>
      </G>
    );
  });

  return (
    <View style={styles.container} onLayout={onLayout}>
      {/* Filter tabs */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 8 }}>
        {['day', 'week', 'month'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={{
              backgroundColor: filterTab === tab ? '#1976d2' : '#e3f2fd',
              borderRadius: 16,
              paddingVertical: 6,
              paddingHorizontal: 18,
              marginHorizontal: 4,
            }}
            onPress={() => setFilterTab(tab as 'day' | 'week' | 'month')}
          >
            <Text style={{ color: filterTab === tab ? '#fff' : '#1976d2', fontWeight: 'bold', fontSize: 13, textTransform: 'capitalize' }}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.title}>Performance Trend</Text>
      {chartWidth > 0 && filteredPerformance.length > 0 && (
        <Svg width={chartWidth} height={perfHeight} style={{ marginBottom: 16 }}>
          <G>
            <SvgLine x1={padding} y1={perfHeight - padding} x2={chartWidth - padding} y2={perfHeight - padding} stroke="#888" strokeWidth={1} />
            <SvgLine x1={padding} y1={padding} x2={padding} y2={perfHeight - padding} stroke="#888" strokeWidth={1} />
            <Polyline points={points} fill="none" stroke="#1976d2" strokeWidth={2} />
          </G>
        </Svg>
      )}
      <Text style={styles.title}>Material Usage</Text>
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <Svg width={340} height={340} style={{ marginBottom: -40 }}>
          <G>
            {pieSlices}
          </G>
        </Svg>
      </View>
      <Text style={styles.title}>Material Usage ({filterTab.charAt(0).toUpperCase() + filterTab.slice(1)})</Text>
      {/* Horizontal bar chart for filtered material usage */}
      <Svg width={chartWidth || 320} height={Math.max(40 * todayMaterialUsage.length, 60)} style={{ marginBottom: 16 }}>
        {todayMaterialUsage.map((d: { material: string; used: number }, i: number) => {
          const barLength = ((chartWidth || 320) - 120) * (d.used / maxMaterialUsed);
          const y = 20 + i * 36;
          const color = ['#1976d2', '#4CAF50', '#FFD700', '#d32f2f', '#888'][i % 5];
          return (
            <G key={d.material}>
              <Rect x={100} y={y} width={barLength} height={24} fill={color} rx={8} />
              <SvgText x={90} y={y + 12} fontSize={12} fill="#1976d2" fontWeight="bold" textAnchor="end" alignmentBaseline="middle">{d.material}</SvgText>
              <SvgText x={110 + barLength} y={y + 12} fontSize={12} fill="#1976d2" fontWeight="bold" textAnchor="start" alignmentBaseline="middle">{d.used}</SvgText>
            </G>
          );
        })}
      </Svg>
      <Text style={styles.title}>Attendance</Text>
      {chartWidth > 0 && filteredAttendance.length > 0 && (
        <Svg width={chartWidth} height={otherHeight}>
          {/* Y-axis labels: min, mid, max */}
          <SvgText
            x={padding - 8}
            y={otherHeight - padding + 4}
            fontSize={9}
            fill="#888"
            textAnchor="end"
            alignmentBaseline="middle"
          >
            0
          </SvgText>
          <SvgText
            x={padding - 8}
            y={padding + ((otherHeight - 2 * padding) / 2)}
            fontSize={9}
            fill="#888"
            textAnchor="end"
            alignmentBaseline="middle"
          >
            {Math.round(maxAtt / 2)}
          </SvgText>
          <SvgText
            x={padding - 8}
            y={padding}
            fontSize={9}
            fill="#888"
            textAnchor="end"
            alignmentBaseline="middle"
          >
            {maxAtt}
          </SvgText>
          {filteredAttendance.map((d, i) => {
            const barW = 20;
            const x = padding + i * ((chartWidth - 2 * padding) / (filteredAttendance.length));
            // Histogram: stack present on top of absent
            const total = d.present + d.absent;
            const yTotal = otherHeight - padding - ((total / maxAtt) * (otherHeight - 2 * padding));
            const yAbsent = otherHeight - padding - ((d.absent / maxAtt) * (otherHeight - 2 * padding));
            const hAbsent = otherHeight - padding - yAbsent;
            const hPresent = yAbsent - yTotal;
            return (
              <G key={d.date}>
                {/* Absent (bottom) */}
                <Rect x={x} y={yAbsent} width={barW} height={hAbsent} fill="#d32f2f" />
                {/* Present (top) */}
                <Rect x={x} y={yTotal} width={barW} height={hPresent} fill="#4CAF50" />
                <SvgText x={x + barW / 2} y={otherHeight - 4} fontSize={10} fill="#888" textAnchor="middle">{d.date.slice(5)}</SvgText>
              </G>
            );
          })}
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
    marginTop: 8,
  },
});
