import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Dimensions,
} from 'react-native';
// Import charts only if available
// import { LineChart, ProgressChart, BarChart } from 'react-native-chart-kit';
import BatteryMonitoringService, { BatteryInfo, BatteryUsagePattern } from '../services/batteryMonitoring';
import ResourceMonitorService, { ResourceMetrics } from '../services/resourceMonitor';
import PowerStateManager, { PowerState, FeatureState, PowerStateChangeEvent } from '../services/powerStateManager';
import AdaptiveSyncEngine from '../services/adaptiveSyncEngine';
import BackgroundTaskManager from '../services/backgroundTaskManager';

interface PowerManagementDashboardProps {
  onClose?: () => void;
}

interface BatteryChartData {
  labels: string[];
  datasets: [
    {
      data: number[];
      color?: (opacity: number) => string;
      strokeWidth?: number;
    }
  ];
}

interface PerformanceData {
  cpu: number;
  memory: number;
  storage: number;
  thermal: number;
}

const PowerManagementDashboard: React.FC<PowerManagementDashboardProps> = ({ onClose }) => {
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo | null>(null);
  const [resourceMetrics, setResourceMetrics] = useState<ResourceMetrics | null>(null);
  const [powerState, setPowerState] = useState<PowerState>('optimal');
  const [batteryPattern, setBatteryPattern] = useState<BatteryUsagePattern | null>(null);
  const [chartData, setChartData] = useState<BatteryChartData | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'settings' | 'features'>('overview');

  // Services
  const batteryService = useMemo(() => BatteryMonitoringService.getInstance(), []);
  const resourceService = useMemo(() => ResourceMonitorService.getInstance(), []);
  const powerManager = useMemo(() => PowerStateManager.getInstance(), []);
  const syncEngine = useMemo(() => AdaptiveSyncEngine.getInstance(), []);
  const taskManager = useMemo(() => BackgroundTaskManager.getInstance(), []);

  useEffect(() => {
    // Initialize data
    setBatteryInfo(batteryService.getCurrentBatteryInfo());
    setResourceMetrics(resourceService.getCurrentMetrics());
    setPowerState(powerManager.getCurrentPowerState());

    // Set up listeners
    const batteryUnsubscribe = batteryService.addBatteryListener(setBatteryInfo);
    const resourceUnsubscribe = resourceService.addListener(setResourceMetrics);
    const powerUnsubscribe = powerManager.addPowerStateListener((event: PowerStateChangeEvent) => {
      setPowerState(event.current);
    });

    // Load analytics data
    loadAnalyticsData();

    return () => {
      batteryUnsubscribe();
      resourceUnsubscribe();
      powerUnsubscribe();
    };
  }, [batteryService, resourceService, powerManager]);

  const loadAnalyticsData = async () => {
    // Load battery usage pattern
    const pattern = batteryService.getBatteryUsagePattern();
    setBatteryPattern(pattern);

    // Generate chart data
    if (pattern) {
      generateChartData(pattern);
    }

    // Load current performance data
    const currentMetrics = resourceService.getCurrentMetrics();
    if (currentMetrics) {
      setPerformanceData({
        cpu: currentMetrics.cpu.usage,
        memory: (currentMetrics.memory.used / currentMetrics.memory.total) * 100,
        storage: (currentMetrics.storage.used / currentMetrics.storage.total) * 100,
        thermal: currentMetrics.thermal.temperature || 35,
      });
    }
  };

  const generateChartData = (pattern: BatteryUsagePattern) => {
    const now = new Date();
    const last24Hours = [];

    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      last24Hours.push(hour.getHours());
    }

    // Simulate battery data (in real app, this would come from the service)
    const batteryData = last24Hours.map(hour => {
      const hourlyData = pattern.peakUsageTimes.find(p => p.hour === hour);
      return hourlyData ? Math.max(20, 100 - hourlyData.consumption * 100) : Math.random() * 30 + 60;
    });

    setChartData({
      labels: last24Hours.map(hour => `${hour}:00`).filter((_, index) => index % 4 === 0),
      datasets: [
        {
          data: batteryData.filter((_, index) => index % 4 === 0),
          color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
          strokeWidth: 2,
        }
      ]
    });
  };

  const getBatteryColor = (level: number): string => {
    if (level <= 0.1) return '#e74c3c';
    if (level <= 0.2) return '#f39c12';
    if (level <= 0.5) return '#f1c40f';
    return '#2ecc71';
  };

  const getPowerStateColor = (state: PowerState): string => {
    switch (state) {
      case 'optimal': return '#2ecc71';
      case 'balanced': return '#3498db';
      case 'battery_saver': return '#f39c12';
      case 'critical': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const handleForcePowerState = (state: PowerState) => {
    Alert.alert(
      'Force Power State',
      `Are you sure you want to force ${state} power mode? This will override automatic optimizations.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            powerManager.forceProfile(state);
            Alert.alert('Success', `Power state changed to ${state}`);
          }
        }
      ]
    );
  };

  const renderOverviewTab = () => {
    if (!batteryInfo || !resourceMetrics) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading battery and performance data...</Text>
        </View>
      );
    }

    const currentProfile = powerManager.getCurrentProfile();

    return (
      <ScrollView style={styles.tabContent}>
        {/* Battery Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Battery Status</Text>
          <View style={styles.batteryHeader}>
            <View style={[styles.batteryIndicator, { backgroundColor: getBatteryColor(batteryInfo.level) }]}>
              <Text style={styles.batteryPercentage}>{Math.round(batteryInfo.level * 100)}%</Text>
            </View>
            <View style={styles.batteryDetails}>
              <Text style={styles.batteryStatus}>
                {batteryInfo.isCharging ? 'Charging' : batteryInfo.isLowPowerMode ? 'Low Power Mode' : 'Discharging'}
              </Text>
              {batteryInfo.temperature && (
                <Text style={styles.batteryTemp}>Temp: {batteryInfo.temperature}°C</Text>
              )}
              <Text style={styles.batteryHealth}>Health Score: {batteryService.getBatteryHealthScore()}%</Text>
            </View>
          </View>
        </View>

        {/* Power State Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Power Mode</Text>
          <View style={styles.powerStateContainer}>
            <View style={[styles.powerStateIndicator, { backgroundColor: getPowerStateColor(powerState) }]}>
              <Text style={styles.powerStateText}>{powerState.replace('_', ' ').toUpperCase()}</Text>
            </View>
            <Text style={styles.powerStateSavings}>{powerManager.getPowerSavingsEstimate()}</Text>
          </View>
          <Text style={styles.powerStateDescription}>
            {powerState === 'optimal' && 'Full performance with maximum features enabled'}
            {powerState === 'balanced' && 'Good performance with moderate power savings'}
            {powerState === 'battery_saver' && 'Reduced performance to maximize battery life'}
            {powerState === 'critical' && 'Minimal features to conserve critical battery'}
          </Text>
        </View>

        {/* Performance Metrics Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Performance Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>CPU Usage</Text>
              <Text style={[styles.metricValue, { color: resourceMetrics.cpu.usage > 80 ? '#e74c3c' : '#2ecc71' }]}>
                {resourceMetrics.cpu.usage.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Memory</Text>
              <Text style={[styles.metricValue, { color: resourceMetrics.memory.pressure === 'critical' ? '#e74c3c' : '#2ecc71' }]}>
                {resourceMetrics.memory.used}MB
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Thermal</Text>
              <Text style={[styles.metricValue, { color: resourceMetrics.thermal.state === 'critical' ? '#e74c3c' : '#2ecc71' }]}>
                {resourceMetrics.thermal.state}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Storage</Text>
              <Text style={styles.metricValue}>
                {Math.round(resourceMetrics.storage.available / 1000)}GB
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#3498db' }]}
              onPress={() => handleForcePowerState('optimal')}
            >
              <Text style={styles.actionButtonText}>Optimal Mode</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#f39c12' }]}
              onPress={() => handleForcePowerState('battery_saver')}
            >
              <Text style={styles.actionButtonText}>Battery Saver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderAnalyticsTab = () => {
    return (
      <ScrollView style={styles.tabContent}>
        {/* Battery Usage Chart */}
        {chartData && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>24-Hour Battery Usage</Text>
            <View style={[styles.chart, { backgroundColor: '#f8f9fa', padding: 20, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#7f8c8d', fontSize: 16 }}>Chart visualization would appear here</Text>
              <Text style={{ color: '#7f8c8d', fontSize: 14, marginTop: 8 }}>Install react-native-chart-kit for full charts</Text>
            </View>
          </View>
        )}

        {/* Performance Chart */}
        {performanceData && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>System Performance</Text>
            <View style={[styles.chart, { backgroundColor: '#f8f9fa', padding: 20 }]}>
              <View style={styles.performanceBarChart}>
                <View style={styles.performanceBar}>
                  <Text style={styles.performanceLabel}>CPU: {performanceData.cpu.toFixed(1)}%</Text>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${performanceData.cpu}%`, backgroundColor: performanceData.cpu > 80 ? '#e74c3c' : '#3498db' }]} />
                  </View>
                </View>
                <View style={styles.performanceBar}>
                  <Text style={styles.performanceLabel}>Memory: {performanceData.memory.toFixed(1)}%</Text>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${performanceData.memory}%`, backgroundColor: performanceData.memory > 80 ? '#e74c3c' : '#3498db' }]} />
                  </View>
                </View>
                <View style={styles.performanceBar}>
                  <Text style={styles.performanceLabel}>Storage: {performanceData.storage.toFixed(1)}%</Text>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${performanceData.storage}%`, backgroundColor: performanceData.storage > 80 ? '#e74c3c' : '#3498db' }]} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Usage Patterns */}
        {batteryPattern && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Usage Patterns</Text>
            <Text style={styles.patternText}>
              Average consumption: {(batteryPattern.averageConsumptionPerHour * 100).toFixed(1)}% per hour
            </Text>
            <Text style={styles.patternText}>
              Peak usage times: {batteryPattern.peakUsageTimes.slice(0, 3).map(p => `${p.hour}:00`).join(', ')}
            </Text>
            <Text style={styles.patternText}>
              Charging sessions today: {batteryPattern.chargingPatterns.length}
            </Text>
          </View>
        )}

        {/* Optimization Recommendations */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Optimization Recommendations</Text>
          {batteryService.generateOptimizationRecommendations().map((rec, index) => (
            <View key={index} style={styles.recommendation}>
              <Text style={[styles.recommendationTitle, { color: rec.priority === 'high' ? '#e74c3c' : rec.priority === 'medium' ? '#f39c12' : '#2ecc71' }]}>
                {rec.title}
              </Text>
              <Text style={styles.recommendationDescription}>{rec.description}</Text>
              <Text style={styles.recommendationSavings}>Estimated savings: {rec.estimatedSavings}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderFeaturesTab = () => {
    const currentProfile = powerManager.getCurrentProfile();

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Feature Status</Text>
          <Text style={styles.cardSubtitle}>Current features and their optimization levels</Text>

          {Object.entries(currentProfile.features).map(([feature, state]) => (
            <View key={feature} style={styles.featureRow}>
              <View style={styles.featureInfo}>
                <Text style={styles.featureName}>{feature.replace(/([A-Z])/g, ' $1').toLowerCase()}</Text>
                <Text style={[styles.featureState, { color: getFeatureStateColor(state) }]}>
                  {state.replace('_', ' ')}
                </Text>
              </View>
              <View style={[styles.featureIndicator, { backgroundColor: getFeatureStateColor(state) }]} />
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>System Limits</Text>
          <View style={styles.limitsGrid}>
            <View style={styles.limitItem}>
              <Text style={styles.limitLabel}>Max Concurrent Tasks</Text>
              <Text style={styles.limitValue}>{currentProfile.limits.maxConcurrentTasks}</Text>
            </View>
            <View style={styles.limitItem}>
              <Text style={styles.limitLabel}>Sync Interval</Text>
              <Text style={styles.limitValue}>{Math.round(currentProfile.limits.syncIntervalMs / 60000)}min</Text>
            </View>
            <View style={styles.limitItem}>
              <Text style={styles.limitLabel}>Cache Size</Text>
              <Text style={styles.limitValue}>{currentProfile.limits.cacheSize}MB</Text>
            </View>
            <View style={styles.limitItem}>
              <Text style={styles.limitLabel}>Image Quality</Text>
              <Text style={styles.limitValue}>{Math.round(currentProfile.limits.imageCompressionQuality * 100)}%</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const getFeatureStateColor = (state: FeatureState): string => {
    switch (state) {
      case 'enabled': return '#2ecc71';
      case 'reduced': return '#f39c12';
      case 'minimal': return '#e67e22';
      case 'disabled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const renderSettingsTab = () => {
    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Power Management Settings</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Auto Power Management</Text>
            <Switch value={true} onValueChange={() => {}} />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Aggressive Battery Saving</Text>
            <Switch value={false} onValueChange={() => {}} />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Thermal Throttling</Text>
            <Switch value={true} onValueChange={() => {}} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Manual Power Modes</Text>
          <Text style={styles.cardSubtitle}>Override automatic power management</Text>

          <View style={styles.powerModeButtons}>
            {(['optimal', 'balanced', 'battery_saver', 'critical'] as PowerState[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.powerModeButton,
                  { backgroundColor: getPowerStateColor(mode) },
                  powerState === mode && styles.activePowerModeButton
                ]}
                onPress={() => handleForcePowerState(mode)}
              >
                <Text style={styles.powerModeButtonText}>
                  {mode.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Power Management</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'analytics', label: 'Analytics' },
          { key: 'features', label: 'Features' },
          { key: 'settings', label: 'Settings' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'analytics' && renderAnalyticsTab()}
      {activeTab === 'features' && renderFeaturesTab()}
      {activeTab === 'settings' && renderSettingsTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  tabText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3498db',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  batteryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  batteryPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  batteryDetails: {
    flex: 1,
  },
  batteryStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  batteryTemp: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  batteryHealth: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  powerStateContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  powerStateIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  powerStateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  powerStateSavings: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  powerStateDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metric: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  metricLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  patternText: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 8,
  },
  recommendation: {
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    paddingLeft: 12,
    marginBottom: 16,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  recommendationSavings: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '500',
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    color: '#2c3e50',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  featureState: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  featureIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  limitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  limitItem: {
    width: '48%',
    marginBottom: 16,
  },
  limitLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  limitValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  settingLabel: {
    fontSize: 16,
    color: '#2c3e50',
  },
  powerModeButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  powerModeButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  activePowerModeButton: {
    borderWidth: 2,
    borderColor: '#2c3e50',
  },
  powerModeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  performanceBarChart: {
    gap: 16,
  },
  performanceBar: {
    marginBottom: 12,
  },
  performanceLabel: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
});

export default PowerManagementDashboard;